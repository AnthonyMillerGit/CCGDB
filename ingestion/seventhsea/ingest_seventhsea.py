"""
7th Sea CCG ingestion script
============================
Source data: ODS spreadsheets from the 7th Sea OCTGN plugin
  (stevetotheizz0/7thSea-for-OCTGN → "set spreadsheets" folder)

Setup:
  1. Copy all 8 .ods files into:
         ingestion/seventhsea/source/
     (BS.ods  CC.ods  HE.ods  PS.ods  RF.ods  SS.ods  ST.ods  SV.ods)
  2. Card images:
     Place extracted card images into:
         frontend/public/cards/seventhsea/
     They are inside the image pack .o8c files (rename .o8c → .zip, extract).
     OR update IMAGE_BASE_URL below to a remote host if images are served online.
  3. Run:  python3 ingest_seventhsea.py
"""

import json
import os
from pathlib import Path
from dotenv import load_dotenv
import psycopg2

# ── odfpy for reading .ods files ──────────────────────────────────────────────
try:
    from odf.opendocument import load as ods_load
    from odf.table import Table, TableRow, TableCell
    from odf.text import P
except ImportError:
    raise SystemExit("Install odfpy:  pip install odfpy --break-system-packages")

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

# ============================================================
# Paths
# ============================================================
SOURCE_DIR = Path(__file__).resolve().parent / 'source'

# ============================================================
# Image URL base — reads ASSET_BASE_URL from .env.
# Dev default:  http://localhost:8000/assets
# Production:   https://your-bucket.s3.amazonaws.com
# Images live at {ASSET_BASE_URL}/cards/seventhsea/{uuid}.jpg
# ============================================================
IMAGE_BASE_URL = os.getenv('ASSET_BASE_URL', 'http://localhost:8000/assets') + '/cards/seventhsea/'

# ============================================================
# Column indices (0-based) within each ODS data row.
# Cols 0-2 are OCTGN metadata; card data begins at col 3.
# ============================================================
COL_UUID            = 2   # OCTGN card UUID — used as external_id AND image filename
COL_FILENAME        = 3   # e.g. "HE_alesiossacrifice"  → gives set code
COL_NAME            = 4
COL_RARITY          = 5   # C / U / R / F / V / VP
COL_TYPE            = 6   # crew / attachments / actions / adventures / ships / chanteys
COL_COST            = 7   # numeric hire/play cost
COL_COST_TYPE       = 8   # resource type abbreviation (In=Influence, etc.)
COL_CANCEL          = 9   # cancel cost amount
COL_CANCEL_TYPE     = 10  # cancel cost type
COL_WEALTH          = 11
COL_ATTACK          = 12  # crew: weapon type (P=Pistol, etc.); others: varies
COL_PARRY           = 13  # crew: cancel method; others: varies
COL_CANNON          = 14
COL_SAILING         = 15
COL_ADVENTURING     = 16
COL_INFLUENCE       = 17
COL_SWASHBUCKLING   = 18
COL_CREW_MAX        = 19  # ships
COL_MOVE_COST       = 20  # ships
COL_FACTION         = 21
COL_TEXT            = 22

# ============================================================
# Set info: code → (display name, release date, set_type)
# CC = Cabora's Coast is a community fan expansion.
# All others are official AEG releases.
# ============================================================
SET_INFO = {
    'BS': ('Broadsides',       '1999-01-01', 'official'),   # Base set reprint
    'CC': ("Cabora's Coast",   None,         'community'),  # Fan expansion
    'HE': ("Horizon's Edge",   '2001-01-01', 'official'),
    'PS': ('Parting Shot',     '2002-01-01', 'official'),
    'RF': ("Reaper's Fee",     '2001-06-01', 'official'),
    'SS': ('Scarlet Seas',     '2000-01-01', 'official'),
    'ST': ('Shifting Tides',   '1999-12-01', 'official'),
    'SV': ('Strange Vistas',   '1999-12-01', 'official'),
}


# ============================================================
# ODS parsing helpers
# ============================================================

def _cell_text(cell):
    """Extract plain text from an ODS TableCell, traversing nested elements."""
    ps = cell.getElementsByType(P)
    parts = []
    for p in ps:
        text = ''
        for node in p.childNodes:
            if hasattr(node, 'data'):
                text += node.data
            elif hasattr(node, 'childNodes'):
                for child in node.childNodes:
                    if hasattr(child, 'data'):
                        text += child.data
        parts.append(text)
    return ' '.join(parts).strip()


def _row_values(row, max_cols=25):
    """
    Return a list of cell values, properly expanding
    'table:number-columns-repeated' spans so indices align with headers.
    """
    result = []
    for cell in row.getElementsByType(TableCell):
        repeat = int(cell.getAttribute('numbercolumnsrepeated') or 1)
        val = _cell_text(cell)
        for _ in range(repeat):
            result.append(val)
            if len(result) >= max_cols:
                return result
    return result


def _col(vals, idx):
    """Safely get a column value; return '' if out of range."""
    return vals[idx].strip() if idx < len(vals) else ''


# ============================================================
# Database helpers
# ============================================================

