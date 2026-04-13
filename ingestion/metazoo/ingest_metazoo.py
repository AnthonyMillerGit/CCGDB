import requests
import psycopg2
import json
import os
import time
import re
from pathlib import Path
from dotenv import load_dotenv
from bs4 import BeautifulSoup

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

CGC_BASE = "https://www.cardgamecollector.com"
CGC_IMG  = "https://cgc.chakra42.net/images/metazoo"

# Primary sets from cardgamecollector.com
# key: our DB set code
# value: (display name, release date, cgc set-list path, cgc image folder, cgc image prefix)
CGC_SETS = {
    "cn1e":  ("Cryptid Nation 1st Edition",  "2021-07-30", "/metazoo/set-list/base-set.html",                 "base-set",                 "MetaZoo-Base"),
    "nf1e":  ("Nightfall",                   "2021-10-01", "/metazoo/set-list/nightfall.html",                "nightfall",                "MetaZoo-Nightfall"),
    "wn1e":  ("Wilderness",                  "2022-03-31", "/metazoo/set-list/wilderness.html",               "wilderness",               "MetaZoo-Wilderness"),
    "ufo1e": ("UFO",                         "2022-07-30", "/metazoo/set-list/ufo.html",                      "ufo",                      "MetaZoo-UFO"),
    "sn1e":  ("Seance",                      "2022-10-21", "/metazoo/set-list/seance.html",                   "seance",                   "MetaZoo-Seance"),
    "nv1e":  ("Native",                      "2023-04-01", "/metazoo/set-list/native.html",                   "native",                   "MetaZoo-Native"),
    "kcc":   ("Kuromi's Cryptid Carnival",   "2023-11-17", "/metazoo/set-list/kuromis-cyrptid-carnival.html", "kuromis-cryptid-carnival", "MetaZoo-Kuromi"),
}

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_db_connection():
    load_dotenv(Path(__file__).resolve().parents[2] / '.env')
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
            VALUES ('MetaZoo', 'metazoo', 'MetaZoo CCG — cryptid and folklore-based card game')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM games WHERE slug = 'metazoo'")
        return cur.fetchone()[0]


def upsert_set(conn, game_id, set_code, name, release_date):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, release_date)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET name         = EXCLUDED.name,
                    release_date = COALESCE(sets.release_date, EXCLUDED.release_date)
            RETURNING id;
        """, (game_id, name, set_code, release_date))
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s", (set_code, game_id))
        row = cur.fetchone()
        return row[0] if row else None


def upsert_card_and_printing(conn, game_id, set_id, card_data):
    if not card_data.get("name"):
        return

    with conn.cursor() as cur:
        # Slugified name as external_id so reprints share the same card row
        external_id = re.sub(r'[^a-z0-9]+', '-', card_data["name"].lower()).strip('-')

        cur.execute("""
            INSERT INTO cards (game_id, name, card_type, rules_text, attributes, external_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (game_id, external_id) DO UPDATE
                SET card_type  = COALESCE(EXCLUDED.card_type,  cards.card_type),
                    rules_text = COALESCE(EXCLUDED.rules_text, cards.rules_text),
                    attributes = EXCLUDED.attributes
            RETURNING id;
        """, (
            game_id,
            card_data["name"],
            card_data.get("card_type"),
            card_data.get("rules_text"),
            json.dumps(card_data.get("attributes", {})),
            external_id,
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute(
                "SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                (external_id, game_id)
            )
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        cur.execute("""
            INSERT INTO printings (card_id, set_id, collector_number, rarity, image_url)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                SET rarity    = EXCLUDED.rarity,
                    image_url = COALESCE(printings.image_url, EXCLUDED.image_url);
        """, (
            card_id,
            set_id,
            card_data.get("collector_number"),
            card_data.get("rarity"),
            card_data.get("image_url"),
        ))


# ---------------------------------------------------------------------------
# CGC scraper
# ---------------------------------------------------------------------------

def parse_cgc_set_page(set_code, set_path, img_folder, img_prefix):
    """
    Scrape a cardgamecollector.com set list page and return a list of card dicts.
    Each card is parsed from a two-column <table> block on the page.
    """
    url = f"{CGC_BASE}{set_path}"
    print(f"  Fetching {url}")
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "CCGDBBot/1.0"})
        resp.raise_for_status()
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = []

    # Each card is a <table> with two-column rows (label | value)
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if not rows:
            continue

        card = {}
        for row in rows:
            cells = row.find_all("td")
            if len(cells) != 2:
                continue
            label = cells[0].get_text(strip=True)
            value = cells[1].get_text(separator=" ", strip=True)

            if label == "Name":
                card["name"] = value
            elif label == "Aura Type":
                card.setdefault("attributes", {})["aura_type"] = value
            elif label == "Type/Tribe":
                card["card_type"] = value
            elif label == "Spellbook Limit":
                card.setdefault("attributes", {})["spellbook_limit"] = value
            elif label == "Cost":
                card.setdefault("attributes", {})["cost"] = value
            elif label == "Life Points":
                card.setdefault("attributes", {})["life_points"] = value
            elif label == "Traits":
                card.setdefault("attributes", {})["traits"] = value
            elif label == "Terra Bonuses":
                card.setdefault("attributes", {})["terra_bonuses"] = value
            elif label == "4th Wall Effects":
                card.setdefault("attributes", {})["fourth_wall"] = value
            elif label == "Effects":
                card["rules_text"] = value
            elif label == "Attack":
                card.setdefault("attributes", {})["attack"] = value
            elif label == "Set Number":
                card["collector_number"] = value.strip()
            elif label == "Rarity":
                card["rarity"] = value

        if not card.get("name") or not card.get("collector_number"):
            continue

        # Build image URL
        num = card["collector_number"].zfill(3)
        card["image_url"] = f"{CGC_IMG}/{img_folder}/{img_prefix}-{num}.jpg"
        card.setdefault("attributes", {})

        cards.append(card)

    return cards


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("MetaZoo Ingestion (cardgamecollector.com source)")
    print("=" * 60)

    conn = get_db_connection()
    total = 0

    try:
        game_id = upsert_game(conn)
        print(f"Game ID: {game_id}\n")

        for set_code, (name, release_date, path, img_folder, img_prefix) in CGC_SETS.items():
            print(f"[{set_code}] {name}")
            set_id = upsert_set(conn, game_id, set_code, name, release_date)
            cards = parse_cgc_set_page(set_code, path, img_folder, img_prefix)
            print(f"  {len(cards)} cards parsed")

            for card in cards:
                upsert_card_and_printing(conn, game_id, set_id, card)

            conn.commit()
            total += len(cards)
            print(f"  Committed.\n")
            time.sleep(0.5)

        print(f"Total cards processed: {total}")

    except Exception as e:
        conn.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        conn.close()

    print("\nMetaZoo ingestion complete!")


if __name__ == "__main__":
    main()