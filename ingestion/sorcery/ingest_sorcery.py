import requests
import json
import time
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import upsert_game, ingestion_db

CARDS_URL = "https://api.sorcerytcg.com/api/cards"
IMAGE_CDN = "https://d27a44hjr9gen3.cloudfront.net/cards"


def upsert_set(conn, game_id, set_name, release_date, set_cache):
    # Use set name as code since there's no short code
    code = set_name.lower().replace(" ", "-").replace(":", "")
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
        """, (
            game_id,
            set_name,
            code,
            release_date[:10] if release_date else None
        ))
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

def upsert_card(conn, game_id, card, set_id, set_name, variant):
    with conn.cursor() as cur:
        guardian = card.get("guardian", {})
        attributes = {
            "elements": card.get("elements"),
            "subTypes": card.get("subTypes"),
            "cost": guardian.get("cost"),
            "attack": guardian.get("attack"),
            "defence": guardian.get("defence"),
            "life": guardian.get("life"),
            "thresholds": guardian.get("thresholds"),
            "finish": variant.get("finish"),
            "product": variant.get("product"),
        }

        rules_text = guardian.get("rulesText")
        card_type = guardian.get("type")
        rarity = guardian.get("rarity")
        external_id = variant["slug"]
        image_url = f"{IMAGE_CDN}/{variant['slug']}.png"

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
            card["name"],
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
            INSERT INTO printings (card_id, set_id, rarity, image_url, flavor_text,
                                   collector_number, artist)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                SET image_url = EXCLUDED.image_url,
                    rarity = EXCLUDED.rarity;
        """, (
            card_id,
            set_id,
            rarity,
            image_url,
            variant.get("flavorText") or None,
            variant["slug"],
            variant.get("artist")
        ))

def main():
    print("Starting Sorcery: Contested Realm ingestion...")
    with ingestion_db() as conn:
        game_id = upsert_game(conn, 'Sorcery: Contested Realm', 'sorcery',
                              "Sorcery: Contested Realm by Erik's Curiosa — a fantasy CCG featuring hand-painted artwork.")
        print(f"Game ID: {game_id}")

        print("Fetching all cards...")
        response = requests.get(CARDS_URL, timeout=30)
        response.raise_for_status()
        cards = response.json()
        print(f"Found {len(cards)} unique cards")

        set_cache = {}
        total_printings = 0

        for i, card in enumerate(cards):
            for set_data in card.get("sets", []):
                set_name = set_data["name"]
                release_date = set_data.get("releasedAt")

                set_id = upsert_set(conn, game_id, set_name, release_date, set_cache)
                if not set_id:
                    continue

                for variant in set_data.get("variants", []):
                    upsert_card(conn, game_id, card, set_id, set_name, variant)
                    total_printings += 1

            if (i + 1) % 100 == 0:
                conn.commit()
                print(f"  [{i+1}/{len(cards)}] cards processed, {total_printings} printings...")

        conn.commit()

    print(f"\nSorcery ingestion complete! {len(cards)} cards, {total_printings} printings")

if __name__ == "__main__":
    main()