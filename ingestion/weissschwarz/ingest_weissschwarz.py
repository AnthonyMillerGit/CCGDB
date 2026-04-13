import requests
import psycopg2
import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

DECKLOG_BASE = "https://decklog-en.bushiroad.com"
IMAGE_BASE = "https://en.ws-tcg.com/wordpress/wp-content/images/cardimages"
GAME_ID_DECKLOG = 2

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )

def get_session_cookie():
    print("Getting fresh session cookie via Selenium...")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    try:
        driver.get(f"{DECKLOG_BASE}/create?c=2")
        time.sleep(8)
        for c in driver.get_cookies():
            if c['name'] == 'CAKEPHP':
                print(f"  Got cookie: {c['value'][:20]}...")
                return c['value']
    finally:
        driver.quit()
    raise Exception("Could not get session cookie")

def make_headers(cookie):
    return {
        "Content-Type": "application/json;charset=UTF-8",
        "Cookie": f"CAKEPHP={cookie}",
        "Referer": f"{DECKLOG_BASE}/create?c=2",
        "Origin": DECKLOG_BASE
    }

def get_titles(cookie):
    """Get all title codes and names from the suggest endpoint."""
    response = requests.post(
        f"{DECKLOG_BASE}/system/app/api/suggest/{GAME_ID_DECKLOG}",
        headers=make_headers(cookie),
        json={},
        timeout=30
    )
    return response.json()  # {title_code: title_name}

def search_cards(cookie, title_code, page=1, retries=3):
    """Search cards for a specific title code with retry logic."""
    for attempt in range(retries):
        try:
            response = requests.post(
                f"{DECKLOG_BASE}/system/app/api/search/{GAME_ID_DECKLOG}",
                headers=make_headers(cookie),
                json={
                    "page": page,
                    "param": {
                        "title_number": "",
                        "keyword": "",
                        "keyword_type": ["name", "text", "no", "feature"],
                        "side": "",
                        "card_kind": "0",
                        "level_s": "", "level_e": "",
                        "power_s": "", "power_e": "",
                        "color": "0",
                        "soul_s": "", "soul_e": "",
                        "cost_s": "", "cost_e": "",
                        "trigger": "",
                        "option_counter": False,
                        "option_clock": False,
                        "deck_param1": "N",
                        "deck_param2": title_code
                    }
                },
                timeout=60
            )
            if response.status_code != 200:
                print(f"    HTTP {response.status_code} on attempt {attempt+1}")
                time.sleep(5)
                continue
            data = response.json()
            return data if isinstance(data, list) else []
        except Exception as e:
            print(f"    Attempt {attempt+1} failed: {e}")
            time.sleep(10)
    return []

def fetch_all_cards_for_title(cookie, title_code, title_name):
    """Fetch all pages for a title."""
    all_cards = []
    seen_ids = set()
    page = 1

    while True:
        cards = search_cards(cookie, title_code, page=page)
        if not cards:
            break

        new_cards = [c for c in cards if c["id"] not in seen_ids]
        for c in new_cards:
            seen_ids.add(c["id"])
        all_cards.extend(new_cards)

        if len(cards) < 30:
            break

        page += 1
        time.sleep(0.5)

    return all_cards

def upsert_game(conn):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO games (name, slug, description)
            VALUES ('Weiss Schwarz', 'weissschwarz',
                    'Weiss Schwarz Trading Card Game by Bushiroad')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM games WHERE slug = 'weissschwarz'")
        return cur.fetchone()[0]

def upsert_set(conn, game_id, set_code, set_name, set_cache):
    if set_code in set_cache:
        return set_cache[set_code]
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code)
            VALUES (%s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id;
        """, (game_id, set_name, set_code))
        result = cur.fetchone()
        if result:
            set_id = result[0]
        else:
            cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                       (set_code, game_id))
            set_id = cur.fetchone()[0]
    set_cache[set_code] = set_id
    return set_id

def upsert_card(conn, game_id, card, title_name, set_cache):
    card_number = card.get("card_number", "")

    # Set code is the part before the slash e.g. "AT" from "AT/WX02-001"
    if "/" in card_number:
        set_code = card_number.split("/")[0]
    else:
        set_code = card_number[:10]

    set_id = upsert_set(conn, game_id, set_code, title_name, set_cache)

    # card_kind: 1=Character, 2=Event, 3=Climax
    kind_map = {1: "Character", 2: "Event", 3: "Climax"}
    card_type = kind_map.get(card.get("card_kind"), "Character")

    g = card.get("g_param", {})
    attributes = {
        "level": g.get("g0"),
        "cost": g.get("g1"),
        "power": g.get("g2"),
        "soul": g.get("g3"),
        "trigger": g.get("g4"),
        "color": g.get("g5"),
    }

    # Image URL — use img field directly as path suffix
    image_url = None
    if card.get("img"):
        image_url = f"{IMAGE_BASE}/{card['img']}"

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO cards (game_id, name, card_type, attributes, external_id)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (game_id, external_id) DO UPDATE
                SET name = EXCLUDED.name,
                    card_type = EXCLUDED.card_type,
                    attributes = EXCLUDED.attributes
            RETURNING id;
        """, (
            game_id,
            card.get("name", "Unknown"),
            card_type,
            json.dumps(attributes),
            card_number
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                       (card_number, game_id))
            row = cur.fetchone()
            if not row:
                return
            card_id = row[0]

        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url, collector_number)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                SET image_url = EXCLUDED.image_url,
                    rarity = EXCLUDED.rarity;
        """, (card_id, set_id, card.get("rare"), image_url, card_number))

def main():
    print("Starting Weiss Schwarz ingestion...")
    conn = get_db_connection()

    # Resume support — set to 0 to start fresh
    START_FROM_INDEX = 0

    try:
        cookie = get_session_cookie()
        titles = get_titles(cookie)
        print(f"Found {len(titles)} titles")

        game_id = upsert_game(conn)
        print(f"Game ID: {game_id}")

        set_cache = {}
        all_seen = set()
        total = 0

        titles_list = list(titles.items())

        for i, (title_code, title_name) in enumerate(titles_list):
            if i < START_FROM_INDEX:
                continue

            print(f"\n[{i+1}/{len(titles_list)}] {title_name} ({title_code})")

            cards = fetch_all_cards_for_title(cookie, title_code, title_name)
            print(f"  Fetched {len(cards)} cards")

            new_count = 0
            for card in cards:
                if card["card_number"] not in all_seen:
                    all_seen.add(card["card_number"])
                    upsert_card(conn, game_id, card, title_name, set_cache)
                    new_count += 1
                    total += 1

            conn.commit()
            print(f"  {new_count} new unique cards committed (total: {total})")

            time.sleep(1)

            # Refresh cookie every 25 titles
            if (i + 1) % 25 == 0:
                print("\n  Refreshing session cookie...")
                cookie = get_session_cookie()

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

    print(f"\nWeiss Schwarz ingestion complete! {total} unique cards")

if __name__ == "__main__":
    main()