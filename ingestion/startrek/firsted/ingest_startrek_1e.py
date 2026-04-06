import csv
import psycopg2
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[3] / '.env')

# ============================================================
# Source data — cloned from lackeyccg-stccg/startrek1e
# ============================================================
SOURCE_DIR = Path(__file__).resolve().parents[2] / 'startrek_1e_source' / 'sets'
PHYSICAL_FILE = SOURCE_DIR / 'Physical.txt'
VIRTUAL_FILE  = SOURCE_DIR / 'Virtual.txt'

# Card images are hosted at this base URL.
# Full URL = IMAGE_BASE_URL + ImageFile + '.jpg'
# Confirmed from updatelist.txt: CardGeneralURLs section.
IMAGE_BASE_URL = (
    'https://raw.githubusercontent.com/lackeyccg-stccg/startrek1e'
    '/master/sets/setimages/general/'
)

# ============================================================
# 2E set codes to skip during 1E ingestion.
# These belong to startrek_2e and are handled by migration 006
# (and eventually a dedicated ingest_startrek_2e.py script).
# Without this guard a re-run would re-create them in startrek_1e.
# ============================================================
SKIP_2E_CODES = {
    # Decipher physical 2E sets
    'se', 'en', 'ca', 'ne', 'sw', 'cl', 'tv',
    # Continuing Committee official 2E sets
    'bg', 'imd', 'ft', 'dm', 'ge', 'r2', 'ap', 'wylb',
    # Virtual 2E sets
    'ftb', 'rts',
}

