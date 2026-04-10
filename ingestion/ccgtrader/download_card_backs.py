import requests
import psycopg2
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

BASE_URL = "https://api.ccgtrader.co.uk"
CARD_BACKS_DIR = Path(__file__).resolve().parents[2] / 'frontend' / 'public' / 'card-backs'
HEADERS = {'Referer': 'https://www.ccgtrader.net'}

# Games we already have card backs for
SKIP_SLUGS = {
    'mtg', 'pokemon', 'yugioh', 'starwars_decipher', 'startrek_1e',
    'startrek_2e', 'seventhsea', 'onepiece', 'digimon', 'lorcana',
    'fab', 'swu', 'gundam', 'riftbound', 'dragon-ball-fusion',
    'union-arena', 'sorcery', 'fftcg', 'grand-archive', 'altered'
}

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

def fetch_all_ccgtrader_games():
    print("Fetching CCGTrader games with logo data...")
    all_games = []
    page = 1
    limit = 100
    while True:
        response = requests.get(
            f"{BASE_URL}/_/items/game",
            params={
                "limit": limit,
                "offset": (page - 1) * limit,
                "fields": "id,name,url_title,logo.data.asset_url",
                "status": "published"
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json().get("data", [])
        if not data:
            break
        all_games.extend(data)
        if len(data) < limit:
            break
        page += 1
        time.sleep(0.5)
    return all_games

def download_card_back(asset_url, dest_path):
    full_url = f"{BASE_URL}{asset_url}?key=directus-medium-contain"
    response = requests.get(full_url, headers=HEADERS, timeout=15)
    response.raise_for_status()
    content_type = response.headers.get('content-type', '')
    if 'html' in content_type or len(response.content) < 1000:
        return False
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(dest_path, 'wb') as f:
        f.write(response.content)
    return True

def update_card_back(conn, slug, filename):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE games SET card_back_image = %s WHERE slug = %s
        """, (f"/card-backs/{filename}", slug))
    conn.commit()

def main():
    print("Starting CCGTrader card back download...")
    CARD_BACKS_DIR.mkdir(parents=True, exist_ok=True)
    conn = get_db_connection()

    ccgtrader_games = fetch_all_ccgtrader_games()
    print(f"Found {len(ccgtrader_games)} CCGTrader games")

    downloaded = 0
    skipped = 0
    no_logo = 0
    errors = 0

    for game in ccgtrader_games:
        slug = game.get("url_title", "")
        name = game.get("name", "")

        if slug in SKIP_SLUGS:
            skipped += 1
            continue

        logo = game.get("logo")
        if not logo or not logo.get("data") or not logo["data"].get("asset_url"):
            print(f"  No logo: {name}")
            no_logo += 1
            continue

        asset_url = logo["data"]["asset_url"]
        filename = f"{slug}.jpg"
        dest_path = CARD_BACKS_DIR / filename

        if dest_path.exists():
            update_card_back(conn, slug, filename)
            skipped += 1
            continue

        try:
            success = download_card_back(asset_url, dest_path)
            if success:
                update_card_back(conn, slug, filename)
                downloaded += 1
                print(f"  ✓ {name}")
            else:
                print(f"  ✗ Bad image: {name}")
                errors += 1
        except Exception as e:
            print(f"  ✗ Error {name}: {e}")
            errors += 1

        time.sleep(0.3)

    conn.close()
    print(f"\nDone! Downloaded: {downloaded}, Skipped: {skipped}, No logo: {no_logo}, Errors: {errors}")

if __name__ == "__main__":
    main()