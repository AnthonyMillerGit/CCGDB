import requests
import psycopg2
import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

BASE_URL = "https://api.swu-db.com"

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
            VALUES ('Star Wars Unlimited', 'swu', 'Star Wars Unlimited Trading Card Game by Fantasy Flight Games')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM games WHERE slug = 'swu'")
        return cur.fetchone()[0]

def fetch_sets():
    print("Fetching SWU sets...")
    response = requests.get(f"{BASE_URL}/sets")
    response.raise_for_status()
    return response.json()

def fetch_cards_for_set(set_id):
    response = requests.get(f"{BASE_URL}/cards/{set_id}")
    response.raise_for_status()
    data = response.json()
    # API returns either a list or a dict with a data key
    if isinstance(data, list):
        return data
    return data.get("data", [])

def parse_release_date(date_str):
    if not date_str:
        return None
    try:
        from datetime import datetime
        return datetime.strptime(date_str, "%m/%d/%y").strftime("%Y-%m-%d")
    except:
        return None

def upsert_set(conn, game_id, swu_set):
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
            swu_set["fullName"],
            swu_set["setId"],
            parse_release_date(swu_set.get("releaseDate"))
        ))
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                   (swu_set["setId"], game_id))
        row = cur.fetchone()
        return row[0] if row else None

def upsert_card(conn, game_id, set_id, card):
    with conn.cursor() as cur:
        attributes = {
            "aspects": card.get("Aspects"),
            "traits": card.get("Traits"),
            "arenas": card.get("Arenas"),
            "cost": card.get("Cost"),
            "power": card.get("Power"),
            "hp": card.get("HP"),
            "keywords": card.get("Keywords"),
            "unique": card.get("Unique"),
            "double_sided": card.get("DoubleSided"),
            "epic_action": card.get("EpicAction"),
            "back_text": card.get("BackText"),
            "variant_type": card.get("VariantType"),
        }

        full_name = card["Name"]
        if card.get("Subtitle"):
            full_name = f"{card['Name']} - {card['Subtitle']}"

        # Use Set + Number as external_id to handle variants
        external_id = f"{card.get('Set', '')}-{card.get('Number', '')}-{card.get('VariantType', 'Normal')}"

        rules_text = card.get("FrontText", "")
        if card.get("BackText"):
            rules_text = f"{rules_text}\n---\n{card['BackText']}"

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
            rules_text,
            card.get("Type"),
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

        image_url = card.get("FrontArt")
        back_image_url = card.get("BackArt")

        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url, back_image_url,
                                   collector_number, artist)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                SET image_url = EXCLUDED.image_url,
                    back_image_url = EXCLUDED.back_image_url,
                    rarity = EXCLUDED.rarity;
        """, (
            card_id,
            set_id,
            card.get("Rarity"),
            image_url,
            back_image_url,
            card.get("Number"),
            card.get("Artist")
        ))

def main():
    print("Starting Star Wars Unlimited ingestion...")
    conn = get_db_connection()

    try:
        game_id = upsert_game(conn)
        print(f"Game ID: {game_id}")

        sets = fetch_sets()
        print(f"Found {len(sets)} sets")

        total_cards = 0
        for i, swu_set in enumerate(sets):
            print(f"[{i+1}/{len(sets)}] {swu_set['fullName']} ({swu_set['setId']})")

            set_id = upsert_set(conn, game_id, swu_set)
            if not set_id:
                continue

            try:
                cards = fetch_cards_for_set(swu_set["setId"])
            except Exception as e:
                print(f"  Error fetching cards: {e}")
                continue

            for card in cards:
                upsert_card(conn, game_id, set_id, card)

            total_cards += len(cards)
            conn.commit()
            print(f"  -> {len(cards)} cards")
            time.sleep(0.3)

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()

    print(f"\nStar Wars Unlimited ingestion complete! Total cards: {total_cards}")

if __name__ == "__main__":
    main()