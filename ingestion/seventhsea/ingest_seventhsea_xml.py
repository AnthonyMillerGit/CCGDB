"""
7th Sea CCG — XML set ingestion (supplementary)
================================================
Ingests the sets that have no ODS spreadsheet — only a set.xml in the OCTGN
plugin repo.  Run AFTER ingest_seventhsea.py so the game and core sets already
exist.

Sets covered:
  No Quarter   (NQ)   — original base set; 6 unique cards vs Broadsides
  Black Sails  (BLKS) — small fixed-distribution expansion (29 cards)
  Fate's Debt  (FD)   — expansion (106 cards)
  Iron Shadow  (IS)   — large expansion / consolidated set (618 cards)
  Syrneth Secret (SYN) — expansion (161 cards)
  Promo        (PROMO) — promotional cards (26 cards)
"""

import xml.etree.ElementTree as ET
import json
import os

from pathlib import Path
from dotenv import load_dotenv
import psycopg2

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

# ============================================================
# Paths
# ============================================================
SETS_DIR = (
    Path(__file__).resolve().parent
    / 'octgn_source' / 'o8g' / 'Sets'
)
IMAGE_BASE_URL = os.getenv('ASSET_BASE_URL', 'http://localhost:8000/assets') + '/cards/seventhsea/'

# ============================================================
# Sets to ingest from XML
# key = folder name in SETS_DIR
# value = (code, display_name, release_date, set_type)
# ============================================================
XML_SETS = {
    'No Quarter':     ('NQ',    'No Quarter',     '1999-08-01', 'official'),
    'Black Sails':    ('BLKS',  'Black Sails',    '2000-01-01', 'official'),
    "Fate's Debt":    ('FD',    "Fate's Debt",    '2000-01-01', 'official'),
    'Iron Shadow':    ('IS',    'Iron Shadow',     '2001-01-01', 'official'),
    'Syrneth Secret': ('SYN',   'Syrneth Secret', '2002-01-01', 'official'),
    'Promo':          ('PROMO', 'Promo',           None,         'official'),
}

# XML property name → internal key
PROP_MAP = {
    'Rarity':        'rarity',
    'Type':          'card_type',
    'Cost':          'cost',
    'Cost Type':     'cost_type',
    'Cancel':        'cancel',
    'Cancel Type':   'cancel_type',
    'Wealth':        'wealth',
    'Attack':        'attack',
    'Parry':         'parry',
    'Cannon':        'cannon',
    'Sailing':       'sailing',
    'Adventuring':   'adventuring',
    'Influence':     'influence',
    'Swashbuckling': 'swashbuckling',
    'Crew Max':      'crew_max',
    'Move Cost':     'move_cost',
    'Faction':       'faction',
    'Text':          'text',
}


# ============================================================
# Database helpers
# ============================================================

def get_game_id(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM games WHERE slug = 'seventhsea'")
        row = cur.fetchone()
        if not row:
            raise RuntimeError(
                "seventhsea game not found — run ingest_seventhsea.py first"
            )
        return row[0]


def upsert_set(conn, game_id, code, name, release_date, set_type):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, release_date, set_type)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET name         = EXCLUDED.name,
                    set_type     = EXCLUDED.set_type,
                    release_date = COALESCE(sets.release_date, EXCLUDED.release_date)
            RETURNING id
        """, (game_id, name, code, release_date, set_type))
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM sets WHERE game_id = %s AND code = %s",
                    (game_id, code))
        return cur.fetchone()[0]


def upsert_card(conn, game_id, uuid, name, card_type, rules_text, attributes):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO cards (game_id, name, card_type, rules_text, external_id, attributes)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (game_id, external_id) DO UPDATE
                SET name       = EXCLUDED.name,
                    card_type  = EXCLUDED.card_type,
                    rules_text = EXCLUDED.rules_text,
                    attributes = EXCLUDED.attributes
            RETURNING id
        """, (game_id, name, card_type, rules_text, uuid, json.dumps(attributes)))
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute(
            "SELECT id FROM cards WHERE game_id = %s AND external_id = %s",
            (game_id, uuid))
        return cur.fetchone()[0]


