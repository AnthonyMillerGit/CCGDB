import csv
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from common import upsert_game, ingestion_db

# ============================================================
# Source data — cloned from lackeyccg-stccg/startrek2e
# ============================================================
SOURCE_DIR = Path(__file__).resolve().parents[2] / 'startrek_2e_source' / 'sets'
PHYSICAL_FILE = SOURCE_DIR / 'Physical.txt'
VIRTUAL_FILE  = SOURCE_DIR / 'Virtual.txt'

# Card images hosted at this base URL (confirmed from updatelist.txt)
IMAGE_BASE_URL = (
    'https://raw.githubusercontent.com/lackeyccg-stccg/startrek2e'
    '/master/sets/setimages/general/'
)

# ============================================================
# Column indices (0-based) — 2E format differs from 1E
# ============================================================
COL_NAME        = 'Name'
COL_SET         = 'Set'
COL_IMAGE       = 'ImageFile'
COL_RARITY      = 'Rarity'
COL_UNIQUE      = 'Unique'
COL_COLLECTOR   = 'CollectorsInfo'
COL_TYPE        = 'Type'
COL_COST        = 'Cost'
COL_MISSION     = 'Mission/DilemmaType'
COL_SPAN        = 'Span'
COL_POINTS      = 'Points'
COL_QUADRANT    = 'Quadrant'
COL_AFFIL       = 'Affiliation'
COL_ICONS       = 'Icons'
COL_STAFF       = 'Staff'
COL_KEYWORDS    = 'Keywords'
COL_CLASS       = 'Class'
COL_SPECIES     = 'Species'
COL_SKILLS      = 'Skills'
COL_INT_RNG     = 'Integrity/Range'
COL_CUN_WPN     = 'Cunning/Weapons'
COL_STR_SHD     = 'Strength/Shields'
COL_TEXT        = 'Text'

# ============================================================
# Set display names and release dates.
# Keys are lowercase versions of the Set column value.
# ============================================================
SET_INFO = {
    # ── Decipher physical 2E sets ────────────────────────────────────────────
    'se':    ('Second Edition',        '2002-09-04'),
    'en':    ('Energize',              '2003-09-03'),
    'ca':    ('Call to Arms',          '2003-11-05'),
    'ne':    ('Necessary Evil',        '2004-10-20'),
    'sw':    ('Strange New Worlds',    '2005-08-12'),
    'cl':    ("Captain's Log",         '2005-10-12'),
    'tv':    ('These Are the Voyages', '2006-09-14'),
    # ── Continuing Committee official physical sets ───────────────────────────
    'bg':    ('To Boldly Go',          '2007-01-01'),
    'imd':   ('In a Mirror, Darkly',   '2008-04-01'),
    'ft':    ('Fractured Time',        '2009-05-01'),
    'dm':    ('Dangerous Missions',    '2009-01-01'),
    'ge':    ('Genesis',               '2009-08-01'),
    'r2':    ('Reflections 2.0',       '2011-03-01'),
    'ap':    ('A Private Little War',  '2011-09-01'),
    'wylb':  ('What You Leave Behind', '2012-01-01'),
    'x':     ('Crossover Supplement',  None),
    'vap':   ('Virtual A Private Little War', None),
    # ── Community virtual sets ───────────────────────────────────────────────
    'vp':       ('Virtual Promos',          None),
    'ftb':      ('Fractured Time B',        None),
    'tuc':      ('The Undiscovered Country', '2013-01-01'),
    'id':       ('Infinite Diversity',      '2010-01-01'),
    'idr':      ('Infinite Diversity Remastered', None),
    'rts':      ('Raise the Stakes',        '2010-01-01'),
    'alg':      ('Allegiances',             '2011-01-01'),
    'unity':    ('Unity',                   '2013-01-01'),
    'lineage':  ('Lineage',                 '2013-01-01'),
    'tapestry': ('Tapestry',               '2014-01-01'),
    'mot':      ('Matter of Time',          '2015-01-01'),
    'atts':     ('A Time to Stand',         '2016-01-01'),
    'fote':     ('Face of the Enemy',       '2017-01-01'),
    'bot':      ('Back to Basics',          None),
    'ht':       ('Home Turf',               None),
    'zh':       ('Zero Hour',               None),
    'ld':       ('Light and Dark',          None),
    'nd':       ('New Directions',          None),
    'sy':       ('Symbiosis',               None),
    'fbts':     ('From Both Sides',         None),
    'us':       ('Unity Supplement',        None),
    'titw':     ('There Is the Window',     None),
    'tosp':     ('The Other Side of Paradise', None),
    'sb':       ('Second Chances',          None),
    'leg':      ('Legacy',                  None),
    'rtg':      ('Return to Grace',         None),
    'wpad':     ('Warp Pack A Day',         None),
    'xx':       ('Crossover Supplement',    None),
    'ds':       ('Discovery',               None),
    'em':       ('Emergence',               None),
    'pp':       ('Probing Protocols',       None),
    '50':       ('50th Anniversary',        None),
}

