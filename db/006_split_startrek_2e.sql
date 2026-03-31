-- Migration 006: Split Star Trek CCG Second Edition into its own game.
-- Moves all 2E-coded sets and their cards out of startrek_1e into a new startrek_2e game.
-- Safe to run once. Run in DBeaver against your CardVault database.

-- ============================================================
-- 1. CREATE THE startrek_2e GAME
-- ============================================================

INSERT INTO games (name, slug, description)
SELECT
    'Star Trek CCG: Second Edition',
    'startrek_2e',
    'Star Trek CCG Second Edition (2002–2012), published by Decipher and continued by the Continuing Committee.'
WHERE NOT EXISTS (SELECT 1 FROM games WHERE slug = 'startrek_2e');

-- ============================================================
-- 2. MOVE 2E SETS FROM startrek_1e → startrek_2e
-- ============================================================

UPDATE sets
SET game_id = (SELECT id FROM games WHERE slug = 'startrek_2e')
WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e')
  AND code IN (
    -- Decipher physical 2E sets
    'se','en','ca','ne','sw','cl','tv',
    -- Continuing Committee official 2E sets
    'bg','imd','ft','dm','ge','r2','ap','wylb',
    -- Virtual 2E sets
    'ftb','rts'
  );

-- ============================================================
-- 3. FIX SET NAMES (drop the "(2E)" suffix now they're in their own game)
-- ============================================================

UPDATE sets SET name = 'Second Edition',        release_date = '2002-09-04' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'se';
UPDATE sets SET name = 'Energize',              release_date = '2003-09-03' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'en';
UPDATE sets SET name = 'Call to Arms',          release_date = '2003-11-05' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'ca';
UPDATE sets SET name = 'Necessary Evil',        release_date = '2004-10-20' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'ne';
UPDATE sets SET name = 'Strange New Worlds',    release_date = '2005-08-12' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'sw';
UPDATE sets SET name = 'Captain''s Log',        release_date = '2005-10-12' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'cl';
UPDATE sets SET name = 'These Are the Voyages', release_date = '2006-09-14' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'tv';
UPDATE sets SET name = 'To Boldly Go',          release_date = '2007-01-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'bg';
UPDATE sets SET name = 'In a Mirror, Darkly',   release_date = '2008-04-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'imd';
UPDATE sets SET name = 'Fractured Time',        release_date = '2009-05-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'ft';
UPDATE sets SET name = 'Dangerous Missions',    release_date = '2009-01-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'dm';
UPDATE sets SET name = 'Genesis',               release_date = '2009-08-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'ge';
UPDATE sets SET name = 'Reflections 2.0',       release_date = '2011-03-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'r2';
UPDATE sets SET name = 'A Private Little War',  release_date = '2011-09-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'ap';
UPDATE sets SET name = 'What You Leave Behind', release_date = '2012-01-01' WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'wylb';
UPDATE sets SET name = 'Fractured Time (Virtual)'                            WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'ftb';
UPDATE sets SET name = 'Raise the Stakes'                                    WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e') AND code = 'rts';

-- ============================================================
-- 4. SET TYPE FOR 2E SETS
-- ============================================================

-- Physical Decipher sets
UPDATE sets SET set_type = 'official'
WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e')
  AND code IN ('se','en','ca','ne','sw','cl','tv');

-- Continuing Committee official sets (post-Decipher, community-sanctioned)
UPDATE sets SET set_type = 'community'
WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e')
  AND code IN ('bg','imd','ft','dm','ge','r2','ap','wylb');

-- Virtual 2E sets
UPDATE sets SET set_type = 'virtual'
WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e')
  AND code IN ('ftb','rts');

-- ============================================================
-- 5. MOVE CARDS TO startrek_2e
--    Only moves cards whose printings are exclusively in 2E sets.
--    Cards with printings in both 1E and 2E sets stay in 1E.
-- ============================================================

UPDATE cards
SET game_id = (SELECT id FROM games WHERE slug = 'startrek_2e')
WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e')
  AND id IN (
      -- has at least one printing in a 2E set
      SELECT card_id FROM printings
      WHERE set_id IN (SELECT id FROM sets WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_2e'))
  )
  AND id NOT IN (
      -- but no printings in any remaining 1E set
      SELECT card_id FROM printings
      WHERE set_id IN (SELECT id FROM sets WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e'))
  );

-- ============================================================
-- 6. VERIFY
-- ============================================================

SELECT g.name AS game, COUNT(DISTINCT s.id) AS sets, COUNT(DISTINCT c.id) AS cards
FROM games g
LEFT JOIN sets s ON s.game_id = g.id
LEFT JOIN cards c ON c.game_id = g.id
WHERE g.slug IN ('startrek_1e','startrek_2e')
GROUP BY g.name
ORDER BY g.name;
