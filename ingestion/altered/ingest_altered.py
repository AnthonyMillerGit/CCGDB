import requests
import json
import time
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import upsert_game, ingestion_db

BASE_URL = "https://api.altered.gg"

def fetch_all_sets():
    print("Fetching Altered sets...")
    response = requests.get(f"{BASE_URL}/card_sets?itemsPerPage=100")
    response.raise_for_status()
    data = response.json()
    sets = {}
    for s in data.get("hydra:member", []):
        sets[s["reference"]] = {
            "name": s["name"],
            "code": s["reference"],
            "release_date": s.get("releaseDate", "")[:10] if s.get("releaseDate") else None
        }
    return sets

def upsert_set(conn, game_id, set_data, set_cache):
    code = set_data["code"]
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
        """, (game_id, set_data["name"], code, set_data["release_date"]))
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

def upsert_card(conn, game_id, set_id, card):
    with conn.cursor() as cur:
        attributes = {
            "faction": card.get("mainFaction", {}).get("name") if card.get("mainFaction") else None,
            "faction_reference": card.get("mainFaction", {}).get("reference") if card.get("mainFaction") else None,
            "elements": card.get("elements", {}),
            "card_subtypes": [s.get("name") for s in card.get("cardSubTypes", [])],
        }

        external_id = card.get("id")
        name = card.get("name", "Unknown")
        card_type = card.get("cardType", {}).get("name") if card.get("cardType") else None
        rarity = card.get("rarity", {}).get("name") if card.get("rarity") else None

        # Build rules text from elements
        elements = card.get("elements", {})
        rules_parts = []
        if elements.get("MAIN_EFFECT"):
            rules_parts.append(elements["MAIN_EFFECT"])
        if elements.get("ECHO_EFFECT"):
            rules_parts.append(f"Echo: {elements['ECHO_EFFECT']}")
        rules_text = "\n".join(rules_parts) if rules_parts else None

        # Get image URL
        image_url = card.get("imagePath")

        cur.execute("""
            INSERT INTO cards (game_id, name, rules_text, card_type, attributes, external_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (game_id, external_id) DO UPDATE
                SET name = EXCLUDED.name,
                    rules_text = EXCLUDED.rules_text,
                    card_type = EXCLUDED.card_type,
                    attributes = EXCLUDED.attributes
            RETURNING id;
        """, (
            game_id, name, rules_text, card_type,
            json.dumps(attributes), str(external_id)
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                       (str(external_id), game_id))
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        reference = card.get("reference", external_id)

        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url, collector_number)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                SET image_url = EXCLUDED.image_url,
                    rarity = EXCLUDED.rarity;
        """, (card_id, set_id, rarity, image_url, str(reference)))

def main():
    print("Starting Altered TCG ingestion...")
    with ingestion_db() as conn:
        game_id = upsert_game(conn, 'Altered TCG', 'altered', 'Altered Trading Card Game by Equinox')
        print(f"Game ID: {game_id}")

        sets_data = fetch_all_sets()
        print(f"Found {len(sets_data)} sets")

        set_cache = {}
        page = 1
        total_cards = 0

        while True:
            print(f"Fetching page {page}...")
            response = requests.get(
                f"{BASE_URL}/cards",
                params={"itemsPerPage": 100, "page": page},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            cards = data.get("hydra:member", [])

            if not cards:
                break

            for card in cards:
                # Get set from card data
                card_set = card.get("cardSet", {})
                set_ref = card_set.get("reference") if card_set else None
                set_data = sets_data.get(set_ref, {
                    "name": set_ref or "Unknown",
                    "code": set_ref or "unknown",
                    "release_date": None
                })
                set_id = upsert_set(conn, game_id, set_data, set_cache)
                if set_id:
                    upsert_card(conn, game_id, set_id, card)

            total_cards += len(cards)
            conn.commit()
            print(f"  Page {page} — {total_cards} cards processed")

            next_page = data.get("hydra:view", {}).get("hydra:next")
            if not next_page:
                break
            page += 1
            time.sleep(0.3)

    print(f"\nAltered TCG ingestion complete! {total_cards} cards")

if __name__ == "__main__":
    main()