def get_or_create_game(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM games WHERE slug = 'seventhsea'")
        row = cur.fetchone()
        if row:
            return row[0]
        cur.execute("""
            INSERT INTO games (name, slug, description, card_back_image)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (
            '7th Sea CCG',
            'seventhsea',
            '7th Sea Collectible Card Game (1999–2002) by Alderac Entertainment Group, '
            'set in the swashbuckling world of Théah.  Continued by community fans.',
            '/card-backs/seventhsea.jpg',
        ))
        return cur.fetchone()[0]


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


def upsert_card(conn, game_id, vals):
    """Insert or update a card. Returns card_id."""
    external_id = _col(vals, COL_UUID)       # OCTGN UUID — stable unique key
    name        = _col(vals, COL_NAME)
    card_type   = _col(vals, COL_TYPE)
    rules_text  = _col(vals, COL_TEXT)

    attributes = {
        'rarity':        _col(vals, COL_RARITY),
        'cost':          _col(vals, COL_COST),
        'cost_type':     _col(vals, COL_COST_TYPE),
        'cancel':        _col(vals, COL_CANCEL),
        'cancel_type':   _col(vals, COL_CANCEL_TYPE),
        'wealth':        _col(vals, COL_WEALTH),
        'attack':        _col(vals, COL_ATTACK),
        'parry':         _col(vals, COL_PARRY),
        'cannon':        _col(vals, COL_CANNON),
        'sailing':       _col(vals, COL_SAILING),
        'adventuring':   _col(vals, COL_ADVENTURING),
        'influence':     _col(vals, COL_INFLUENCE),
        'swashbuckling': _col(vals, COL_SWASHBUCKLING),
        'crew_max':      _col(vals, COL_CREW_MAX),
        'move_cost':     _col(vals, COL_MOVE_COST),
        'faction':       _col(vals, COL_FACTION),
    }
    # Drop empty strings to keep JSONB lean
    attributes = {k: v for k, v in attributes.items() if v}

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
        """, (game_id, name, card_type, rules_text, external_id,
              json.dumps(attributes)))
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute(
            "SELECT id FROM cards WHERE game_id = %s AND external_id = %s",
            (game_id, external_id))
        return cur.fetchone()[0]


def upsert_printing(conn, card_id, set_id, rarity, image_url):
    with conn.cursor() as cur:
        # Try updating first; if no row exists, insert
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

def process_ods(conn, game_id, ods_path, set_cache):
    """Process a single ODS spreadsheet file."""
    set_code = ods_path.stem.upper()   # e.g. "HE" from "HE.ods"

    if set_code not in SET_INFO:
        print(f'  WARNING: No SET_INFO entry for code {set_code!r} — skipping {ods_path.name}')
        return

    set_name, release_date, set_type = SET_INFO[set_code]
    print(f'\nProcessing {ods_path.name}  →  "{set_name}" ({set_type}) ...')

    doc = ods_load(str(ods_path))
    sheet = doc.spreadsheet.getElementsByType(Table)[0]
    all_rows = sheet.getElementsByType(TableRow)

    # Row 0 is the header; skip it
    data_rows = all_rows[1:]

    if set_code not in set_cache:
        set_id = upsert_set(conn, game_id, set_code, set_name, release_date, set_type)
        set_cache[set_code] = set_id
    else:
        set_id = set_cache[set_code]

    ingested = skipped = 0

    for row in data_rows:
        vals = _row_values(row)

        uuid     = _col(vals, COL_UUID)
        filename = _col(vals, COL_FILENAME)
        name     = _col(vals, COL_NAME)

        # Skip rows without a valid UUID or name
        if not uuid or not name:
            skipped += 1
            continue

        # Images in the OCTGN bundle (7thSea-Sets-Bundle.o8c) are named by UUID
        image_url = IMAGE_BASE_URL + uuid + '.jpg'

        rarity  = _col(vals, COL_RARITY)
        card_id = upsert_card(conn, game_id, vals)
        upsert_printing(conn, card_id, set_id, rarity, image_url)

        ingested += 1

    conn.commit()
    print(f'  Done: {ingested} ingested, {skipped} skipped.')


def main():
    ods_files = sorted(SOURCE_DIR.glob('*.ods'))
    if not ods_files:
        raise SystemExit(
            f'No .ods files found in {SOURCE_DIR}\n'
            'Copy the 8 spreadsheets from the OCTGN plugin into that folder first.'
        )

    conn = psycopg2.connect(
        host='localhost',
        database=os.getenv('POSTGRES_DB'),
        user=os.getenv('POSTGRES_USER'),
        password=os.getenv('POSTGRES_PASSWORD'),
    )

    try:
        game_id = get_or_create_game(conn)
        conn.commit()
        print(f'7th Sea CCG game_id: {game_id}')

        set_cache = {}
        for ods_path in ods_files:
            process_ods(conn, game_id, ods_path, set_cache)

        conn.commit()
        print('\nIngestion complete!')
        print(f'Sets processed: {list(set_cache.keys())}')

    except Exception as e:
        conn.rollback()
        print(f'Error: {e}')
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
