import requests
import psycopg2
import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

BASE_URL = "https://api.gatcg.com"

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

def upsert_game(conn):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO games (name, slug, description)
            VALUES ('Grand Archive TCG', 'grand-archive',
                    'Grand Archive Trading Card Game by Cool Stuff Inc.')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM games WHERE slug = 'grand-archive'")
        return cur.fetchone()[0]

def fetch_all_sets():
    print("Fetching Grand Archive sets...")
    response = requests.get(f"{BASE_URL}/featured-sets")
    response.raise_for_status()
    featured = response.json()
    sets = {}
    for group in featured:
        for s in group.get("sets", []):
            if s.get("language") == "EN":
                sets[s["prefix"]] = {
                    "id": s["id"],
                    "name": s["name"],
                    "code": s["prefix"],
                    "release_date": s.get("release_date", "")[:10] if s.get("release_date") else None
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

def upsert_card(conn, game_id, card, sets_data, set_cache):
    with conn.cursor() as cur:
        attributes = {
            "classes": card.get("classes"),
            "elements": card.get("elements"),
            "cost": card.get("cost"),
            "level": card.get("level"),
            "life": card.get("life"),
            "durability": card.get("durability"),
            "speed": card.get("speed"),
            "types": card.get("types"),
            "subtypes": card.get("subtypes"),
        }

        external_id = card.get("slug") or card.get("uuid")
        name = card.get("name", "Unknown")
        rules_text = card.get("effect_text") or card.get("effect")
        card_type = ", ".join(card.get("types", [])) if card.get("types") else None

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
            game_id,
            name,
            rules_text,
            card_type,
            json.dumps(attributes),
            str(external_id)
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

        # Process each edition as a printing
        for edition in card.get("editions", []):
            # Find the set by matching prefix from collector_number
            collector_number = edition.get("collector_number", "")
            slug = edition.get("slug", "")

            # Try to match set from the slug prefix
            set_id = None
            for prefix, set_info in sets_data.items():
                if slug.startswith(prefix.lower().replace(" ", "-")):
                    set_id = upsert_set(conn, game_id, set_info, set_cache)
                    break

            # Fall back to first available set
            if not set_id and sets_data:
                first_set = next(iter(sets_data.values()))
                set_id = upsert_set(conn, game_id, first_set, set_cache)

            if not set_id:
                continue

            image_path = edition.get("image", "")
            image_url = f"{BASE_URL}{image_path}" if image_path else None

            rarity_map = {
                0: "Common", 1: "Uncommon", 2: "Rare", 3: "Super Rare",
                4: "Ultra Rare", 5: "Collector Rare", 6: "Promo",
                7: "Legendary", 8: "Champion", 9: "Special"
            }
            rarity_id = edition.get("rarity")
            rarity = rarity_map.get(rarity_id, str(rarity_id)) if rarity_id is not None else None

            edition_slug = edition.get("slug", "")

            cur.execute("""
                INSERT INTO printings (card_id, set_id, rarity, image_url,
                                       flavor_text, collector_number, artist)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                    SET image_url = EXCLUDED.image_url,
                        rarity = EXCLUDED.rarity;
            """, (
                card_id,
                set_id,
                rarity,
                image_url,
                edition.get("flavor"),
                edition_slug,
                edition.get("illustrator")
            ))

def main():
    print("Starting Grand Archive TCG ingestion...")
    conn = get_db_connection()

    try:
        game_id = upsert_game(conn)
        print(f"Game ID: {game_id}")

        sets_data = fetch_all_sets()
        print(f"Found {len(sets_data)} sets")

        set_cache = {}
        page = 1
        total_cards = 0

        while True:
            print(f"Fetching page {page}...")
            response = requests.get(
                f"{BASE_URL}/cards/search",
                params={"page": page, "results_per_page": 30},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            cards = data.get("data", [])

            if not cards:
                break

            for card in cards:
                upsert_card(conn, game_id, card, sets_data, set_cache)

            total_cards += len(cards)
            conn.commit()
            print(f"  Page {page}/{data.get('total_pages', '?')} — {total_cards} cards processed")

            if page >= data.get("total_pages", 1):
                break

            page += 1
            time.sleep(0.3)

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()

    print(f"\nGrand Archive ingestion complete! {total_cards} cards")

if __name__ == "__main__":
    main()