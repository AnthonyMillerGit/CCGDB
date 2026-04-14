import requests
import json
import time
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import upsert_game, ingestion_db

BASE_URL = "https://api.lorcast.com/v0"

def fetch_sets():
    print("Fetching Lorcana sets...")
    response = requests.get(f"{BASE_URL}/sets")
    response.raise_for_status()
    return response.json()["results"]

def fetch_cards_for_set(set_code):
    response = requests.get(f"{BASE_URL}/sets/{set_code}/cards")
    response.raise_for_status()
    return response.json()

def upsert_set(conn, game_id, lorcana_set):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, release_date)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET name = EXCLUDED.name,
                    release_date = EXCLUDED.release_date
            RETURNING id;
        """, (
            game_id,
            lorcana_set["name"],
            lorcana_set["code"],
            lorcana_set.get("released_at")
        ))
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (lorcana_set["code"], game_id))
            row = cur.fetchone()
            return row[0] if row else None

def upsert_card(conn, game_id, set_id, card):
    with conn.cursor() as cur:
        attributes = {
            "ink": card.get("ink"),
            "inks": card.get("inks"),
            "inkwell": card.get("inkwell"),
            "cost": card.get("cost"),
            "strength": card.get("strength"),
            "willpower": card.get("willpower"),
            "lore": card.get("lore"),
            "move_cost": card.get("move_cost"),
            "classifications": card.get("classifications"),
            "keywords": card.get("keywords"),
            "legalities": card.get("legalities"),
        }

        # Combine name and version for full card name
        full_name = card["name"]
        if card.get("version"):
            full_name = f"{card['name']} - {card['version']}"

        card_type = ", ".join(card.get("type", [])) if card.get("type") else None

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
            card.get("text"),
            card_type,
            json.dumps(attributes),
            card["id"]
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                       (card["id"], game_id))
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        # Get image URL
        image_url = None
        image_uris = card.get("image_uris", {})
        if image_uris and image_uris.get("digital"):
            image_url = image_uris["digital"].get("normal")

        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url, flavor_text, collector_number, artist)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, (
            card_id,
            set_id,
            card.get("rarity"),
            image_url,
            card.get("flavor_text"),
            card.get("collector_number"),
            ", ".join(card.get("illustrators", [])) if card.get("illustrators") else None
        ))

def main():
    print("Starting Disney Lorcana TCG ingestion...")
    with ingestion_db() as conn:
        game_id = upsert_game(conn, 'Disney Lorcana TCG', 'lorcana',
                              'Disney Lorcana Trading Card Game by Ravensburger')
        print(f"Game ID for Lorcana: {game_id}")

        sets = fetch_sets()
        print(f"Found {len(sets)} sets")

        total_cards = 0
        for i, lorcana_set in enumerate(sets):
            print(f"[{i+1}/{len(sets)}] Processing: {lorcana_set['name']}")

            set_id = upsert_set(conn, game_id, lorcana_set)
            if not set_id:
                continue

            cards = fetch_cards_for_set(lorcana_set["code"])
            for card in cards:
                upsert_card(conn, game_id, set_id, card)

            total_cards += len(cards)
            conn.commit()
            print(f"  -> {len(cards)} cards committed")

            time.sleep(0.1)  # respect rate limit

    print(f"Lorcana ingestion complete! Total cards: {total_cards}")

if __name__ == "__main__":
    main()