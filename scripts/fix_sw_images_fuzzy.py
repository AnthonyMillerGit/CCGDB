#!/usr/bin/env python3
"""
Final pass: downloads images for the 55 SW Decipher printings where name
normalization is needed (accents, '(EP1)' suffix, '(Xth Marker)' suffix,
'A / B' objective cards, trailing punctuation differences).

Run with SSH tunnel active:
  DB_PASS=... python3 scripts/fix_sw_images_fuzzy.py
"""

import os, re, time, json, requests, psycopg2, unicodedata
from pathlib import Path

DB_HOST    = "localhost"
DB_PORT    = int(os.getenv("DB_PORT", "5433"))
DB_NAME    = "ccgdb"
DB_USER    = os.getenv("DB_USER", "ccgvault")
DB_PASS    = os.getenv("DB_PASS", "")
GAME_ID    = 20
GAME_SLUG  = "starwars_decipher"
ASSETS_DIR = Path(__file__).parent.parent / "assets" / "cards" / GAME_SLUG

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

def fuzzy_key(name):
    """Normalise for matching: strip accents, trailing parentheticals, punctuation, whitespace."""
    s = strip_accents(name).lower()
    s = re.sub(r'\s*\([^)]+\)\s*', ' ', s)  # remove all parentheticals
    s = re.sub(r'[^a-z0-9 /]', '', s)        # keep alphanumerics, spaces, slashes
    s = re.sub(r'\s*/\s*', '/', s)           # normalise slash spacing
    s = s.strip()
    return s

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

    # Build (set_code, fuzzy_key) → card lookup
    api_idx = {}
    for c in data:
        k = (c["set_code"], fuzzy_key(c["name"]))
        api_idx[k] = c
        # Also index by first part of "/" name
        if "/" in c["name"]:
            first_part = c["name"].split("/")[0].strip()
            api_idx[(c["set_code"], fuzzy_key(first_part))] = c

    print(f"  {len(data)} cards, {len(api_idx)} index entries")

    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS)
    cur = conn.cursor()

    # Only printings still missing an image
    cur.execute("""
        SELECT p.id, c.name, s.code
        FROM printings p
        JOIN cards c ON c.id = p.card_id
        JOIN sets s  ON s.id = p.set_id
        WHERE s.game_id = %s AND p.image_url IS NULL
        ORDER BY s.release_date, c.name
    """, (GAME_ID,))
    rows = cur.fetchall()
    print(f"  {len(rows)} printings still missing images\n")

    updated = downloaded = skipped = 0

    for pid, name, set_code in rows:
        fk = fuzzy_key(name)
        card = api_idx.get((set_code, fk))

        # Also try with first token of "/" name from our side
        if not card and "/" in name:
            first_part = name.split("/")[0].strip()
            card = api_idx.get((set_code, fuzzy_key(first_part)))

        if not card:
            print(f"  [skip] [{set_code}] {name}")
            skipped += 1
            continue

        img_url = card.get("image_url", "")
        if not img_url:
            print(f"  [no-img] [{set_code}] {name}")
            skipped += 1
            continue

        fname = Path(img_url).name
        dest = ASSETS_DIR / fname

        if download(img_url, dest):
            db_path = f"cards/{GAME_SLUG}/{fname}"
            cur.execute("UPDATE printings SET image_url = %s WHERE id = %s", (db_path, pid))
            updated += 1
            downloaded += 1
            print(f"  OK [{set_code}] {name} → {fname}")
            time.sleep(0.12)
        else:
            skipped += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n=== Done ===")
    print(f"  Updated + downloaded : {updated}")
    print(f"  Skipped              : {skipped}")
    print(f"\nNext: run scripts/sync_images_r2.sh")

if __name__ == "__main__":
    main()
