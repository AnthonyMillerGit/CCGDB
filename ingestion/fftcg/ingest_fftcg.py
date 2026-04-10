import requests
import psycopg2
import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

API_URL = "https://fftcg.square-enix-games.com/en/get-cards"
PAYLOAD = {
    "language": "en",
    "text": "",
    "type": [],
    "element": [],
    "cost": [],
    "rarity": [],
    "power": [],
    "category_1": [],
    "set": [],
    "multicard": "",
    "ex_burst": "",
    "code": "",
    "special": "",
    "exactmatch": 0
}

ELEMENT_MAP = {
    "火": "Fire",
    "氷": "Ice",
    "風": "Wind",
    "土": "Earth",
    "雷": "Lightning",
    "水": "Water",
    "光": "Light",
    "闇": "Dark",
}

RARITY_MAP = {
    "C": "Common",
    "R": "Rare",
    "H": "Hero",
    "L": "Legend",
    "S": "Starter",
    "B": "Boss",
    "P": "Promo",
}

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
            VALUES ('Final Fantasy TCG', 'fftcg',
                    'Final Fantasy Trading Card Game by Square Enix')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM games WHERE slug = 'fftcg'")
        return cur.fetchone()[0]

def upsert_set(conn, game_id, set_name, set_cache):
    if set_name in set_cache:
        return set_cache[set_name]

    with conn.cursor() as cur:
        code = set_name.lower().replace(" ", "-").replace(":", "")
        cur.execute("""
            INSERT INTO sets (game_id, name, code)
            VALUES (%s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET name = EXCLUDED.name
            RETURNING id;
        """, (game_id, set_name, code))
        result = cur.fetchone()
        if result:
            set_id = result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (code, game_id))
            row = cur.fetchone()
            set_id = row[0] if row else None

    set_cache[set_name] = set_id
    return set_id

def upsert_card(conn, game_id, card, set_id):
    with conn.cursor() as cur:
        elements = [ELEMENT_MAP.get(e, e) for e in (card.get("element") or [])]
        rarity_code = card.get("rarity", "")
        rarity = RARITY_MAP.get(rarity_code, rarity_code)

        attributes = {
            "code": card.get("code"),
            "element": elements,
            "cost": card.get("cost"),
            "power": card.get("power"),
            "job": card.get("job_en"),
            "category_1": card.get("category_1"),
            "category_2": card.get("category_2"),
            "multicard": card.get("multicard") == "1",
            "ex_burst": card.get("ex_burst") == "1",
        }

        external_id = card.get("code")
        name = card.get("name_en", "Unknown")
        card_type = card.get("type_en")
        rules_text = card.get("text_en")

        # Get image URL
        image_url = None
        images = card.get("images", {})
        if images.get("full"):
            image_url = images["full"][0]
        elif images.get("thumbs"):
            image_url = images["thumbs"][0]

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
            external_id
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                       (external_id, game_id))
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url, collector_number)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                SET image_url = EXCLUDED.image_url,
                    rarity = EXCLUDED.rarity;
        """, (
            card_id,
            set_id,
            rarity,
            image_url,
            external_id
        ))

def main():
    print("Starting Final Fantasy TCG ingestion...")
    conn = get_db_connection()

    try:
        game_id = upsert_game(conn)
        print(f"Game ID: {game_id}")

        print("Fetching all cards from Square Enix API...")
        response = requests.post(API_URL, json=PAYLOAD, timeout=60)
        response.raise_for_status()
        data = response.json()
        cards = data.get("cards", [])
        print(f"Found {len(cards)} cards")

        set_cache = {}
        for i, card in enumerate(cards):
            # Each card can belong to multiple sets
            sets = card.get("set", [])
            if not sets:
                sets = ["Unknown"]

            for set_name in sets:
                set_id = upsert_set(conn, game_id, set_name, set_cache)
                if set_id:
                    upsert_card(conn, game_id, card, set_id)

            if (i + 1) % 500 == 0:
                conn.commit()
                print(f"  [{i+1}/{len(cards)}] cards processed...")

        conn.commit()

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()

    print("Final Fantasy TCG ingestion complete!")

if __name__ == "__main__":
    main()