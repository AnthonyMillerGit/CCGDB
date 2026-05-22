#!/usr/bin/env python3
"""
Downloads and links missing images for SW Decipher cards.
Matches printings to swccgdb by external_id (most reliable).
For 2pesb reprints (no external_id in printing, card has one from another set),
falls back to reusing the existing image_url from the card's other printings.

Run with SSH tunnel active:
  DB_PASS=... python3 scripts/fix_sw_images.py
"""

import os, re, time, json, requests, psycopg2
from pathlib import Path

DB_HOST   = "localhost"
DB_PORT   = int(os.getenv("DB_PORT", "5433"))
DB_NAME   = "ccgdb"
DB_USER   = os.getenv("DB_USER", "ccgvault")
DB_PASS   = os.getenv("DB_PASS", "")
GAME_ID   = 20
GAME_SLUG = "starwars_decipher"
ASSETS_DIR = Path(__file__).parent.parent / "assets" / "cards" / GAME_SLUG

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "image/gif,image/*,*/*",
}

def download(url, dest):
    if dest.exists():
        return True
    try:
        r = requests.get(url, timeout=20, headers=HEADERS)
        if r.status_code == 200:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(r.content)
            return True
        print(f"  HTTP {r.status_code}: {Path(url).name}")
    except Exception as e:
        print(f"  Error: {e}")
    return False

def main():
    print("=== Fetching swccgdb API ===")
    data = requests.get("https://swccgdb.com/api/public/cards/", timeout=30).json()
    # Index by external_id (code field in API)
    api_by_code = {c["code"]: c for c in data}
    print(f"  {len(api_by_code)} cards")

    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS)
    cur = conn.cursor()

    # All printings missing image_url, with card external_id where available
    cur.execute("""
        SELECT p.id, c.external_id, c.name, s.code as set_code,
               (SELECT p2.image_url FROM printings p2
                WHERE p2.card_id = c.id AND p2.image_url IS NOT NULL
                LIMIT 1) as fallback_url
        FROM printings p
        JOIN cards c ON c.id = p.card_id
        JOIN sets s  ON s.id = p.set_id
        WHERE s.game_id = %s AND p.image_url IS NULL
        ORDER BY s.release_date, c.name
    """, (GAME_ID,))
    rows = cur.fetchall()
    print(f"  {len(rows)} printings missing images\n")

    updated = downloaded = fallback = skipped = 0

    for pid, ext_id, name, set_code, fallback_url in rows:
        db_img_path = None

        # Strategy 1: match by external_id → get API image_url
        if ext_id and ext_id in api_by_code:
            api_img = api_by_code[ext_id].get("image_url", "")
            if api_img:
                fname = Path(api_img).name
                dest = ASSETS_DIR / fname
                if download(api_img, dest):
                    db_img_path = f"cards/{GAME_SLUG}/{fname}"
                    downloaded += 1
                    time.sleep(0.12)

        # Strategy 2: reuse image from another printing of the same card
        if not db_img_path and fallback_url:
            db_img_path = fallback_url
            fallback += 1
            print(f"  [fallback] {set_code} {name}")

        if db_img_path:
            cur.execute("UPDATE printings SET image_url = %s WHERE id = %s", (db_img_path, pid))
            updated += 1
        else:
            print(f"  [skip] {set_code} {name} (ext_id={ext_id})")
            skipped += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n=== Done ===")
    print(f"  Updated  : {updated}")
    print(f"  Downloaded new images : {downloaded}")
    print(f"  Used fallback (same card, other set) : {fallback}")
    print(f"  Skipped (no source) : {skipped}")
    print(f"\nNext: run scripts/sync_images_r2.sh")

if __name__ == "__main__":
    main()
