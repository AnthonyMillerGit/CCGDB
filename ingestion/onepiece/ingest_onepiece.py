import requests
import json
import time
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import upsert_game, ingestion_db

def fetch_all_sets():
    print("Fetching One Piece sets...")
    response = requests.get("https://optcgapi.com/api/allSets/")
    response.raise_for_status()
    return {s["set_id"]: s for s in response.json()}

def fetch_all_cards():
    print("Fetching all One Piece set cards...")
    all_cards = []

    # Set cards
    response = requests.get("https://optcgapi.com/api/allSetCards/")
    response.raise_for_status()
    all_cards.extend(response.json())
    print(f"  Got {len(all_cards)} set cards")

    # Starter deck cards
    time.sleep(0.5)
    response = requests.get("https://optcgapi.com/api/allSTCards/")
    response.raise_for_status()
    all_cards.extend(response.json())
    print(f"  Got {len(all_cards)} total after starter decks")

    # Promo cards
    time.sleep(0.5)
    try:
        response = requests.get("https://optcgapi.com/api/allPromoCards/")
        if response.status_code == 200:
            all_cards.extend(response.json())
            print(f"  Got {len(all_cards)} total after promos")
        else:
            print(f"  Promo endpoint not available, skipping")
    except Exception as e:
        print(f"  Promo endpoint skipped: {e}")

    return all_cards

def upsert_set(conn, game_id, set_id, set_name):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code)
            VALUES (%s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET name = EXCLUDED.name
            RETURNING id;
        """, (game_id, set_name, set_id))
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (set_id, game_id))
            row = cur.fetchone()
            return row[0] if row else None

def upsert_card(conn, game_id, card, set_cache):
    with conn.cursor() as cur:
        attributes = {
            "color": card.get("card_color"),
            "life": card.get("life"),
            "cost": card.get("card_cost"),
            "power": card.get("card_power"),
            "counter": card.get("counter_amount"),
            "attribute": card.get("attribute"),
            "sub_types": card.get("sub_types"),
        }

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
            card["card_name"],
            card.get("card_text"),
            card.get("card_type"),
            json.dumps(attributes),
            card["card_set_id"]
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                       (card["card_set_id"], game_id))
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        # Upsert set
        set_id = card.get("set_id", "UNKNOWN")
        set_name = card.get("set_name", set_id)
        if set_id not in set_cache:
            set_cache[set_id] = upsert_set(conn, game_id, set_id, set_name)
        db_set_id = set_cache[set_id]
        if not db_set_id:
            return

        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, (
            card_id,
            db_set_id,
            card.get("rarity"),
            card.get("card_image")
        ))

def main():
    print("Starting One Piece Card Game ingestion...")
    with ingestion_db() as conn:
        game_id = upsert_game(conn, 'One Piece Card Game', 'onepiece', 'One Piece Card Game by Bandai')
        print(f"Game ID for One Piece: {game_id}")

        cards = fetch_all_cards()
        print(f"Found {len(cards)} total cards to process")

        set_cache = {}
        for i, card in enumerate(cards):
            upsert_card(conn, game_id, card, set_cache)

            if (i + 1) % 500 == 0:
                conn.commit()
                print(f"  [{i+1}/{len(cards)}] cards processed...")

        conn.commit()

    print("One Piece ingestion complete!")

if __name__ == "__main__":
    main()