import requests
import psycopg2
import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

BASE_URL = "https://www.apitcg.com/api"
API_KEY = os.getenv("APITCG_KEY")
HEADERS = {"x-api-key": API_KEY}

GAMES = [
    {
        "slug": "gundam",
        "name": "Gundam Card Game",
        "endpoint": "gundam",
        "description": "Gundam Card Game by Bandai"
    },
    {
        "slug": "riftbound",
        "name": "Riftbound TCG",
        "endpoint": "riftbound",
        "description": "Riftbound Trading Card Game by Riot Games"
    },
    {
        "slug": "dragon-ball-fusion",
        "name": "Dragon Ball Super Fusion World",
        "endpoint": "dragon-ball-fusion",
        "description": "Dragon Ball Super Fusion World TCG by Bandai"
    },
    {
        "slug": "union-arena",
        "name": "Union Arena TCG",
        "endpoint": "union-arena",
        "description": "Union Arena Trading Card Game by Bandai"
    },
]

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

def upsert_game(conn, game):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO games (name, slug, description)
            VALUES (%s, %s, %s)
            ON CONFLICT (slug) DO UPDATE
                SET name = EXCLUDED.name,
                    description = EXCLUDED.description
            RETURNING id;
        """, (game["name"], game["slug"], game["description"]))
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM games WHERE slug = %s", (game["slug"],))
        return cur.fetchone()[0]

def upsert_set(conn, game_id, set_data, set_cache):
    set_id_key = set_data.get("id", "unknown")
    cache_key = f"{game_id}:{set_id_key}"

    if cache_key in set_cache:
        return set_cache[cache_key]

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
            set_data.get("name", set_id_key),
            set_id_key,
            set_data.get("releaseDate")
        ))
        result = cur.fetchone()
        if result:
            db_set_id = result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (set_id_key, game_id))
            row = cur.fetchone()
            db_set_id = row[0] if row else None

    set_cache[cache_key] = db_set_id
    return db_set_id

def upsert_card(conn, game_id, card, set_cache):
    with conn.cursor() as cur:
        # Build attributes from all available fields
        attributes = {k: v for k, v in card.items()
                     if k not in ("id", "code", "name", "images", "set",
                                  "effect", "rarity", "cardType", "type")}

        external_id = card.get("id") or card.get("code")
        if not external_id:
            return

        name = card.get("name", "Unknown")
        rules_text = card.get("effect") or card.get("ability") or card.get("text")
        card_type = card.get("cardType") or card.get("type")
        rarity = card.get("rarity")

        image_url = None
        images = card.get("images", {})
        if images:
            image_url = images.get("large") or images.get("small")

        # Get or create set
        set_data = card.get("set", {})
        db_set_id = upsert_set(conn, game_id, set_data, set_cache) if set_data else None

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

        if not db_set_id:
            return

        collector_number = card.get("code") or card.get("number") or str(external_id)

        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url, collector_number)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                SET image_url = EXCLUDED.image_url,
                    rarity = EXCLUDED.rarity;
        """, (card_id, db_set_id, rarity, image_url, collector_number))

def fetch_all_cards(endpoint):
    all_cards = []
    page = 1
    while True:
        response = requests.get(
            f"{BASE_URL}/{endpoint}/cards?page={page}",
            headers=HEADERS,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        cards = data.get("data", [])
        if not cards:
            break
        all_cards.extend(cards)
        total_pages = data.get("totalPages", 1)
        print(f"  Page {page}/{total_pages} — {len(all_cards)} cards so far")
        if page >= total_pages:
            break
        page += 1
        time.sleep(0.5)
    return all_cards

def main():
    print("Starting apitcg.com ingestion...")
    conn = get_db_connection()

    try:
        for game_config in GAMES:
            print(f"\n{'='*50}")
            print(f"Processing: {game_config['name']}")
            print(f"{'='*50}")

            game_id = upsert_game(conn, game_config)
            set_cache = {}

            cards = fetch_all_cards(game_config["endpoint"])
            print(f"Total cards fetched: {len(cards)}")

            for i, card in enumerate(cards):
                upsert_card(conn, game_id, card, set_cache)
                if (i + 1) % 250 == 0:
                    conn.commit()
                    print(f"  Committed {i+1}/{len(cards)} cards...")

            conn.commit()
            print(f"Done! {len(cards)} cards, {len(set_cache)} sets")
            time.sleep(1)

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()

    print("\napitcg.com ingestion complete!")

if __name__ == "__main__":
    main()