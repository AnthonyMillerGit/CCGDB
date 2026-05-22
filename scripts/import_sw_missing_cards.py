#!/usr/bin/env python3
"""
Imports missing Star Wars CCG (Decipher) cards from swccgdb.com API.

Most missing cards are dark-side versions of cards that already exist
as light-side entries. This script adds the missing cards + their printings
and downloads images to assets/cards/starwars_decipher/.

Requires SSH tunnel to the EC2 database:
  ssh -L 5433:localhost:5433 -i ~/Documents/AWS/ccgvault-key.pem ubuntu@52.8.18.142 -N &

Also exports a DB password:
  export DB_PASS=eaa20bcf39733319d6d88b9633b4d983a6371672c4ea869d

Then run:
  pip3 install psycopg2-binary requests
  python3 scripts/import_sw_missing_cards.py
"""

import os, re, time, json, requests, psycopg2
from pathlib import Path
from collections import Counter

# ── Config ─────────────────────────────────────────────────────────────────────
DB_HOST  = "localhost"
DB_PORT  = int(os.getenv("DB_PORT", "5433"))
DB_NAME  = "ccgdb"
DB_USER  = os.getenv("DB_USER", "ccgvault")
DB_PASS  = os.getenv("DB_PASS", "")
GAME_ID  = 20
GAME_SLUG = "starwars_decipher"

ASSETS_DIR  = Path(__file__).parent.parent / "assets" / "cards" / GAME_SLUG
SWCCGDB_API = "https://swccgdb.com/api/public/cards/"

# set_code → DB set_id
SET_ID_MAP = {
    "pr":    136906, "anh":   137230, "hoth":  137392, "cc":    137734,
    "dah":   137554, "jp":    137914, "se":    138094, "edr":   138418,
    "ds2":   138598, "cor":   138870, "tat":   138780, "tp":    139050,
    "2pesb": 139186, "2pp":   139170, "jpack": 139176, "rlp":   139193,
    "otsd":  139195, "epp":   139213, "ecc":   139219, "ejp":   139231,
    "jpsd":  139243, "ref2":  139263, "ta":    139317, "ref3":  139323,
}

def norm(name):
    return re.sub(r'\s*\([^)]+\)\s*$', '', name).strip().lower()

def card_type_str(c):
    t = c.get("type_name", "") or ""
    s = c.get("subtype_name", "") or ""
    if s:
        return f"{t} — {s}"
    return t

def build_attributes(c):
    return {
        "side":          c.get("side_code"),
        "type":          c.get("type_code"),
        "subtype":       c.get("subtype_code"),
        "destiny":       c.get("destiny"),
        "deploy":        c.get("deploy"),
        "forfeit":       c.get("forfeit"),
        "power":         c.get("power"),
        "ability":       c.get("ability"),
        "armor":         c.get("armor"),
        "maneuver":      c.get("maneuver"),
        "hyperspeed":    c.get("hyperspeed"),
        "landspeed":     c.get("landspeed"),
        "defense_value": c.get("defense_value"),
        "uniqueness":    c.get("uniqueness", ""),
        "characteristics": c.get("characteristics", ""),
        "episode1":      c.get("episode1", False),
        "episode7":      c.get("episode7", False),
        "lore":          c.get("lore"),
    }

def image_local_path(img_url):
    if not img_url:
        return None, None
    fname = Path(img_url).name
    return ASSETS_DIR / fname, f"cards/{GAME_SLUG}/{fname}"

def download_image(url, dest):
    if not url or dest.exists():
        return dest.exists()
    try:
        r = requests.get(url, timeout=20, headers={"User-Agent": "CCGVault/1.0"})
        if r.status_code == 200:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(r.content)
            return True
        print(f"    HTTP {r.status_code}: {url}")
    except Exception as e:
        print(f"    Error: {e}")
    return False