# ============================================================
# Set display names and approximate release dates.
# Key = normalised primary release code (lowercase, stripped).
# Value = (display_name, release_date | None)
# ============================================================
SET_INFO = {
    # ── Physical Decipher sets (original 1E line) ─────────────────────────────
    'premiere':           ('Premiere',                         '1994-11-01'),
    'prem':               ('Premiere',                         '1994-11-01'),
    'premiere_errata':    ('Premiere',                         '1994-11-01'),
    'au':                 ('Alternate Universe',               '1995-06-01'),
    'otsd':               ('Official Tournament Sealed Deck',  '1996-01-01'),
    'qc':                 ('Q-Continuum',                      '1996-06-01'),
    'roa':                ('Rules of Acquisition',             '1996-10-01'),
    'ds9':                ('Deep Space Nine',                  '1996-10-01'),
    'ep':                 ('Enhanced Premiere',                '1996-11-01'),
    'fc':                 ('First Contact',                    '1997-02-01'),
    'ha':                 ('Holodeck Adventures',              '1997-08-01'),
    'tmp':                ('The Motion Pictures',              '1997-11-01'),
    'dom':                ('The Dominion',                     '1998-02-01'),
    'efc':                ('Enhanced First Contact',           '1998-03-01'),
    'mm':                 ('Mirror, Mirror',                   '1998-08-01'),
    'twt':                ('The Trouble with Tribbles',        '1999-01-01'),
    'bog':                ('Blaze of Glory',                   '1999-05-01'),
    'borg':               ('The Borg',                         '1999-09-01'),
    'voy':                ('Voyager',                          '2000-03-01'),
    'voy_errata':         ('Voyager',                          '2000-03-01'),
    'gift':               ('Betazoid Gift Box',                None),
    'warp':               ('Warp Pack',                        None),
    'wp2017':             ('Warp Pack 2017',                   '2017-01-01'),
    'faj':                ("Fajo's Gallery",                   None),
    'sdii':               ('Starter Deck II',                  None),
    'armade':             ('Armada',                           None),
    'errata':             ('Errata',                           None),
    '2pg':                ('Two-Player Game',                  None),
    '2anth':              ('Two-Player Anthology',             None),
    'p':                  ('Promotional',                      None),
    'promos':             ('Promotional',                      None),
    # ── 2E crossover sets (Decipher 2E physical sets, cross-playable in 1E) ──
    'se':                 ('Second Edition (2E)',              '2002-09-04'),
    'en':                 ('Energize (2E)',                    '2003-09-03'),
    'ca':                 ('Call to Arms (2E)',                '2003-11-05'),
    'ne':                 ('Necessary Evil (2E)',              '2004-10-20'),
    'sw':                 ('Strange New Worlds (2E)',          '2005-08-12'),
    'cl':                 ("Captain's Log (2E)",               '2005-10-12'),
    'tv':                 ('These Are the Voyages (2E)',       '2006-09-14'),
    'bg':                 ('To Boldly Go (2E)',                '2007-01-01'),
    'imd':                ('In a Mirror, Darkly (2E)',         '2008-04-01'),
    'ft':                 ('Fractured Time (2E)',              '2009-05-01'),
    'dm':                 ('Dangerous Missions (2E)',          '2009-01-01'),
    'ge':                 ('Genesis (2E)',                     '2009-08-01'),
    'r2':                 ('Reflections 2.0 (2E)',             '2011-03-01'),
    'ap':                 ('A Private Little War (2E)',        '2011-09-01'),
    'wylb':               ('What You Leave Behind (2E)',       '2012-01-01'),
    'x':                  ('Crossover Supplement',             None),
    # ── Virtual 1E fan expansions (community-created) ─────────────────────────
    'agt':                ('A Call to Arms',                   None),
    'maquis':             ('The Maquis',                       None),
    'emissary':           ('Emissary+',                        None),
    'tngsup':             ('TNG Supplemental',                 None),
    'tng':                ('TNG Supplemental',                 None),
    'chainofcommand':     ('Chain of Command',                 None),
    'identitycrisis':     ('Identity Crisis',                  None),
    'identity crisis':    ('Identity Crisis',                  None),  # normalise space variant
    'crossover':          ('Crossover',                        None),
    'engage':             ('Engage',                           None),
    'homefront':          ('Homefront',                        None),
    'homefront2':         ('Homefront II',                     None),
    'homefront3':         ('Homefront III',                    None),
    'homefront4':         ('Homefront IV',                     None),
    'homefront5':         ('Homefront V',                      None),
    'homefront6':         ('Homefront VI',                     None),
    'vpromos':            ('Virtual Promos',                   None),
    'vp':                 ('Virtual Promos',                   None),
    'tuc':                ('The Undiscovered Country',         None),
    'comingofag':         ('Coming of Age',                    None),
    'thingspast':         ('Things Past',                      None),
    'lookinggla':         ('Looking Glass',                    None),
    'enterprise':         ('Enterprise',                       None),
    'enterprise.ecr':     ('Enterprise',                       None),  # errata printing
    'brokenbow':          ('Broken Bow',                       None),
    'coldfront':          ('Cold Front',                       None),
    'terran':             ('Terran Empire',                    None),
    'rif':                ('Referee Instruction Foils',        None),
    'awayteam':           ('Away Team Pack',                   None),
    'tgq':                ('The Gamma Quadrant',               None),
    'tgq_errata':         ('The Gamma Quadrant',               None),
    'sas':                ('Shades and Shadows',               None),
    'sog':                ('Shades of Gray',                   None),
    'prewarp':            ('Pre-Warp Pack',                    None),
    'wpemissary':         ('Warp Pack Emissary',               None),
    '50':                 ('50th Anniversary',                 None),
    'lfl':                ('Life from Lifelessness',           None),
    'llap':               ('Live Long and Prosper',            None),
    'llap_errata':        ('Live Long and Prosper',            None),
    'ftb':                ('Fractured Time (2E Virtual)',      None),
    'rts':                ('Raise the Stakes (2E Virtual)',    None),
    'metamorpho':         ('Metamorphosis',                    None),
    'tstl':               ('The Sting That Lasts',             None),
    'xx':                 ('Crossover Supplement',             None),
}

