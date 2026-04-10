import requests
import psycopg2
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import urlparse, urlencode

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

ASSETS_DIR = Path(__file__).resolve().parents[2] / 'assets' / 'cards'
HEADERS = {
    'Referer': 'https://www.ccgtrader.net',
}

# Games with their own image hosting — skip these
SKIP_SLUGS = {
    'mtg', 'pokemon', 'yugioh', 'starwars_decipher',
    'startrek_1e', 'startrek_2e', 'seventhsea', 'onepiece',
    'digimon', 'lorcana', 'fab'
}

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

def get_printings_to_download(conn):
    with conn.cursor() as cur:
        skip_slugs_list = list(SKIP_SLUGS)
        placeholders = ','.join(['%s'] * len(skip_slugs_list))
        cur.execute(f"""
            SELECT p.id, p.image_url, g.slug
            FROM printings p
            JOIN cards c ON c.id = p.card_id
            JOIN games g ON g.id = c.game_id
            WHERE p.image_url IS NOT NULL
            AND p.image_url LIKE 'https://api.ccgtrader.co.uk%%'
            AND g.slug NOT IN ({placeholders})
            ORDER BY g.slug, p.id
        """, skip_slugs_list)
        return cur.fetchall()

def update_image_url(conn, printing_id, new_url):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE printings SET image_url = %s WHERE id = %s
        """, (new_url, printing_id))

def download_image(url, dest_path):
    response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()
    # Verify it's actually an image not an HTML error page
    content_type = response.headers.get('content-type', '')
    if 'html' in content_type:
        raise ValueError(f"Got HTML instead of image: {content_type}")
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(dest_path, 'wb') as f:
        f.write(response.content)

def main():
    print("Starting CCGTrader image download...")
    conn = get_db_connection()

    printings = get_printings_to_download(conn)
    print(f"Found {len(printings)} images to download")

    downloaded = 0
    skipped = 0
    errors = 0

    for i, (printing_id, image_url, game_slug) in enumerate(printings):
        try:
            # Build a safe filename from the URL
            parsed = urlparse(image_url)
            # Use the asset ID from the path as filename
            asset_id = parsed.path.split('/')[-1]
            filename = f"{asset_id}.jpg"
            dest_path = ASSETS_DIR / game_slug / filename

            # Skip if already downloaded
            if dest_path.exists():
                skipped += 1
                local_url = f"http://localhost:8000/assets/cards/{game_slug}/{filename}"
                if image_url != local_url:
                    update_image_url(conn, printing_id, local_url)
                continue

            # Download the image
            download_image(image_url, dest_path)

            # Update DB to point to local URL
            local_url = f"http://localhost:8000/assets/cards/{game_slug}/{filename}"
            update_image_url(conn, printing_id, local_url)

            downloaded += 1

            if downloaded % 100 == 0:
                conn.commit()
                print(f"  [{i+1}/{len(printings)}] Downloaded: {downloaded}, Skipped: {skipped}, Errors: {errors}")

            time.sleep(1)  # 1 second between requests — be respectful

        except Exception as e:
            errors += 1
            if errors % 20 == 0:
                print(f"  Error ({errors} total) on {image_url}: {e}")
            time.sleep(3)  # longer delay on error

    conn.commit()
    print(f"\nDone! Downloaded: {downloaded}, Skipped: {skipped}, Errors: {errors}")

if __name__ == "__main__":
    main()