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
            VALUES ('Star Wars CCG (Decipher)', 'starwars_decipher', 'Star Wars Customizable Card Game by Decipher Inc.')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM games WHERE slug = 'starwars_decipher'")
            return cur.fetchone()[0]

def fetch_sets():
    print("Fetching Star Wars CCG sets...")
    response = requests.get("https://swccgdb.com/api/public/sets/?format=json")
    response.raise_for_status()
    return {s["code"]: s for s in response.json()}

def fetch_all_cards():
    print("Fetching all Star Wars CCG cards...")
    all_cards = []
    offset = 0
    limit = 100
    while True:
        try:
            response = requests.get(
                f"https://swccgdb.com/api/public/cards/?format=json&limit={limit}&offset={offset}"
            )
            response.raise_for_status()
            data = response.json()
            if not data:
                break
            all_cards.extend(data)
            if len(data) < limit:
                break
            offset += limit
            print(f"  Fetched {len(all_cards)} cards so far...")
        except Exception as e:
            print(f"  Stopped at offset {offset}: {e}")
            break
    return all_cards

def upsert_set(conn, game_id, set_code, sets_data):
    set_info = sets_data.get(set_code, {})
    name = set_info.get("name", set_code)
    release_date = set_info.get("available")

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, release_date)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET release_date = EXCLUDED.release_date
            RETURNING id;
        """, (game_id, name, set_code, release_date))
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (set_code, game_id))
            row = cur.fetchone()
            return row[0] if row else None

def upsert_card(conn, game_id, set_id, card, sets_data):
    with conn.cursor() as cur:
        attributes = {
            "side": card.get("side_code"),
            "type": card.get("type_code"),
            "subtype": card.get("subtype_code"),
            "destiny": card.get("destiny"),
            "power": card.get("power"),
            "ability": card.get("ability"),
            "armor": card.get("armor"),
            "hyperspeed": card.get("hyperspeed"),
            "landspeed": card.get("landspeed"),
            "maneuver": card.get("maneuver"),
            "forfeit": card.get("forfeit"),
            "deploy": card.get("deploy"),
            "defense_value": card.get("defense_value"),
            "uniqueness": card.get("uniqueness"),
            "characteristics": card.get("characteristics"),
            "episode1": card.get("episode1"),
            "episode7": card.get("episode7"),
        }

        card_type = card.get("type_name", "")
        if card.get("subtype_name"):
            card_type = f"{card_type} — {card.get('subtype_name')}"

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
            card.get("gametext"),
            card_type,
            json.dumps(attributes),
            str(card["code"])
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                       (str(card["code"]), game_id))
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url, flavor_text)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, (
            card_id,
            set_id,
            card.get("rarity_name"),
            card.get("image_url"),
            card.get("lore")
        ))

def main():
    print("Starting Star Wars CCG (Decipher) ingestion...")
    conn = get_db_connection()

    try:
        game_id = upsert_game(conn)
        print(f"Game ID for Star Wars CCG: {game_id}")

        sets_data = fetch_sets()
        print(f"Found {len(sets_data)} sets")

        cards = fetch_all_cards()
        print(f"Found {len(cards)} cards to process")

        for i, card in enumerate(cards):
            set_id = upsert_set(conn, game_id, card["set_code"], sets_data)
            if not set_id:
                continue
            upsert_card(conn, game_id, set_id, card, sets_data)

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

    print("Star Wars CCG (Decipher) ingestion complete!")

if __name__ == "__main__":
    main()