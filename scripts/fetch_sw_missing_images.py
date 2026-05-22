#!/usr/bin/env python3
"""
Fetches missing card images for Star Wars CCG (Decipher) from:
  1. swccgdb.com API → res.starwarsccg.org (for non-2pesb sets)
  2. Premiere/Hoth equivalent printings (for 2pesb white-border reprints,
     which share the same art as the original black-border versions)

After running this script:
  - New images are saved to assets/cards/starwars_decipher/
  - DB printings are updated with image_url paths
  - Run scripts/sync_images_r2.sh to push to R2

Requirements: psycopg2, requests
  pip3 install psycopg2-binary requests
"""

import os
import re
import json
import time
import requests
import psycopg2
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────
DB_HOST     = "localhost"
DB_PORT     = int(os.getenv("DB_PORT", "5433"))   # tunnel port
DB_NAME     = "ccgdb"
DB_USER     = os.getenv("DB_USER", "ccgvault")
DB_PASS     = os.getenv("DB_PASS", "")

ASSETS_DIR  = Path(__file__).parent.parent / "assets" / "cards" / "starwars_decipher"
SWCCGDB_API = "https://swccgdb.com/api/public/cards/"
GAME_SLUG   = "starwars_decipher"

# ── Helpers ────────────────────────────────────────────────────────────────────
def slugify(name: str) -> str:
    """Matches the filename convention already used in the DB (lowercase, no punctuation)."""
    s = name.lower()
    s = re.sub(r"[^a-z0-9]", "", s)
    return s

def download_image(url: str, dest: Path) -> bool:
    try:
        r = requests.get(url, timeout=20, headers={"User-Agent": "CCGVault/1.0"})
        if r.status_code == 200:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(r.content)
            return True
        print(f"  HTTP {r.status_code}: {url}")
    except Exception as e:
        print(f"  Error fetching {url}: {e}")
    return False

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print("=== Fetching swccgdb card list ===")
    resp = requests.get(SWCCGDB_API, timeout=30)
    resp.raise_for_status()
    api_cards = resp.json()
    print(f"  {len(api_cards)} cards from API")

    # Build lookup: (set_code, normalised_name) → image_url
    api_index = {}
    for card in api_cards:
        key = (card["set_code"], slugify(card["name"]))
        api_index[key] = card.get("image_url") or ""
        # Also index by name only (for cross-set fallback lookups)
        name_key = slugify(card["name"])
        if name_key not in api_index:
            api_index[name_key] = card.get("image_url") or ""

    print(f"\n=== Connecting to DB ===")
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS
    )
    cur = conn.cursor()

    # Fetch all missing printings for SW Decipher
    cur.execute("""
        SELECT p.id, c.name, s.code, s.id as set_id
        FROM printings p
        JOIN cards c ON c.id = p.card_id
        JOIN sets  s ON s.id = p.set_id
        WHERE s.game_id = 20
          AND p.image_url IS NULL
        ORDER BY s.release_date, c.name
    """)
    missing = cur.fetchall()
    print(f"  {len(missing)} printings with missing images\n")

    # Also fetch existing image_url by card name (for 2pesb fallback)
    cur.execute("""
        SELECT DISTINCT ON (c.name) c.name, p.image_url
        FROM printings p
        JOIN cards c ON c.id = p.card_id
        JOIN sets  s ON s.id = p.set_id
        WHERE s.game_id = 20
          AND p.image_url IS NOT NULL
        ORDER BY c.name, s.release_date
    """)
    existing_by_name = {row[0]: row[1] for row in cur.fetchall()}

    updated = 0
    downloaded = 0
    skipped = 0

    for printing_id, name, set_code, set_id in missing:
        norm = slugify(name)
        img_url = None

        # Strategy 1: exact match in API (set_code + name)
        api_img = api_index.get((set_code, norm), "")

        if api_img:
            # Derive local filename from the API image URL
            fname = Path(api_img).name  # e.g. "keepingtheempireoutforever.gif"
            local_path = ASSETS_DIR / fname

            if not local_path.exists():
                print(f"[{set_code}] Downloading: {name}")
                if download_image(api_img, local_path):
                    downloaded += 1
                    time.sleep(0.15)  # be polite
                else:
                    print(f"  ✗ Failed — skipping {name}")
                    skipped += 1
                    continue
            else:
                print(f"[{set_code}] Already local: {fname}")

            img_url = f"cards/{GAME_SLUG}/{fname}"

        # Strategy 2: for 2pesb reprints, reuse the existing printing's image_url
        elif set_code == "2pesb" and name in existing_by_name:
            img_url = existing_by_name[name]
            print(f"[2pesb] Reusing existing image for: {name} → {img_url}")

        # Strategy 3: name-only API match (different set, same card)
        elif norm in api_index and api_index[norm]:
            api_img = api_index[norm]
            fname = Path(api_img).name
            local_path = ASSETS_DIR / fname
            if not local_path.exists():
                print(f"[{set_code}] Downloading (name-match): {name}")
                if download_image(api_img, local_path):
                    downloaded += 1
                    time.sleep(0.15)
                else:
                    skipped += 1
                    continue
            img_url = f"cards/{GAME_SLUG}/{fname}"
            print(f"[{set_code}] Name-match image for: {name}")

        else:
            print(f"[{set_code}] ✗ No image source found: {name}")
            skipped += 1
            continue

        # Update DB
        cur.execute(
            "UPDATE printings SET image_url = %s WHERE id = %s",
            (img_url, printing_id)
        )
        updated += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n=== Done ===")
    print(f"  Updated : {updated}")
    print(f"  Downloaded : {downloaded}")
    print(f"  Skipped (no source) : {skipped}")
    print(f"\nNext: run scripts/sync_images_r2.sh to push new files to R2")

if __name__ == "__main__":
    main()