def upsert_printing(conn, card_id, set_id, rarity, image_url):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE printings SET image_url = %s, rarity = %s
            WHERE card_id = %s AND set_id = %s
        """, (image_url, rarity, card_id, set_id))
        if cur.rowcount == 0:
            cur.execute("""
                INSERT INTO printings (card_id, set_id, rarity, image_url)
                VALUES (%s, %s, %s, %s)
            """, (card_id, set_id, rarity, image_url))


# ============================================================
# Processing
# ============================================================

def parse_card(card_el):
    """Extract fields from a <card> XML element."""
    props = {p.get('name'): p.get('value', '') for p in card_el.findall('property')}

    rules_text  = props.get('Text', '')
    card_type   = props.get('Type', '')
    rarity      = props.get('Rarity', '')

    attributes = {}
    for xml_key, internal_key in PROP_MAP.items():
        if xml_key in ('Type', 'Text'):  # stored as top-level fields
            continue
        val = props.get(xml_key, '')
        if val:
            attributes[internal_key] = val

    return card_type, rules_text, rarity, attributes


def process_set(conn, game_id, folder_name):
    code, display_name, release_date, set_type = XML_SETS[folder_name]
    xml_path = SETS_DIR / folder_name / 'set.xml'

    if not xml_path.exists():
        print(f'  WARNING: {xml_path} not found — skipping')
        return

    print(f'\nProcessing "{folder_name}"  →  code={code}  ({set_type}) ...')

    tree = ET.parse(xml_path)
    root = tree.getroot()
    cards = root.findall('.//card')

    set_id = upsert_set(conn, game_id, code, display_name, release_date, set_type)

    ingested = skipped = 0
    for card_el in cards:
        uuid = card_el.get('id', '').strip()
        name = card_el.get('name', '').strip()

        if not uuid or not name:
            skipped += 1
            continue

        card_type, rules_text, rarity, attributes = parse_card(card_el)
        image_url = IMAGE_BASE_URL + uuid + '.jpg'

        card_id = upsert_card(conn, game_id, uuid, name, card_type,
                              rules_text, attributes)
        upsert_printing(conn, card_id, set_id, rarity, image_url)
        ingested += 1

    conn.commit()
    print(f'  Done: {ingested} ingested, {skipped} skipped.')


def backfill_no_quarter(conn, game_id):
    """
    No Quarter is the original base set; Broadsides is its near-identical
    reprint.  The OCTGN XML only stores the 6 cards unique to NQ, so we copy
    every Broadsides printing into No Quarter so collectors can track NQ cards
    separately from their Broadsides counterparts.
    """
    print('\nBackfilling No Quarter with Broadsides card pool...')
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url)
            SELECT p.card_id,
                   nq.id,
                   p.rarity,
                   p.image_url
            FROM printings p
            JOIN sets bs ON bs.id = p.set_id
            CROSS JOIN (
                SELECT id FROM sets
                WHERE code = 'NQ'
                  AND game_id = %s
            ) nq
            WHERE bs.code = 'BS'
              AND bs.game_id = %s
              AND NOT EXISTS (
                  SELECT 1 FROM printings p2
                  WHERE p2.card_id = p.card_id
                    AND p2.set_id = nq.id
              )
        """, (game_id, game_id))
        copied = cur.rowcount
    conn.commit()
    print(f'  Copied {copied} Broadsides printings into No Quarter.')


def main():
    conn = psycopg2.connect(
        host='localhost',
        database=os.getenv('POSTGRES_DB'),
        user=os.getenv('POSTGRES_USER'),
        password=os.getenv('POSTGRES_PASSWORD'),
    )

    try:
        game_id = get_game_id(conn)
        print(f'7th Sea CCG game_id: {game_id}')

        for folder_name in XML_SETS:
            process_set(conn, game_id, folder_name)

        # No Quarter shares its card pool with Broadsides — copy those printings
        backfill_no_quarter(conn, game_id)

        conn.commit()
        print('\nXML ingestion complete!')

    except Exception as e:
        conn.rollback()
        print(f'Error: {e}')
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
