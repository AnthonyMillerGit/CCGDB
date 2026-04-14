import requests
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import upsert_game, ingestion_db

CARDS_URL = "https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/main/json/english/card.json"
SETS_URL = "https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/main/json/english/set.json"

def fetch_sets():
    print("Fetching FAB sets...")
    response = requests.get(SETS_URL)
    response.raise_for_status()
    sets = response.json()
    # Build a lookup by set id code
    set_lookup = {}
    for s in sets:
        release_date = None
        if s.get("printings"):
            raw = s["printings"][0].get("initial_release_date")
            if raw:
                release_date = raw[:10]  # trim to YYYY-MM-DD
        set_lookup[s["id"]] = {
            "name": s["name"],
            "code": s["id"],
            "release_date": release_date
        }
    return set_lookup

def fetch_cards():
    print("Fetching FAB cards...")
    response = requests.get(CARDS_URL)
    response.raise_for_status()
    return response.json()

def upsert_set(conn, game_id, set_info, set_cache):
    code = set_info["code"]
    if code in set_cache:
        return set_cache[code]

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, release_date)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET name = EXCLUDED.name,
                    release_date = EXCLUDED.release_date
            RETURNING id;
        """, (game_id, set_info["name"], code, set_info["release_date"]))
        result = cur.fetchone()
        if result:
            set_id = result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (code, game_id))
            row = cur.fetchone()
            set_id = row[0] if row else None

    set_cache[code] = set_id
    return set_id

def upsert_card(conn, game_id, card, sets_data, set_cache):
    with conn.cursor() as cur:
        attributes = {
            "color": card.get("color"),
            "pitch": card.get("pitch"),
            "cost": card.get("cost"),
            "power": card.get("power"),
            "defense": card.get("defense"),
            "health": card.get("health"),
            "intelligence": card.get("intelligence"),
            "types": card.get("types"),
            "traits": card.get("traits"),
            "keywords": card.get("card_keywords"),
            "blitz_legal": card.get("blitz_legal"),
            "cc_legal": card.get("cc_legal"),
            "commoner_legal": card.get("commoner_legal"),
        }

        # Include pitch in name for clarity
        full_name = card["name"]
        if card.get("pitch"):
            full_name = f"{card['name']} (Pitch {card['pitch']})"

        cur.execute("""
            INSERT INTO cards (game_id, name, rules_text, card_type, attributes, external_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (game_id, external_id) DO UPDATE
                SET attributes = EXCLUDED.attributes,
                    rules_text = EXCLUDED.rules_text,
                    card_type = EXCLUDED.card_type
            RETURNING id;
        """, (
            game_id,
            full_name,
            card.get("functional_text_plain"),
            card.get("type_text"),
            json.dumps(attributes),
            card["unique_id"]
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                       (card["unique_id"], game_id))
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        # Insert one printing per set printing
        for printing in card.get("printings", []):
            set_code = printing.get("set_id")
            if not set_code:
                continue

            set_info = sets_data.get(set_code)
            if not set_info:
                set_info = {"name": set_code, "code": set_code, "release_date": None}

            db_set_id = upsert_set(conn, game_id, set_info, set_cache)
            if not db_set_id:
                continue

            printing_id = printing.get("id", "")
            image_url = printing.get("image_url")
            artist = ", ".join(printing.get("artists", [])) if printing.get("artists") else None
            flavor_text = printing.get("flavor_text") or None

            cur.execute("""
                INSERT INTO printings (card_id, set_id, rarity, image_url, flavor_text, collector_number, artist)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                    SET image_url = EXCLUDED.image_url;
            """, (
                card_id,
                db_set_id,
                printing.get("rarity"),
                image_url,
                flavor_text,
                printing_id,
                artist
            ))

def main():
    print("Starting Flesh and Blood TCG ingestion...")
    with ingestion_db() as conn:
        game_id = upsert_game(conn, 'Flesh and Blood TCG', 'fab',
                              'Flesh and Blood Trading Card Game by Legend Story Studios')
        print(f"Game ID for FAB: {game_id}")

        sets_data = fetch_sets()
        print(f"Found {len(sets_data)} sets")

        cards = fetch_cards()
        print(f"Found {len(cards)} cards to process")

        set_cache = {}
        for i, card in enumerate(cards):
            upsert_card(conn, game_id, card, sets_data, set_cache)

            if (i + 1) % 500 == 0:
                conn.commit()
                print(f"  [{i+1}/{len(cards)}] cards processed...")

        conn.commit()

    print("Flesh and Blood ingestion complete!")

if __name__ == "__main__":
    main()