def main():
    print("=== Fetching swccgdb API ===")
    resp = requests.get(SWCCGDB_API, timeout=30)
    resp.raise_for_status()
    api_cards = resp.json()
    print(f"  {len(api_cards)} total cards")

    print("\n=== Connecting to DB ===")
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS
    )
    cur = conn.cursor()

    # Load all existing printings for SW Decipher: (norm_name, side, set_code) → True
    cur.execute("""
        SELECT c.name, COALESCE(c.attributes->>'side', ''), s.code, p.id, c.external_id
        FROM printings p
        JOIN cards c ON c.id = p.card_id
        JOIN sets s  ON s.id = p.set_id
        WHERE s.game_id = %s
    """, (GAME_ID,))
    existing_printings = set()
    for name, side, set_code, pid, extid in cur.fetchall():
        existing_printings.add((norm(name), side, set_code))

    print(f"  {len(existing_printings)} existing printings")

    # Load existing cards by external_id
    cur.execute("SELECT id, external_id FROM cards WHERE game_id = %s AND external_id IS NOT NULL", (GAME_ID,))
    card_by_extid = {row[1]: row[0] for row in cur.fetchall()}

    # Also load existing image_url by printing_id for update
    cur.execute("""
        SELECT p.id, p.image_url, c.external_id, s.code
        FROM printings p
        JOIN cards c ON c.id = p.card_id
        JOIN sets s  ON s.id = p.set_id
        WHERE s.game_id = %s AND p.image_url IS NULL
    """, (GAME_ID,))
    missing_images = {(row[2], row[3]): row[0] for row in cur.fetchall() if row[2]}

    stats = {"inserted_cards": 0, "inserted_printings": 0, "updated_images": 0,
             "downloaded": 0, "skipped": 0}

    for api_card in api_cards:
        set_code = api_card["set_code"]
        name     = api_card["name"]
        side     = api_card.get("side_code", "")
        ext_id   = api_card.get("code", "")
        img_url  = api_card.get("image_url", "")
        set_id   = SET_ID_MAP.get(set_code)

        if not set_id:
            continue

        key = (norm(name), side, set_code)
        printing_exists = key in existing_printings

        # ── Download image regardless ─────────────────────────────────────
        local_path, db_img_path = image_local_path(img_url)
        if local_path and img_url:
            if not local_path.exists():
                if download_image(img_url, local_path):
                    stats["downloaded"] += 1
                    time.sleep(0.1)

        # ── Update image for existing printing that's missing one ─────────
        if printing_exists and ext_id and (ext_id, set_code) in missing_images and db_img_path:
            pid = missing_images[(ext_id, set_code)]
            cur.execute("UPDATE printings SET image_url = %s WHERE id = %s", (db_img_path, pid))
            stats["updated_images"] += 1

        # ── Skip if printing already exists ───────────────────────────────
        if printing_exists:
            continue

        # ── Get or create card ────────────────────────────────────────────
        card_id = card_by_extid.get(ext_id)

        if not card_id:
            attrs = json.dumps(build_attributes(api_card))
            rules = api_card.get("gametext", "") or ""
            lore  = api_card.get("lore", "") or ""
            if lore:
                rules = f"{rules}\n\nLore: {lore}" if rules else f"Lore: {lore}"

            try:
                cur.execute("""
                    INSERT INTO cards (game_id, name, card_type, rules_text, attributes, external_id)
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s)
                    ON CONFLICT (game_id, external_id) DO UPDATE
                        SET name=EXCLUDED.name
                    RETURNING id
                """, (GAME_ID, name, card_type_str(api_card), rules, attrs, ext_id))
                card_id = cur.fetchone()[0]
                card_by_extid[ext_id] = card_id
                stats["inserted_cards"] += 1
                print(f"  NEW card: [{set_code}] {side} - {name}")
            except Exception as e:
                conn.rollback()
                print(f"  ERROR inserting card {name}: {e}")
                continue

        # ── Create printing ───────────────────────────────────────────────
        rarity = api_card.get("rarity_name", "") or None
        try:
            cur.execute("""
                INSERT INTO printings (card_id, set_id, rarity, image_url)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (card_id, set_id, rarity, db_img_path))
            existing_printings.add(key)
            stats["inserted_printings"] += 1
        except Exception as e:
            conn.rollback()
            print(f"  ERROR inserting printing {name} [{set_code}]: {e}")

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n=== Done ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"\nNext: run scripts/sync_images_r2.sh to push new images to R2")

if __name__ == "__main__":
    main()
