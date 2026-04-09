import requests
import psycopg2
import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

BASE_URL = "https://api.ccgtrader.co.uk/_/items"

# Games we already have from dedicated APIs - skip these
SKIP_SLUGS = {
    'magic-the-gathering-ccg',
    'pokemon-tcg',
    'yu-gi-oh-tcg',
    'star-wars-ccg',
    'star-trek-ccg-first-edition',
    'star-trek-ccg-second-edition',
    '7th-sea-ccg',
    'one-piece-collectible-card-game',
    'digimon-ccg',
    'disney-lorcana',
    'flesh-and-blood-tcg',
}

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

def fetch_rarities():
    print("Fetching rarities...")
    response = requests.get(f"{BASE_URL}/rarities?limit=100")
    response.raise_for_status()
    return {r["id"]: r["name"] for r in response.json()["data"]}

def fetch_all_games():
    print("Fetching all games...")
    all_games = []
    offset = 0
    limit = 100
    while True:
        response = requests.get(f"{BASE_URL}/game?limit={limit}&offset={offset}&status=published")
        response.raise_for_status()
        data = response.json()["data"]
        if not data:
            break
        all_games.extend(data)
        if len(data) < limit:
            break
        offset += limit
    return all_games

def fetch_sets_for_series(series_id):
    response = requests.get(
        f"{BASE_URL}/set?filter%5Bseries%5D%5Beq%5D={series_id}&limit=500&sort=sort,release_date,name"
    )
    response.raise_for_status()
    return response.json().get("data", [])

def fetch_cards_for_set(set_id):
    try:
        response = requests.get(
            f"{BASE_URL}/card"
            f"?fields%5B0%5D=id"
            f"&fields%5B1%5D=name"
            f"&fields%5B2%5D=number"
            f"&fields%5B3%5D=subtitle"
            f"&fields%5B4%5D=rarity"
            f"&fields%5B5%5D=image.data.asset_url"
            f"&fields%5B6%5D=type"
            f"&filter%5Bset%5D%5Beq%5D={set_id}"
            f"&limit=4999&sort=number,type,name"
        )
        if response.status_code == 500:
            print(f"    500 error on set {set_id}, skipping")
            return []
        response.raise_for_status()
        return response.json().get("data", [])
    except Exception as e:
        print(f"    Error fetching set {set_id}: {e}")
        return []

def upsert_game(conn, game):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO games (name, slug, description)
            VALUES (%s, %s, %s)
            ON CONFLICT (slug) DO UPDATE
                SET name = EXCLUDED.name,
                    description = EXCLUDED.description
            RETURNING id;
        """, (
            game["name"],
            game["url_title"],
            game.get("description", "")[:500] if game.get("description") else ""
        ))
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM games WHERE slug = %s", (game["url_title"],))
            return cur.fetchone()[0]

def upsert_set(conn, game_id, ccg_set):
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
            ccg_set["name"],
            ccg_set["url_title"],
            ccg_set.get("release_date")
        ))
        result = cur.fetchone()
        if result:
            return result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (ccg_set["url_title"], game_id))
            row = cur.fetchone()
            return row[0] if row else None

def upsert_card(conn, game_id, set_id, card, rarities):
    with conn.cursor() as cur:
        rarity_id = card.get("rarity")
        if isinstance(rarity_id, dict):
            rarity_id = rarity_id.get("id")
        rarity_name = rarities.get(rarity_id, "Unknown") if rarity_id is not None else None

        full_name = card["name"]
        if card.get("subtitle"):
            full_name = f"{card['name']} - {card['subtitle']}"

        external_id = str(card["id"])

        cur.execute("""
            INSERT INTO cards (game_id, name, rules_text, card_type, external_id)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (game_id, external_id) DO UPDATE
                SET name = EXCLUDED.name,
                    rules_text = EXCLUDED.rules_text,
                    card_type = EXCLUDED.card_type
            RETURNING id;
        """, (
            game_id,
            full_name,
            card.get("description"),
            card.get("type"),
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

        # Get image URL using asset_url endpoint
        image_url = None
        image_data = card.get("image")
        if image_data and isinstance(image_data, dict):
            asset_url = image_data.get("data", {}).get("asset_url")
            if asset_url:
                image_url = f"https://api.ccgtrader.co.uk{asset_url}"

        collector_number = str(card.get("number", "")) if card.get("number") else None

        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url, collector_number)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                SET image_url = EXCLUDED.image_url,
                    rarity = EXCLUDED.rarity;
        """, (
            card_id,
            set_id,
            rarity_name,
            image_url,
            collector_number
        ))

def main():
    print("Starting CCGTrader universal ingestion...")
    conn = get_db_connection()

    try:
        rarities = fetch_rarities()
        print(f"Loaded {len(rarities)} rarities")

        games = fetch_all_games()
        print(f"Found {len(games)} games on CCGTrader")

        games_to_process = [g for g in games if g["url_title"] not in SKIP_SLUGS]
        print(f"Processing {len(games_to_process)} new games (skipping {len(games) - len(games_to_process)} already ingested)")

        for g_idx, game in enumerate(games_to_process):
            print(f"\n[{g_idx+1}/{len(games_to_process)}] {game['name']}")

            game_id = upsert_game(conn, game)

            sets = fetch_sets_for_series(game["id"])
            print(f"  Found {len(sets)} sets")

            total_cards = 0
            for s_idx, ccg_set in enumerate(sets):
                set_id = upsert_set(conn, game_id, ccg_set)
                if not set_id:
                    continue

                cards = fetch_cards_for_set(ccg_set["id"])
                for card in cards:
                    upsert_card(conn, game_id, set_id, card, rarities)

                total_cards += len(cards)
                print(f"  [{s_idx+1}/{len(sets)}] {ccg_set['name']}: {len(cards)} cards")

                conn.commit()
                time.sleep(1)

            print(f"  Total: {total_cards} cards ingested")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()

    print("\nCCGTrader ingestion complete!")

if __name__ == "__main__":
    main()