# Decipher physical sets get set_type='official'; CC physical = 'community'
DECIPHER_SETS = {'se', 'en', 'ca', 'ne', 'sw', 'cl', 'tv'}


def _get(row, col):
    """Return a stripped string, never None."""
    return (row.get(col) or '').strip()


def get_set_info(raw_code):
    """Normalise the Set column to a lowercase key and look up display name."""
    code = raw_code.strip().lower()
    if code in SET_INFO:
        name, release_date = SET_INFO[code]
    else:
        # Fallback: title-case the code
        name = raw_code.strip().title()
        release_date = None
    return code, name, release_date




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


def upsert_card(conn, game_id, row):
    """Insert or update a card record. Returns card_id."""
    name       = _get(row, COL_NAME)
    image_file = _get(row, COL_IMAGE)
    card_type  = _get(row, COL_TYPE)
    text       = _get(row, COL_TEXT)
    external_id = image_file  # unique per card printing

    attributes = {
        'affiliation':      _get(row, COL_AFFIL),
        'cost':             _get(row, COL_COST),
        'skills':           _get(row, COL_SKILLS),
        'integrity_range':  _get(row, COL_INT_RNG),
        'cunning_weapons':  _get(row, COL_CUN_WPN),
        'strength_shields': _get(row, COL_STR_SHD),
        'span':             _get(row, COL_SPAN),
        'points':           _get(row, COL_POINTS),
        'quadrant':         _get(row, COL_QUADRANT),
        'icons':            _get(row, COL_ICONS),
        'staff':            _get(row, COL_STAFF),
        'keywords':         _get(row, COL_KEYWORDS),
        'class':            _get(row, COL_CLASS),
        'species':          _get(row, COL_SPECIES),
        'mission_type':     _get(row, COL_MISSION),
        'is_unique':        _get(row, COL_UNIQUE) == 'Y',
    }
    # Drop empty strings to keep JSONB lean
    attributes = {k: v for k, v in attributes.items() if v != '' and v is not None}

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
        """, (game_id, name, card_type, text, external_id, json.dumps(attributes)))
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute(
            "SELECT id FROM cards WHERE game_id = %s AND external_id = %s",
            (game_id, external_id))
        return cur.fetchone()[0]


def upsert_printing(conn, card_id, set_id, rarity, collector_number, image_url):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO printings (card_id, set_id, rarity, collector_number, image_url)
            SELECT %s, %s, %s, %s, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM printings
                WHERE card_id = %s AND set_id = %s
            )
        """, (card_id, set_id, rarity, collector_number, image_url,
              card_id, set_id))


def process_file(conn, game_id, filepath, is_virtual, set_cache):
    label    = 'Virtual' if is_virtual else 'Physical'
    set_type_virtual = 'virtual'

    print(f'\nProcessing {label} cards from {filepath.name}...')
    skipped = ingested = 0

    with open(filepath, encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f, delimiter='\t')

        for row in reader:
            name       = _get(row, COL_NAME)
            set_raw    = _get(row, COL_SET)
            image_file = _get(row, COL_IMAGE)

            if not name or not set_raw or not image_file:
                skipped += 1
                continue

            # Resolve set
            set_code, set_name, release_date = get_set_info(set_raw)

            if is_virtual:
                set_type = set_type_virtual
            elif set_code in DECIPHER_SETS:
                set_type = 'official'
            else:
                set_type = 'community'

            if set_code not in set_cache:
                set_id = upsert_set(conn, game_id, set_code, set_name,
                                    release_date, set_type)
                set_cache[set_code] = set_id
            else:
                set_id = set_cache[set_code]

            # Build image URL
            image_url = IMAGE_BASE_URL + image_file + '.jpg'

            # Upsert card
            card_id = upsert_card(conn, game_id, row)

            # Upsert printing
            rarity   = _get(row, COL_RARITY)
            coll_num = _get(row, COL_COLLECTOR)
            upsert_printing(conn, card_id, set_id, rarity, coll_num, image_url)

            ingested += 1
            if ingested % 500 == 0:
                print(f'  {ingested} cards processed...')
                conn.commit()

    conn.commit()
    print(f'  Done: {ingested} ingested, {skipped} skipped.')


def main():
    with ingestion_db() as conn:
        game_id = upsert_game(conn, 'Star Trek CCG: Second Edition', 'startrek_2e',
                              'Star Trek CCG Second Edition (2002–2012), published by Decipher '
                              'and continued by the Continuing Committee.',
                              card_back_image='/card-backs/startrek_2e.jpg')
        print(f'Star Trek 2E game_id: {game_id}')

        set_cache = {}
        process_file(conn, game_id, PHYSICAL_FILE, is_virtual=False, set_cache=set_cache)
        process_file(conn, game_id, VIRTUAL_FILE,  is_virtual=True,  set_cache=set_cache)

        conn.commit()
        print('\nIngestion complete!')


if __name__ == '__main__':
    main()
