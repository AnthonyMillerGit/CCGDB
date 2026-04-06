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
            VALUES ('Digimon Card Game', 'digimon', 'Digimon Card Game by Bandai')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM games WHERE slug = 'digimon'")
            return cur.fetchone()[0]

def fetch_all_cards():
    print("Fetching all Digimon cards...")
    response = requests.get(
        "https://digimoncard.io/api-public/search?series=Digimon%20Card%20Game&sort=name&sortdirection=asc"
    )
    response.raise_for_status()
    cards = response.json()
    print(f"  Got {len(cards)} cards")
    return cards

def upsert_set(conn, game_id, set_name, set_cache):
    if set_name in set_cache:
        return set_cache[set_name]

    code = set_name.split(":")[0].strip() if ":" in set_name else set_name[:20].strip()

    with conn.cursor() as cur:
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

def upsert_card(conn, game_id, card, set_cache):
    with conn.cursor() as cur:
        attributes = {
            "color": card.get("color"),
            "color2": card.get("color2"),
            "level": card.get("level"),
            "play_cost": card.get("play_cost"),
            "evolution_cost": card.get("evolution_cost"),
            "evolution_color": card.get("evolution_color"),
            "dp": card.get("dp"),
            "attribute": card.get("attribute"),
            "form": card.get("form"),
            "digi_type": card.get("digi_type"),
            "digi_type2": card.get("digi_type2"),
            "stage": card.get("stage"),
        }

        rules_parts = []
        if card.get("main_effect"):
            rules_parts.append(card["main_effect"])
        if card.get("source_effect"):
            rules_parts.append(f"[Inherited] {card['source_effect']}")
        rules_text = "\n".join(rules_parts) or None

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
            rules_text,
            card.get("type"),
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

        set_names = card.get("set_name", [])
        if isinstance(set_names, str):
            set_names = [set_names]

        for set_name in set_names:
            if not set_name:
                continue
            db_set_id = upsert_set(conn, game_id, set_name, set_cache)
            if not db_set_id:
                continue

            image_url = f"https://world.digimoncard.com/images/cardlist/card/{card['id']}.png"

            cur.execute("""
                INSERT INTO printings (card_id, set_id, rarity, image_url)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (
                card_id,
                db_set_id,
                card.get("rarity"),
                image_url
            ))

def main():
    print("Starting Digimon Card Game ingestion...")
    conn = get_db_connection()

    try:
        game_id = upsert_game(conn)
        print(f"Game ID for Digimon: {game_id}")

        cards = fetch_all_cards()
        print(f"Found {len(cards)} total cards to process")

        set_cache = {}
        for i, card in enumerate(cards):
            upsert_card(conn, game_id, card, set_cache)

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

    print("Digimon ingestion complete!")

if __name__ == "__main__":
    main()