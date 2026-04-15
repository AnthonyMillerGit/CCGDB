-- Migration 005: Fix Star Trek CCG 1E set display names and backfill set_type.
-- Safe to run multiple times. Run in DBeaver against your CCGVault database.

-- ============================================================
-- 1. BACKFILL set_type
--    Start by marking everything official, then override virtual sets.
-- ============================================================

UPDATE sets SET set_type = 'official'
WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e');

UPDATE sets SET set_type = 'virtual'
WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e')
  AND code IN (
    'homefront','homefront2','homefront3','homefront4','homefront5','homefront6',
    'chainofcommand','identitycrisis','identity crisis',
    'maquis','emissary','tngsup','crossover','engage',
    'tuc','comingofag','thingspast','lookinggla',
    'brokenbow','coldfront','terran','rif',
    'tgq','tgq_errata','sog','sas','errata',
    'prewarp','wpemissary','vpromos','vp',
    '50','lfl','llap','llap_errata',
    'ftb','rts','metamorpho','tstl','tng','xx'
  );

-- ============================================================
-- 2. FIX SET DISPLAY NAMES
-- ============================================================

-- 2E crossover sets
UPDATE sets SET name = 'Second Edition (2E)',         release_date = '2002-09-04' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'se';
UPDATE sets SET name = 'Energize (2E)',               release_date = '2003-09-03' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'en';
UPDATE sets SET name = 'Call to Arms (2E)',           release_date = '2003-11-05' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'ca';
UPDATE sets SET name = 'Necessary Evil (2E)',         release_date = '2004-10-20' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'ne';
UPDATE sets SET name = 'Strange New Worlds (2E)',     release_date = '2005-08-12' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'sw';
UPDATE sets SET name = 'Captain''s Log (2E)',         release_date = '2005-10-12' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'cl';
UPDATE sets SET name = 'These Are the Voyages (2E)', release_date = '2006-09-14' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'tv';
UPDATE sets SET name = 'To Boldly Go (2E)',           release_date = '2007-01-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'bg';
UPDATE sets SET name = 'In a Mirror, Darkly (2E)',   release_date = '2008-04-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'imd';
UPDATE sets SET name = 'Fractured Time (2E)',         release_date = '2009-05-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'ft';
UPDATE sets SET name = 'Dangerous Missions (2E)',     release_date = '2009-01-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'dm';
UPDATE sets SET name = 'Genesis (2E)',                release_date = '2009-08-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'ge';
UPDATE sets SET name = 'Reflections 2.0 (2E)',        release_date = '2011-03-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'r2';
UPDATE sets SET name = 'A Private Little War (2E)',  release_date = '2011-09-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'ap';
UPDATE sets SET name = 'What You Leave Behind (2E)', release_date = '2012-01-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'wylb';

-- Physical Decipher products with abbreviated/odd codes
UPDATE sets SET name = 'Starter Deck II'       WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'sdii';
UPDATE sets SET name = 'Fajo''s Gallery'       WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'faj';
UPDATE sets SET name = 'Armada'                WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'armade';
UPDATE sets SET name = 'Crossover Supplement'  WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'x';
UPDATE sets SET name = 'Voyager'               WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'voy_errata';
UPDATE sets SET name = 'Enterprise'            WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'enterprise.ecr';

-- Virtual 1E fan expansions
UPDATE sets SET name = '50th Anniversary'              WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = '50';
UPDATE sets SET name = 'Life from Lifelessness'        WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'lfl';
UPDATE sets SET name = 'Live Long and Prosper'         WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'llap';
UPDATE sets SET name = 'Live Long and Prosper'         WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'llap_errata';
UPDATE sets SET name = 'Fractured Time (2E Virtual)'   WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'ftb';
UPDATE sets SET name = 'Raise the Stakes (2E Virtual)' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'rts';
UPDATE sets SET name = 'Shades and Shadows'            WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'sas';
UPDATE sets SET name = 'Metamorphosis'                 WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'metamorpho';
UPDATE sets SET name = 'The Sting That Lasts'          WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'tstl';
UPDATE sets SET name = 'The Gamma Quadrant'            WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'tgq_errata';
UPDATE sets SET name = 'TNG Supplemental'              WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'tng';
UPDATE sets SET name = 'Crossover Supplement'          WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'xx';
UPDATE sets SET name = 'Identity Crisis'               WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e') AND code = 'identity crisis';

-- ============================================================
-- 3. CARD BACK IMAGE
-- ============================================================

UPDATE games SET card_back_image = '/card-backs/startrek_1e.jpg'
WHERE slug = 'startrek_1e';

-- ============================================================
-- 4. VERIFY
-- ============================================================

SELECT code, name, set_type
FROM sets
WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e')
ORDER BY set_type, name;
