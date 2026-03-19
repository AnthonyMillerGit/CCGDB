import requests
import psycopg2
import json
import os
from dotenv import load_dotenv

from pathlib import Path
load_dotenv(Path(__file__).resolve().parents[2] / '.env')

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

# Step 1: Make sure MTG exists in the games table
def upsert_game(conn):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO games (name, slug, description)
            VALUES ('Magic: The Gathering', 'mtg', 'The original trading card game by Wizards of the Coast')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM games WHERE slug = 'mtg'")
            return cur.fetchone()[0]

# Step 2: Fetch all sets from Scryfall
def fetch_sets():
    print("Fetching sets from Scryfall...")
    response = requests.get("https://api.scryfall.com/sets")
    response.raise_for_status()
    return response.json()["data"]

# Step 3: Insert a set into the database
def upsert_set(conn, game_id, scryfall_set):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, release_date, total_cards)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id;
        """, (
            game_id,
            scryfall_set["name"],
            scryfall_set["code"],
            scryfall_set.get("released_at"),
            scryfall_set.get("card_count", 0)
        ))
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (scryfall_set["code"], game_id))
            row = cur.fetchone()
            return row[0] if row else None

# Step 4: Fetch cards for a specific set
def fetch_cards_for_set(set_code):
    url = f"https://api.scryfall.com/cards/search?q=set:{set_code}&unique=prints"
    cards = []
    while url:
        response = requests.get(url)
        if response.status_code == 404:
            return []
        response.raise_for_status()
        data = response.json()
        cards.extend(data["data"])
        url = data.get("next_page")
    return cards

# Step 5: Insert a card and its printing
def upsert_card_and_printing(conn, game_id, set_id, scryfall_card):
    with conn.cursor() as cur:
        # Build game-specific attributes as JSONB
        attributes = {
            "mana_cost": scryfall_card.get("mana_cost"),
            "cmc": scryfall_card.get("cmc"),
            "colors": scryfall_card.get("colors"),
            "color_identity": scryfall_card.get("color_identity"),
            "power": scryfall_card.get("power"),
            "toughness": scryfall_card.get("toughness"),
            "loyalty": scryfall_card.get("loyalty"),
            "keywords": scryfall_card.get("keywords"),
        }

        # Insert card
        cur.execute("""
            INSERT INTO cards (game_id, name, rules_text, card_type, attributes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id;
        """, (
            game_id,
            scryfall_card["name"],
            scryfall_card.get("oracle_text"),
            scryfall_card.get("type_line"),
            json.dumps(attributes)
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE name = %s AND game_id = %s",
                       (scryfall_card["name"], game_id))
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        # Insert printing
        image_url = None
        if "image_uris" in scryfall_card:
            image_url = scryfall_card["image_uris"].get("normal")

        cur.execute("""
            INSERT INTO printings (card_id, set_id, collector_number, rarity, image_url, artist, flavor_text)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, (
            card_id,
            set_id,
            scryfall_card.get("collector_number"),
            scryfall_card.get("rarity"),
            image_url,
            scryfall_card.get("artist"),
            scryfall_card.get("flavor_text")
        ))

# Main ingestion flow
def main():
    print("Starting MTG ingestion...")
    conn = get_db_connection()

    try:
        game_id = upsert_game(conn)
        print(f"Game ID for MTG: {game_id}")

        sets = fetch_sets()
        print(f"Found {len(sets)} sets to process")

        for i, scryfall_set in enumerate(sets):
            set_id = upsert_set(conn, game_id, scryfall_set)
            if not set_id:
                continue

            print(f"[{i+1}/{len(sets)}] Processing set: {scryfall_set['name']}")
            cards = fetch_cards_for_set(scryfall_set["code"])

            for card in cards:
                upsert_card_and_printing(conn, game_id, set_id, card)

            conn.commit()
            print(f"  -> {len(cards)} cards committed")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()

    print("MTG ingestion complete!")

if __name__ == "__main__":
    main()