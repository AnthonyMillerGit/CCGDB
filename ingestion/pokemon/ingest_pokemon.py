import requests
import psycopg2
import json
import os
import time
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
            VALUES ('Pokemon Trading Card Game', 'pokemon', 'The Pokemon Trading Card Game by Nintendo/Game Freak')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM games WHERE slug = 'pokemon'")
            return cur.fetchone()[0]

def fetch_sets():
    print("Fetching Pokemon sets...")
    all_sets = []
    page = 1
    while True:
        response = requests.get(f"https://api.pokemontcg.io/v2/sets?page={page}&pageSize=250")
        response.raise_for_status()
        data = response.json()
        all_sets.extend(data["data"])
        if len(all_sets) >= data["totalCount"]:
            break
        page += 1
    return all_sets

def upsert_set(conn, game_id, poke_set):
    # Fix date format from 1999/01/09 to 1999-01-09
    release_date = poke_set.get("releaseDate", "").replace("/", "-") or None
    # Prefer symbol image, fall back to logo
    icon_url = poke_set.get("images", {}).get("symbol") or poke_set.get("images", {}).get("logo")

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, release_date, total_cards, icon_url)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET icon_url = EXCLUDED.icon_url
            RETURNING id;
        """, (
            game_id,
            poke_set["name"],
            poke_set["id"],
            release_date,
            poke_set.get("total", 0),
            icon_url
        ))
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (poke_set["id"], game_id))
            row = cur.fetchone()
            return row[0] if row else None

def fetch_cards_for_set(set_id):
    cards = []
    page = 1
    while True:
        url = f"https://api.pokemontcg.io/v2/cards?q=set.id:{set_id}&page={page}&pageSize=250"
        response = requests.get(url)
        if response.status_code == 404:
            return []
        response.raise_for_status()
        data = response.json()
        cards.extend(data["data"])
        if len(cards) >= data["totalCount"]:
            break
        page += 1
    return cards

def upsert_card_and_printing(conn, game_id, set_id, card):
    with conn.cursor() as cur:
        # Build Pokemon-specific attributes for JSONB
        attributes = {
            "hp": card.get("hp"),
            "types": card.get("types"),
            "subtypes": card.get("subtypes"),
            "evolvesFrom": card.get("evolvesFrom"),
            "abilities": card.get("abilities"),
            "attacks": card.get("attacks"),
            "weaknesses": card.get("weaknesses"),
            "retreatCost": card.get("retreatCost"),
            "convertedRetreatCost": card.get("convertedRetreatCost"),
            "level": card.get("level"),
            "nationalPokedexNumbers": card.get("nationalPokedexNumbers"),
        }

        # Insert card
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
            "\n".join(card.get("rules", []) or []) or None,
            card.get("supertype"),
            json.dumps(attributes),
            card.get("id")
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                    (card.get("id"), game_id))
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        # Get image url
        image_url = None
        if "images" in card:
            image_url = card["images"].get("small")

        # Insert printing
        cur.execute("""
            INSERT INTO printings (card_id, set_id, collector_number, rarity, image_url, artist, flavor_text)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, (
            card_id,
            set_id,
            card.get("number"),
            card.get("rarity"),
            image_url,
            card.get("artist"),
            card.get("flavorText")
        ))

def main():
    print("Starting Pokemon TCG ingestion...")
    conn = get_db_connection()

    try:
        game_id = upsert_game(conn)
        print(f"Game ID for Pokemon: {game_id}")

        sets = fetch_sets()
        print(f"Found {len(sets)} sets to process")

        for i, poke_set in enumerate(sets):
            set_id = upsert_set(conn, game_id, poke_set)
            if not set_id:
                continue

            print(f"[{i+1}/{len(sets)}] Processing set: {poke_set['name']}")
            cards = fetch_cards_for_set(poke_set["id"])

            for card in cards:
                upsert_card_and_printing(conn, game_id, set_id, card)

            conn.commit()
            print(f"  -> {len(cards)} cards committed")

            # Be polite to the API
            time.sleep(0.1)

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()

    print("Pokemon ingestion complete!")

if __name__ == "__main__":
    main()