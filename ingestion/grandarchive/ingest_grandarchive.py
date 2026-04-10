import requests
import psycopg2
import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

BASE_URL = "https://api.gatcg.com"

RARITY_MAP = {
    0: "Common", 1: "Uncommon", 2: "Rare", 3: "Super Rare",
    4: "Ultra Rare", 5: "Collector Rare", 6: "Promo",
    7: "Legendary", 8: "Champion", 9: "Special"
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
    sets = []
    for group in featured:
        for s in group.get("sets", []):
            if s.get("language") == "EN":
                sets.append({
                    "name": s["name"],
                    "code": s["prefix"],
                    "release_date": s.get("release_date", "")[:10] if s.get("release_date") else None
                })
    return sets

def upsert_set(conn, game_id, set_data):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, release_date)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET name = EXCLUDED.name,
                    release_date = EXCLUDED.release_date
            RETURNING id;
        """, (game_id, set_data["name"], set_data["code"], set_data["release_date"]))
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                   (set_data["code"], game_id))
        row = cur.fetchone()
        return row[0] if row else None

def upsert_card(conn, game_id, set_id, card, prefix):
    # Explicit prefix-to-slug-segment mapping for inconsistent cases
    PREFIX_SLUG_MAP = {
        "DOA 1st": ("doa1e", "contains"),
        "ALC 1st": ("alc1e", "contains"),
        "FTC 1st": ("ftc1e", "contains"),
        "MRC 1st": ("mrc-csr", "contains"),
        "AMB 1st": ("amb-csr", "contains"),
        "HVN 1st": ("hvn1e", "contains"),
        "DTR 1st": ("dtr1e", "contains"),
        "PTM 1st": ("ptm1e", "contains"),
        "RDO 1st": ("rdo1e", "contains"),
    }

    prefix_lower = prefix.lower()

    if prefix in PREFIX_SLUG_MAP:
        slug_segment, match_type = PREFIX_SLUG_MAP[prefix]
    elif " alter" in prefix_lower:
        base = prefix_lower.replace(" alter", "")
        slug_segment = f"{base}-alter"
        match_type = "endswith"
    elif "1st" in prefix_lower:
        base = prefix_lower.replace(" 1st", "")
        slug_segment = f"{base}1e"
        match_type = "contains"
    else:
        slug_segment = prefix_lower.replace(" ", "")
        match_type = "endswith"

    matching_edition = None
    for edition in card.get("editions", []):
        slug = edition.get("slug", "")
        if match_type == "contains":
            if f"-{slug_segment}" in slug:
                matching_edition = edition
                break
        else:
            if slug.endswith(f"-{slug_segment}"):
                matching_edition = edition
                break

    if not matching_edition:
        return

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
            game_id, name, rules_text, card_type,
            json.dumps(attributes), str(external_id)
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

        image_path = matching_edition.get("image", "")
        image_url = f"{BASE_URL}{image_path}" if image_path else None
        rarity_id = matching_edition.get("rarity")
        rarity = RARITY_MAP.get(rarity_id, str(rarity_id)) if rarity_id is not None else None
        edition_slug = matching_edition.get("slug", "")

        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url,
                                   flavor_text, collector_number, artist)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                SET image_url = EXCLUDED.image_url,
                    rarity = EXCLUDED.rarity;
        """, (
            card_id, set_id, rarity, image_url,
            matching_edition.get("flavor"),
            edition_slug,
            matching_edition.get("illustrator")
        ))

def fetch_cards_for_prefix(prefix):
    all_cards = []
    page = 1
    while True:
        response = requests.get(
            f"{BASE_URL}/cards/search",
            params={"page": page, "results_per_page": 30, "prefix": prefix},
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        cards = data.get("data", [])
        if not cards:
            break
        all_cards.extend(cards)
        total_pages = data.get("total_pages", 1)
        if page >= total_pages:
            break
        page += 1
        time.sleep(0.2)
    return all_cards

def main():
    print("Starting Grand Archive TCG ingestion...")
    conn = get_db_connection()

    try:
        game_id = upsert_game(conn)
        print(f"Game ID: {game_id}")

        all_sets = fetch_all_sets()
        print(f"Found {len(all_sets)} sets")

        total_cards = 0
        for i, set_data in enumerate(all_sets):
            prefix = set_data["code"]
            print(f"\n[{i+1}/{len(all_sets)}] {set_data['name']} ({prefix})")

            set_id = upsert_set(conn, game_id, set_data)
            if not set_id:
                print(f"  Skipping — could not create set")
                continue

            cards = fetch_cards_for_prefix(prefix)
            print(f"  Fetched {len(cards)} cards")

            for card in cards:
                upsert_card(conn, game_id, set_id, card, prefix)

            total_cards += len(cards)
            conn.commit()
            print(f"  Done — {len(cards)} cards committed")
            time.sleep(0.5)

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()

    print(f"\nGrand Archive ingestion complete! {total_cards} total card-set entries")

if __name__ == "__main__":
    main()