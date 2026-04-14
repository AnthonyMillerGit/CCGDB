import requests
import json
import time
import re
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import upsert_game, ingestion_db
from bs4 import BeautifulSoup
from urllib.parse import quote
from playwright.sync_api import sync_playwright

BASE_URL = "https://www.forceofwind.online"
CHECKPOINT_FILE = Path(__file__).parent / "fow_card_stubs.json"

# Set list: (set_code, set_name, cluster)
SETS = [
    ("WL",         "Wanderer League",                                      "Promo"),
    ("RL",         "Ruler League",                                         "Promo"),
    ("World",      "World's Rewards",                                      "Promo"),
    ("WGP",        "World Grand Prix",                                     "Promo"),
    ("WPR",        "Will Power Rewards",                                   "Promo"),
    ("BaB",        "Buy a Box",                                            "Promo"),
    ("Pre",        "Pre-release Party",                                    "Promo"),
    ("PR2015",     "2015 Promo",                                           "Promo"),
    ("Souvenir",   "Souvenir",                                             "Promo"),
    ("Judge",      "Judge",                                                "Promo"),
    ("ABC",        "Arcana Battle Colosseum",                              "Arcana Battle Colosseum"),
    ("ABC-WB",     "ABC 2023 Light & Water",                               "Arcana Battle Colosseum"),
    ("ABC-WD",     "ABC 2023 Light & Darkness",                            "Arcana Battle Colosseum"),
    ("ABC-RG",     "ABC 2023 Fire & Wind",                                 "Arcana Battle Colosseum"),
    ("ABC-RD",     "ABC 2023 Fire & Darkness",                             "Arcana Battle Colosseum"),
    ("ABC-BG",     "ABC 2023 Water & Wind",                                "Arcana Battle Colosseum"),
    ("ABC-SD01",   "Elektra vs The Lich King (Elektra)",                   "Arcana Battle Colosseum"),
    ("ABC-SD02",   "Replicant: Aristella vs Ki Lua (Replicant: Aristella)","Arcana Battle Colosseum"),
    ("ABC-SD03",   "Gnome vs Reinhardt (Gnome)",                           "Arcana Battle Colosseum"),
    ("ABC-SD04",   "Hyde vs Undine (Hyde)",                                "Arcana Battle Colosseum"),
    ("ABC-SD05",   "Hyde vs Undine (Undine)",                              "Arcana Battle Colosseum"),
    ("ABC-SD06",   "Replicant: Aristella vs Ki Lua (Ki Lua)",              "Arcana Battle Colosseum"),
    ("ABC-SD07",   "Efreet vs Falchion (Efreet)",                         "Arcana Battle Colosseum"),
    ("ABC-SD08",   "Efreet vs Falchion (Falchion)",                        "Arcana Battle Colosseum"),
    ("ABC-SD09",   "Gnome vs Reinhardt (Reinhardt)",                       "Arcana Battle Colosseum"),
    ("ABC-SD10",   "Elektra vs The Lich King (The Lich King)",             "Arcana Battle Colosseum"),
    ("ABC-SD11",   "Void vs Void",                                         "Arcana Battle Colosseum"),
    ("VIN001",     "Vingolf \"Engage Knights\"",                           "Extra Sets"),
    ("VIN002",     "Vingolf \"Valkyria Chronicles\"",                      "Extra Sets"),
    ("VIN003",     "Vingolf \"Ruler All Stars\"",                          "Extra Sets"),
    ("GITS2045",   "GHOST IN THE SHELL SAC_2045",                          "Extra Sets"),
    ("GITS2045SD", "Starter Deck GHOST IN THE SHELL SAC_2045",             "Extra Sets"),
    ("ATD",        "Antechamber of the Ten Dimensions",                    "Extra Sets"),
    ("CMF",        "Crimson Moon's Fairy Tale",                            "Grimm"),
    ("TAT",        "The Castle of Heaven and The Two Towers",              "Grimm"),
    ("MPR",        "The Moon Priestess Returns",                           "Grimm"),
    ("MOA",        "The Millennia of Ages",                                "Grimm"),
    ("VS01",       "Faria, the Sacred Queen and Melgis, the Flame King",   "Alice"),
    ("SKL",        "The Seven Kings of the Lands",                         "Alice"),
    ("TTW",        "The Twilight Wanderer",                                "Alice"),
    ("TMS",        "The Moonlit Savior",                                   "Alice"),
    ("BFA",        "Battle for Attoractia",                                "Alice"),
    ("SDL1",       "Fairy Tale Force",                                     "Lapis"),
    ("SDL2",       "Rage of R'lyeh",                                       "Lapis"),
    ("SDL3",       "Malefic Ice",                                          "Lapis"),
    ("SDL4",       "Swarming Elves",                                       "Lapis"),
    ("SDL5",       "Vampiric Hunger",                                      "Lapis"),
    ("CFC",        "Curse of the Frozen Casket",                           "Lapis"),
    ("LEL",        "Legacy Lost",                                          "Lapis"),
    ("RDE",        "Return of the Dragon Emperor",                         "Lapis"),
    ("ENW",        "Echoes of the New World",                              "Lapis"),
    ("SDR1",       "King of the Mountain",                                 "Reiya"),
    ("SDR2",       "Blood of the Dragons",                                 "Reiya"),
    ("SDR3",       "Below the Waves",                                      "Reiya"),
    ("SDR4",       "Elemental Surge",                                      "Reiya"),
    ("SDR5",       "Children of the Night",                                "Reiya"),
    ("ACN",        "Ancient Nights",                                       "Reiya"),
    ("ADK",        "Advent of the Demon King",                             "Reiya"),
    ("TSW",        "The Time Spinning Witch",                              "Reiya"),
    ("SDR6",       "The Lost Tomes",                                       "Reiya"),
    ("WOM",        "Winds of the Ominous Moon",                            "Reiya"),
    ("SDV1",       "New Valhalla Entry Set [Light]",                       "New Valhalla"),
    ("SDV2",       "New Valhalla Entry Set [Fire]",                        "New Valhalla"),
    ("SDV3",       "New Valhalla Entry Set [Water]",                       "New Valhalla"),
    ("SDV4",       "New Valhalla Entry Set [Wind]",                        "New Valhalla"),
    ("SDV5",       "New Valhalla Entry Set [Darkness]",                    "New Valhalla"),
    ("NDR",        "New Dawn Rises",                                       "New Valhalla"),
    ("SNV",        "The Strangers of New Valhalla",                        "New Valhalla"),
    ("AOA",        "Awakening of the Ancients",                            "New Valhalla"),
    ("DBV",        "The Decisive Battle of Valhalla",                      "New Valhalla"),
    ("SDAO1",      "Faria/Melgis",                                         "Alice Origin"),
    ("AO1",        "Alice Origin",                                         "Alice Origin"),
    ("SDAO2",      "Valentina/Pricia",                                     "Alice Origin"),
    ("AO2",        "Alice Origin II",                                      "Alice Origin"),
    ("AO3",        "Alice Origin III",                                     "Alice Origin"),
    ("PofA",       "Prologue of Attoractia",                               "Alice Origin"),
    ("EDL",        "The Epic of the Dragon Lord",                          "Saga"),
    ("MSW",        "The Magic Stone War - Zero",                           "Saga"),
    ("ROL",        "Rebirth of Legend",                                    "Saga"),
    ("ADW",        "Assault into the Demonic World",                       "Saga"),
    ("TST",        "The Seventh",                                          "Saga"),
    ("DSD",        "Duel Cluster Starter Decks",                           "Duel"),
    ("GOG",        "Game of Gods",                                         "Duel"),
    ("GRL",        "Game of Gods Reloaded",                                "Duel"),
    ("GRV",        "Game of Gods Revolution",                              "Duel"),
    ("HSD",        "Hero Cluster Starter Decks",                           "Hero"),
    ("NWE",        "A New World Emerges",                                  "Hero"),
    ("TUS",        "The Underworld of Secrets",                            "Hero"),
    ("TWS",        "The War of the Suns",                                  "Hero"),
    ("CMB",        "Crimson Moon's Battleground",                          "Hero"),
    ("CST",        "Clash of the Star Trees",                              "Hero"),
    ("JRP",        "Judgment of the Rogue Planet",                         "Hero"),
    ("TSD1",       "Lehen Deck",                                           "Trinity"),
    ("TSD2",       "Yokoshima Deck",                                       "Trinity"),
    ("TTT",        "Thoth of the Trinity",                                 "Trinity"),
    ("TSR",        "The Battle at the Sacred Ruins",                       "Trinity"),
    ("TEU",        "Timeless Eclipse of the Underworld",                   "Trinity"),
    ("TOP",        "Ten Oaths of Protopaterpolis' War",                    "Trinity"),
    ("MP01",       "Masterpiece \"Pilgrim Memories\"",                     "Masterpiece Collection"),
    ("MP02",       "Masterpiece Collection 02 \"Fates Reunited!\"",        "Masterpiece Collection"),
    ("MP03",       "Masterpiece Collection 03 \"Dimensional Hope\"",       "Masterpiece Collection"),
    ("ESD1",       "Valgott Deck",                                         "Evil"),
    ("ESD2",       "Metelda Deck",                                         "Evil"),
    ("DRC",        "Descent into the Raven's Catacombs",                   "Evil"),
    ("JRV",        "Journey to Ravidra",                                   "Evil"),
]

