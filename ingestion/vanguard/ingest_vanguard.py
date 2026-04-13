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
IMAGE_BASE = "https://en.cf-vanguard.com/wordpress/wp-content/images/cardlist"
GAME_ID_DECKLOG = 1  # Vanguard is game 1 on decklog

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
        driver.get(f"{DECKLOG_BASE}/create?c=1")
        time.sleep(6)
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
        "Referer": f"{DECKLOG_BASE}/create?c=1",
        "Origin": DECKLOG_BASE
    }

def get_card_params(cookie):
    response = requests.post(
        f"{DECKLOG_BASE}/system/app/api/cardparam/{GAME_ID_DECKLOG}",
        headers=make_headers(cookie),
        json={}
    )
    return response.json()

def search_cards(cookie, clan="", nation="", page=1):
    response = requests.post(
        f"{DECKLOG_BASE}/system/app/api/search/{GAME_ID_DECKLOG}",
        headers=make_headers(cookie),
        json={
            "page": page,
            "param": {
                "deck_type": "R",
                "clan": clan,
                "keyword": "",
                "keyword_type": ["name", "text", "no", "tribe"],
                "kind": "0",
                "deck_param1": "D" if nation else "",
                "deck_param2": nation,
                "grade": [],
                "has_grfsd": False,
                "has_ng": False,
                "has_syugyo": False,
                "has_zfrsd": False,
                "limit_ce": "",
                "power_from": "",
                "power_to": "",
                "rare": "",
                "ride_type": "",
                "saiyaku_count": 0,
                "trigger": []
            }
        },
        timeout=30
    )
    if response.status_code != 200:
        return []
    data = response.json()
    return data if isinstance(data, list) else []

def upsert_game(conn):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO games (name, slug, description)
            VALUES ('Cardfight!! Vanguard', 'vanguard',
                    'Cardfight!! Vanguard Trading Card Game by Bushiroad')
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM games WHERE slug = 'vanguard'")
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

def upsert_card(conn, game_id, card, set_cache):
    # Parse set code from card number e.g. "DZ-BT12/012EN" -> "DZ-BT12"
    card_number = card.get("card_number", "")
    set_code = card_number.split("/")[0] if "/" in card_number else card_number[:10]
    set_name = set_code  # We'll use set code as name for now

    set_id = upsert_set(conn, game_id, set_code, set_name, set_cache)

    # Map card_kind to type
    kind_map = {1: "Unit", 2: "Trigger Unit", 3: "G Unit", 4: "Order", 5: "Token"}
    card_type = kind_map.get(card.get("card_kind"), "Unit")

    # Grade from g_param
    grade = card.get("g_param", {}).get("g0", "")
    
    attributes = {
        "grade": grade,
        "power": card.get("g_param", {}).get("g2"),
        "shield": card.get("g_param", {}).get("g3"),
        "trigger": card.get("g_param", {}).get("g4"),
    }

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

def fetch_all_cards_for_filter(cookie, clan="", nation="", label=""):
    all_cards = []
    seen_ids = set()
    page = 1
    consecutive_empty = 0

    while True:
        cards = search_cards(cookie, clan=clan, nation=nation, page=page)
        if not cards:
            consecutive_empty += 1
            if consecutive_empty >= 2:
                break
            time.sleep(2)
            continue

        consecutive_empty = 0
        new_cards = [c for c in cards if c["id"] not in seen_ids]
        for c in new_cards:
            seen_ids.add(c["id"])
        all_cards.extend(new_cards)

        if len(cards) < 30:
            break

        page += 1
        time.sleep(0.5)

    print(f"    {label}: {len(all_cards)} cards")
    return all_cards

def main():
    print("Starting Cardfight!! Vanguard ingestion...")
    conn = get_db_connection()

    try:
        cookie = get_session_cookie()
        params = get_card_params(cookie)

        clans = list(params.get("clan", {}).keys())
        nations = list(params.get("deck_country", {}).keys()) if "deck_country" in params else []

        print(f"Found {len(clans)} clans, {len(nations)} nations")

        game_id = upsert_game(conn)
        print(f"Game ID: {game_id}")

        set_cache = {}
        all_seen = set()
        total = 0

        # Fetch by clan
        for i, clan in enumerate(clans):
            print(f"\n[{i+1}/{len(clans)}] Clan: {clan}")
            cards = fetch_all_cards_for_filter(cookie, clan=clan, label=clan)

            for card in cards:
                if card["card_number"] not in all_seen:
                    all_seen.add(card["card_number"])
                    upsert_card(conn, game_id, card, set_cache)
                    total += 1

            conn.commit()
            time.sleep(0.5)

            # Refresh cookie every 20 clans
            if (i + 1) % 20 == 0:
                print("  Refreshing session cookie...")
                cookie = get_session_cookie()

        # Fetch by nation (D-series)
        for i, nation in enumerate(nations):
            print(f"\n[{i+1}/{len(nations)}] Nation: {nation}")
            cards = fetch_all_cards_for_filter(cookie, nation=nation, label=nation)

            for card in cards:
                if card["card_number"] not in all_seen:
                    all_seen.add(card["card_number"])
                    upsert_card(conn, game_id, card, set_cache)
                    total += 1

            conn.commit()
            time.sleep(0.5)

        print(f"\nVanguard ingestion complete! {total} unique cards")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()