# Columns in Physical.txt / Virtual.txt (tab-separated, 0-indexed)
COL_NAME         = 'Name'
COL_SET          = 'Set'
COL_IMAGE        = 'ImageFile'
COL_RELEASE      = 'Release'
COL_INFO         = 'Info'
COL_PROPERTY     = 'Property'
COL_UNIQUENESS   = 'Uniqueness'
COL_TYPE         = 'Type'
COL_DILEMMA_TYPE = 'Mission/ Dilemma Type'
COL_AFFIL        = 'Affil'
COL_CLASS        = 'Class'
COL_INT_RNG      = 'Int/Rng'
COL_CUN_WPN      = 'Cun/Wpn'
COL_STR_SHD      = 'Str/Shd'
COL_POINTS       = 'Points'
COL_REGION       = 'Region'
COL_QUADRANT     = 'Quadrant'
COL_SPAN         = 'Span'
COL_ICONS        = 'Icons'
COL_STAFF        = 'Staff'
COL_CHARS        = 'Characteristics/ Keywords'
COL_REQUIRES     = 'Requires'
COL_PERSONA      = 'Persona'
COL_COMMAND      = 'Command'
COL_REPORTS      = 'Reports'
COL_NAMES        = 'Names'
COL_TEXT         = 'Text'


def get_db_connection():
    return psycopg2.connect(
        host='localhost',
        database=os.getenv('POSTGRES_DB'),
        user=os.getenv('POSTGRES_USER'),
        password=os.getenv('POSTGRES_PASSWORD'),
    )


def upsert_game(conn):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO games (name, slug, description)
            VALUES (
                'Star Trek CCG (First Edition)',
                'startrek_1e',
                'Star Trek: The Next Generation Customizable Card Game First Edition by Decipher Inc.'
            )
            ON CONFLICT (slug) DO NOTHING
            RETURNING id;
        """)
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM games WHERE slug = 'startrek_1e'")
        return cur.fetchone()[0]


def get_set_display_info(release_raw):
    """Return (set_code, display_name, release_date) from a raw Release value."""
    primary = release_raw.split(',')[0].strip().lower()
    if primary in SET_INFO:
        name, date = SET_INFO[primary]
        return primary, name, date
    # Fall back to a cleaned-up title
    display = primary.replace('_', ' ').replace('-', ' ').title()
    return primary, display, None


def upsert_set(conn, game_id, set_code, set_name, release_date, set_type):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sets (game_id, name, code, release_date, set_type)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (game_id, code) DO UPDATE
                SET name         = EXCLUDED.name,
                    set_type     = EXCLUDED.set_type,
                    release_date = COALESCE(sets.release_date, EXCLUDED.release_date)
            RETURNING id;
        """, (game_id, set_name, set_code, release_date, set_type))
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM sets WHERE code = %s AND game_id = %s",
                    (set_code, game_id))
        row = cur.fetchone()
        return row[0] if row else None


def parse_rarity(info):
    """Parse '110 R+' → 'R+', '069 C' → 'C', '21 V' → 'V'."""
    parts = info.strip().split(' ', 1)
    return parts[1].strip() if len(parts) > 1 else None