# Build lookup: set_code -> (set_name, cluster)
SET_LOOKUP = {code: (name, cluster) for code, name, cluster in SETS}


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------



def upsert_set(conn, game_id, set_code):
    name, cluster = SET_LOOKUP.get(set_code, (set_code, "Unknown"))
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, set_type)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET name     = EXCLUDED.name,
                    set_type = EXCLUDED.set_type
            RETURNING id;
        """, (game_id, name, set_code, cluster))
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
        external_id = card_data["card_id"]

        cur.execute("""
            INSERT INTO cards (game_id, name, card_type, rules_text, attributes, external_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (game_id, external_id) DO UPDATE
                SET rules_text = COALESCE(EXCLUDED.rules_text, cards.rules_text),
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
            INSERT INTO printings (card_id, set_id, collector_number, rarity, image_url, back_image_url)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (card_id, set_id, collector_number) DO UPDATE
                SET image_url      = COALESCE(EXCLUDED.image_url,      printings.image_url),
                    back_image_url = COALESCE(EXCLUDED.back_image_url, printings.back_image_url);
        """, (
            card_id,
            set_id,
            card_data.get("collector_number", card_data["card_id"]),
            card_data.get("rarity"),
            card_data.get("image_url"),
            card_data.get("back_image_url"),
        ))


# ---------------------------------------------------------------------------
# Phase 1 — collect all card stubs via Playwright
# ---------------------------------------------------------------------------

def collect_all_stubs():
    """
    Use Playwright to paginate through all search results.
    Clicks the next-page arrow until exhausted.
    Returns list of stub dicts: {card_id, name, image_url, back_image_url}
    Saves checkpoint to fow_card_stubs.json so you can resume if interrupted.
    """
    stubs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("  Loading search page...")
        page.goto(
            f"{BASE_URL}/search/?generic_text=&form_type=basic-form",
            wait_until="networkidle",
            timeout=30000
        )

        current_page = 1

        while True:
            # Wait for card divs to be present
            try:
                page.wait_for_selector("div.card", timeout=8000)
            except Exception:
                print(f"  No cards found on page {current_page}, stopping.")
                break

            # Extract all card stubs from current page
            card_divs = page.query_selector_all("div.card")
            for div in card_divs:
                card_id   = div.get_attribute("data-card-id") or ""
                card_name = div.get_attribute("data-card-name") or ""
                imgs_raw  = div.get_attribute("data-card-image-urls") or "[]"

                if not card_id or not card_name:
                    continue

                try:
                    img_urls = json.loads(imgs_raw)
                except Exception:
                    img_urls = []

                stubs.append({
                    "card_id":        card_id.strip(),
                    "name":           card_name.strip(),
                    "image_url":      img_urls[0] if img_urls else None,
                    "back_image_url": img_urls[1] if len(img_urls) > 1 else None,
                })

            print(f"  Page {current_page}: {len(card_divs)} cards (total so far: {len(stubs)})")

            # Try to click the next page arrow
            try:
                next_btn = page.locator('a[data-page-index]').filter(
                    has=page.locator('.pagination-page.valid-choice')
                ).last
                # Get the page index it points to
                next_index = next_btn.get_attribute("data-page-index")
                if not next_index or int(next_index) <= current_page:
                    break

                next_btn.click()
                page.wait_for_load_state("networkidle", timeout=10000)
                current_page = int(next_index)
            except Exception:
                # Try the >> arrow specifically
                try:
                    arrow = page.locator('.pagination-page.valid-choice').last
                    arrow_parent = arrow.locator("xpath=..") 
                    arrow_parent.click()
                    page.wait_for_load_state("networkidle", timeout=10000)
                    current_page += 1
                except Exception:
                    print(f"  Could not navigate to next page, stopping at page {current_page}.")
                    break

        browser.close()

    # Save checkpoint
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump(stubs, f)
    print(f"\n  Checkpoint saved: {len(stubs)} stubs -> {CHECKPOINT_FILE}")
    return stubs


# ---------------------------------------------------------------------------
# Phase 2 — infer set from card_id, scrape details, insert
# ---------------------------------------------------------------------------

def infer_set_code(card_id):
    """
    Try to match a card_id to a known set code.
    e.g. "MP01-083" -> "MP01"
         "CMF-001"  -> "CMF"
         "BaB-001"  -> "BaB"
         "MP03 Buy a Box 02" -> "BaB"  (special case)
    """
    # Try splitting on hyphen first
    parts = card_id.split("-")
    if len(parts) >= 2:
        prefix = parts[0]
        if prefix in SET_LOOKUP:
            return prefix
        # Try two-part prefix e.g. "ABC-SD01"
        two_part = "-".join(parts[:2])
        if two_part in SET_LOOKUP:
            return two_part

    # Space-separated codes like "MP03 Buy a Box 02"
    space_parts = card_id.split(" ")
    if space_parts[0] in SET_LOOKUP:
        return space_parts[0]

    # "Buy a Box" special case
    if "Buy a Box" in card_id:
        return "BaB"

    return None


def scrape_card_detail(card_id):
    """Fetch card detail page and return partial card data."""
    encoded = quote(card_id, safe="")
    url = f"{BASE_URL}/card/{encoded}/"
    try:
        resp = requests.get(
            url, timeout=12,
            headers={"User-Agent": "CCGDBBot/1.0"}
        )
        resp.raise_for_status()
    except Exception as e:
        return {}

    soup = BeautifulSoup(resp.text, "html.parser")
    data = {}

    ability_els = soup.find_all(class_="ability-text")
    if ability_els:
        data["rules_text"] = "\n".join(
            el.get_text(separator=" ", strip=True) for el in ability_els
        )

    return data


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("Force of Will TCG Ingestion")
    print("=" * 60)

    # Phase 1 — collect stubs (use checkpoint if exists)
    if CHECKPOINT_FILE.exists():
        print(f"\n[Phase 1] Checkpoint found — loading stubs from {CHECKPOINT_FILE}")
        with open(CHECKPOINT_FILE) as f:
            stubs = json.load(f)
        print(f"  Loaded {len(stubs)} stubs")
    else:
        print("\n[Phase 1] Collecting card stubs via Playwright...")
        stubs = collect_all_stubs()

    if not stubs:
        print("No stubs collected — aborting.")
        return

    # Phase 2 — scrape details and insert
    print(f"\n[Phase 2] Processing {len(stubs)} cards...")
    set_cache = {}
    total_inserted = 0
    total_skipped = 0

    with ingestion_db() as conn:
        game_id = upsert_game(conn, 'Force of Will TCG', 'fow',
                              'Force of Will — high fantasy trading card game')
        print(f"  Game ID: {game_id}")

        # Pre-create all sets
        for set_code, set_name, cluster in SETS:
            set_cache[set_code] = upsert_set(conn, game_id, set_code)
        conn.commit()

        for i, stub in enumerate(stubs):
            set_code = infer_set_code(stub["card_id"])
            if not set_code or set_code not in set_cache:
                total_skipped += 1
                continue

            set_id = set_cache[set_code]
            detail = scrape_card_detail(stub["card_id"])

            card_data = {
                "card_id":          stub["card_id"],
                "name":             stub["name"],
                "image_url":        stub.get("image_url"),
                "back_image_url":   stub.get("back_image_url"),
                "collector_number": stub["card_id"],
                "rules_text":       detail.get("rules_text"),
                "attributes":       {},
            }

            upsert_card_and_printing(conn, game_id, set_id, card_data)
            total_inserted += 1

            if (i + 1) % 200 == 0:
                conn.commit()
                print(f"  [{i+1}/{len(stubs)}] inserted: {total_inserted} skipped: {total_skipped}")

            time.sleep(0.15)

        conn.commit()
        print(f"\n  Done. Inserted: {total_inserted}  Skipped: {total_skipped}")

    print("\nForce of Will ingestion complete!")


if __name__ == "__main__":
    main()