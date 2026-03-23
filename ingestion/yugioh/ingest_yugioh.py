import requests
import psycopg2
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

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
            VALUES ('Yu-Gi-Oh! Trading Card Game', 'yugioh', 'The Yu-Gi-Oh! Trading Card Game by Konami')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM games WHERE slug = 'yugioh'")
            return cur.fetchone()[0]

def fetch_all_sets():
    print("Fetching Yu-Gi-Oh sets...")
    response = requests.get("https://db.ygoprodeck.com/api/v7/cardsets.php")
    response.raise_for_status()
    return {s["set_code"]: s for s in response.json()}

def fetch_all_cards():
    print("Fetching all Yu-Gi-Oh cards...")
    response = requests.get("https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes")
    response.raise_for_status()
    data = response.json()
    return data["data"]

def upsert_set(conn, game_id, set_name, set_code, set_date=None, set_image=None):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, release_date, icon_url)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET release_date = EXCLUDED.release_date,
                    icon_url = EXCLUDED.icon_url
            RETURNING id;
        """, (game_id, set_name, set_code, set_date, set_image))
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (set_code, game_id))
            row = cur.fetchone()
            return row[0] if row else None

def upsert_card_and_printings(conn, game_id, card, sets_data):
    with conn.cursor() as cur:
        attributes = {
            "type": card.get("type"),
            "frameType": card.get("frameType"),
            "race": card.get("race"),
            "archetype": card.get("archetype"),
            "atk": card.get("atk"),
            "def": card.get("def"),
            "level": card.get("level"),
            "attribute": card.get("attribute"),
            "scale": card.get("scale"),
            "linkval": card.get("linkval"),
            "banlist_info": card.get("banlist_info"),
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
            card["name"],
            card.get("desc"),
            card.get("humanReadableCardType"),
            json.dumps(attributes),
            str(card.get("id"))
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                       (str(card.get("id")), game_id))
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        # Get primary image
        image_url = None
        if card.get("card_images"):
            image_url = card["card_images"][0].get("image_url_small")

        # Insert one printing per set the card appears in
        for card_set in card.get("card_sets", []):
            # Extract set code prefix e.g. "JUSH" from "JUSH-EN040"
            code_prefix = card_set["set_code"].split("-")[0] if "-" in card_set["set_code"] else card_set["set_code"]

            # Look up set info for date and image
            set_info = sets_data.get(code_prefix, {})

            set_id = upsert_set(
                conn, game_id,
                card_set["set_name"],
                code_prefix,
                set_info.get("tcg_date"),
                set_info.get("set_image")
            )
            if not set_id:
                continue

            cur.execute("""
                INSERT INTO printings (card_id, set_id, collector_number, rarity, image_url)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                    SET image_url = EXCLUDED.image_url
                WHERE printings.image_url IS NULL;
            """, (
                card_id,
                set_id,
                card_set.get("set_code"),
                card_set.get("set_rarity"),
                image_url
            ))

def main():
    print("Starting Yu-Gi-Oh ingestion...")
    conn = get_db_connection()

    try:
        game_id = upsert_game(conn)
        print(f"Game ID for Yu-Gi-Oh: {game_id}")

        sets_data = fetch_all_sets()
        print(f"Found {len(sets_data)} sets")

        cards = fetch_all_cards()
        print(f"Found {len(cards)} cards to process")

        for i, card in enumerate(cards):
            upsert_card_and_printings(conn, game_id, card, sets_data)

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

    print("Yu-Gi-Oh ingestion complete!")

if __name__ == "__main__":
    main()