def upsert_card(conn, game_id, set_id, row, is_virtual):
    def _get(col):
        """Safe getter — returns empty string for missing or None values."""
        return (row.get(col) or '').strip()

    image_file = _get(COL_IMAGE)
    if not image_file:
        return  # No image file means no valid external_id — skip

    external_id = image_file
    image_url   = IMAGE_BASE_URL + image_file + '.jpg'

    name = _get(COL_NAME)
    if not name:
        return

    card_type    = _get(COL_TYPE) or None
    dilemma_type = _get(COL_DILEMMA_TYPE)
    if dilemma_type and card_type:
        card_type = f"{card_type} — {dilemma_type}"

    rules_text = _get(COL_TEXT) or None

    attributes = {
        'property':         _get(COL_PROPERTY)   or None,
        'uniqueness':       _get(COL_UNIQUENESS)  or None,
        'affiliation':      _get(COL_AFFIL)       or None,
        'classification':   _get(COL_CLASS)       or None,
        'integrity_range':  _get(COL_INT_RNG)     or None,
        'cunning_weapons':  _get(COL_CUN_WPN)     or None,
        'strength_shields': _get(COL_STR_SHD)     or None,
        'points':           _get(COL_POINTS)      or None,
        'region':           _get(COL_REGION)      or None,
        'quadrant':         _get(COL_QUADRANT)    or None,
        'span':             _get(COL_SPAN)        or None,
        'icons':            _get(COL_ICONS)       or None,
        'staff':            _get(COL_STAFF)       or None,
        'characteristics':  _get(COL_CHARS)       or None,
        'requires':         _get(COL_REQUIRES)    or None,
        'persona':          _get(COL_PERSONA)     or None,
        'command':          _get(COL_COMMAND)     or None,
        'reports_to':       _get(COL_REPORTS)     or None,
        'alt_names':        _get(COL_NAMES)       or None,
        'is_virtual':       is_virtual,
    }
    # Strip None values to keep JSONB clean
    attributes = {k: v for k, v in attributes.items() if v is not None and v != ''}

    rarity = parse_rarity(_get(COL_INFO))

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO cards (game_id, name, rules_text, card_type, attributes, external_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (game_id, external_id) DO UPDATE
                SET attributes  = EXCLUDED.attributes,
                    rules_text  = EXCLUDED.rules_text,
                    card_type   = EXCLUDED.card_type
            RETURNING id;
        """, (
            game_id,
            name,
            rules_text,
            card_type,
            json.dumps(attributes),
            external_id,
        ))
        result = cur.fetchone()
        if result:
            card_id = result[0]
        else:
            cur.execute("SELECT id FROM cards WHERE external_id = %s AND game_id = %s",
                        (external_id, game_id))
            row_db = cur.fetchone()
            if not row_db:
                return
            card_id = row_db[0]

        # Star Trek 1E has no collector numbers, so the standard
        # UNIQUE (card_id, set_id, collector_number) constraint won't
        # protect against duplicates (NULL != NULL in Postgres).
        # Use a WHERE NOT EXISTS guard to stay idempotent on re-runs.
        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, image_url)
            SELECT %s, %s, %s, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM printings
                WHERE card_id = %s AND set_id = %s
            );
        """, (card_id, set_id, rarity, image_url, card_id, set_id))


def process_file(conn, game_id, filepath, is_virtual, set_cache):
    """Parse a Physical.txt or Virtual.txt file and ingest all cards."""
    label    = 'Virtual' if is_virtual else 'Physical'
    set_type = 'virtual'  if is_virtual else 'official'
    print(f'\nProcessing {label} cards from {filepath.name}...')

    skipped = 0
    ingested = 0

    with open(filepath, encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f, delimiter='\t')

        for i, row in enumerate(reader):
            name        = (row.get(COL_NAME)    or '').strip()
            release_raw = (row.get(COL_RELEASE) or '').strip()
            image_file  = (row.get(COL_IMAGE)   or '').strip()

            # Skip rows missing essential fields (data quality guard)
            if not name or not release_raw or not image_file:
                skipped += 1
                continue

            # Resolve set
            set_code, set_name, release_date = get_set_display_info(release_raw)

            # Skip 2E sets — they belong to startrek_2e (see SKIP_2E_CODES)
            if set_code in SKIP_2E_CODES:
                skipped += 1
                continue

            if set_code not in set_cache:
                set_id = upsert_set(conn, game_id, set_code, set_name, release_date, set_type)
                set_cache[set_code] = set_id
            else:
                set_id = set_cache[set_code]

            if not set_id:
                skipped += 1
                continue

            upsert_card(conn, game_id, set_id, row, is_virtual)
            ingested += 1

            if (ingested % 500) == 0:
                conn.commit()
                print(f'  [{ingested}] cards committed...')

    conn.commit()
    print(f'  Done — {ingested} ingested, {skipped} skipped.')
    return ingested


def main():
    print('Starting Star Trek CCG First Edition ingestion...')
    conn = get_db_connection()

    try:
        game_id = upsert_game(conn)
        print(f'Game ID for Star Trek 1E: {game_id}')

        set_cache = {}  # set_code → set_id, shared across both files

        total = 0
        total += process_file(conn, game_id, PHYSICAL_FILE, is_virtual=False, set_cache=set_cache)
        total += process_file(conn, game_id, VIRTUAL_FILE,  is_virtual=True,  set_cache=set_cache)

        print(f'\nStar Trek CCG 1E ingestion complete — {total} total cards across {len(set_cache)} sets.')

    except Exception as e:
        conn.rollback()
        print(f'Error: {e}')
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
