-- Migration 005: Fix Star Trek CCG 1E set display names and backfill set_type.
-- Safe to run multiple times (UPDATE is idempotent for same values).
-- Run in DBeaver against your local CardVault database.

-- ============================================================
-- HELPER: get the game_id for Star Trek 1E once
-- ============================================================
DO $$
DECLARE
    v_game_id INT;
BEGIN
    SELECT id INTO v_game_id FROM games WHERE slug = 'startrek_1e';
    IF v_game_id IS NULL THEN
        RAISE NOTICE 'startrek_1e game not found — skipping migration 005';
        RETURN;
    END IF;

    -- ============================================================
    -- 1. FIX ABBREVIATED / MISSING SET DISPLAY NAMES
    -- ============================================================

    -- 2E crossover sets (Decipher Second Edition cards cross-playable in 1E)
    UPDATE sets SET name = 'Second Edition (2E)',          release_date = '2002-09-04' WHERE game_id = v_game_id AND code = 'se'           AND (name = 'Se'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Energize (2E)',                release_date = '2003-09-03' WHERE game_id = v_game_id AND code = 'en'           AND (name = 'En'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Call to Arms (2E)',            release_date = '2003-11-05' WHERE game_id = v_game_id AND code = 'ca'           AND (name = 'Ca'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Necessary Evil (2E)',          release_date = '2004-10-20' WHERE game_id = v_game_id AND code = 'ne'           AND (name = 'Ne'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Strange New Worlds (2E)',      release_date = '2005-08-12' WHERE game_id = v_game_id AND code = 'sw'           AND (name = 'Sw'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Captain''s Log (2E)',          release_date = '2005-10-12' WHERE game_id = v_game_id AND code = 'cl'           AND (name = 'Cl'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'These Are the Voyages (2E)',   release_date = '2006-09-14' WHERE game_id = v_game_id AND code = 'tv'           AND (name = 'Tv'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'To Boldly Go (2E)',            release_date = '2007-01-01' WHERE game_id = v_game_id AND code = 'bg'           AND (name = 'Bg'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Dangerous Missions (2E)',      release_date = '2009-01-01' WHERE game_id = v_game_id AND code = 'dm'           AND (name = 'Dm'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Fractured Time (2E)',          release_date = '2009-05-01' WHERE game_id = v_game_id AND code = 'ft'           AND (name = 'Ft'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Genesis (2E)',                 release_date = '2009-08-01' WHERE game_id = v_game_id AND code = 'ge'           AND (name = 'Ge'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Reflections 2.0 (2E)',         release_date = '2011-03-01' WHERE game_id = v_game_id AND code = 'r2'           AND (name = 'R2'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'In a Mirror, Darkly (2E)',     release_date = '2008-04-01' WHERE game_id = v_game_id AND code = 'imd'          AND (name = 'Imd'          OR name IS NULL OR name = code);
    UPDATE sets SET name = 'A Private Little War (2E)',    release_date = '2011-09-01' WHERE game_id = v_game_id AND code = 'ap'           AND (name = 'Ap'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'What You Leave Behind (2E)',   release_date = '2012-01-01' WHERE game_id = v_game_id AND code = 'wylb'         AND (name = 'Wylb'         OR name IS NULL OR name = code);

    -- Physical Decipher products with odd codes
    UPDATE sets SET name = 'Starter Deck II'                                           WHERE game_id = v_game_id AND code = 'sdii'         AND (name = 'Sdii'         OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Fajo''s Gallery'                                           WHERE game_id = v_game_id AND code = 'faj'          AND (name = 'Faj'          OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Armada'                                                    WHERE game_id = v_game_id AND code = 'armade'       AND (name = 'Armade'       OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Crossover Supplement'                                      WHERE game_id = v_game_id AND code = 'x'            AND (name = 'X'            OR name IS NULL OR name = code);

    -- Errata / variant printings of existing sets
    UPDATE sets SET name = 'Voyager'                                                   WHERE game_id = v_game_id AND code = 'voy_errata'   AND (name = 'Voy Errata'   OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Enterprise'                                                WHERE game_id = v_game_id AND code = 'enterprise.ecr' AND (name = 'Enterprise.Ecr' OR name IS NULL OR name = code);

    -- Virtual 1E fan expansions
    UPDATE sets SET name = '50th Anniversary'                                          WHERE game_id = v_game_id AND code = '50'           AND (name = '50'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Life from Lifelessness'                                    WHERE game_id = v_game_id AND code = 'lfl'          AND (name = 'Lfl'          OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Live Long and Prosper'                                     WHERE game_id = v_game_id AND code = 'llap'         AND (name = 'Llap'         OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Live Long and Prosper'                                     WHERE game_id = v_game_id AND code = 'llap_errata'  AND (name = 'Llap Errata'  OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Fractured Time (2E Virtual)'                               WHERE game_id = v_game_id AND code = 'ftb'          AND (name = 'Ftb'          OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Raise the Stakes (2E Virtual)'                             WHERE game_id = v_game_id AND code = 'rts'          AND (name = 'Rts'          OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Shades and Shadows'                                        WHERE game_id = v_game_id AND code = 'sas'          AND (name = 'Sas'          OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Metamorphosis'                                             WHERE game_id = v_game_id AND code = 'metamorpho'   AND (name = 'Metamorpho'   OR name IS NULL OR name = code);
    UPDATE sets SET name = 'The Sting That Lasts'                                      WHERE game_id = v_game_id AND code = 'tstl'         AND (name = 'Tstl'         OR name IS NULL OR name = code);
    UPDATE sets SET name = 'The Gamma Quadrant'                                        WHERE game_id = v_game_id AND code = 'tgq_errata'   AND (name = 'Tgq Errata'   OR name IS NULL OR name = code);
    UPDATE sets SET name = 'TNG Supplemental'                                          WHERE game_id = v_game_id AND code = 'tng'          AND (name = 'Tng'          OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Crossover Supplement'                                      WHERE game_id = v_game_id AND code = 'xx'           AND (name = 'Xx'           OR name IS NULL OR name = code);
    UPDATE sets SET name = 'Identity Crisis'                                           WHERE game_id = v_game_id AND code = 'identity crisis' AND (name ILIKE 'identity%' OR name IS NULL);

    -- ============================================================
    -- 2. BACKFILL set_type
    --    Physical.txt sets → 'official'
    --    Virtual.txt-only sets → 'virtual'
    -- ============================================================

    -- Mark ALL ST 1E sets as 'official' first (Physical.txt is the base)
    UPDATE sets SET set_type = 'official'
    WHERE game_id = v_game_id;

    -- Then override the virtual-only sets
    UPDATE sets SET set_type = 'virtual'
    WHERE game_id = v_game_id
      AND code IN (
        -- Core virtual 1E fan expansions
        'homefront', 'homefront2', 'homefront3', 'homefront4', 'homefront5', 'homefront6',
        'chainofcommand', 'identitycrisis', 'identity crisis',
        'maquis', 'emissary', 'tngsup', 'crossover', 'engage',
        'tuc', 'comingofag', 'thingspast', 'lookinggla',
        'brokenbow', 'coldfront', 'terran', 'rif',
        'tgq', 'tgq_errata', 'sog', 'sas', 'errata',
        'prewarp', 'wpemissary', 'vpromos', 'vp',
        -- Additional virtual sets confirmed from source
        '50', 'lfl', 'llap', 'llap_errata',
        'ftb', 'rts', 'metamorpho', 'tstl', 'tng', 'xx',
        -- Virtual promos / specials
        'rif'
      );

    -- ============================================================
    -- 3. SET CARD BACK IMAGE
    -- ============================================================
    UPDATE games
    SET card_back_image = '/card-backs/startrek_1e.jpg'
    WHERE id = v_game_id
      AND (card_back_image IS NULL OR card_back_image = '');

    RAISE NOTICE 'Migration 005 complete for game_id=%', v_game_id;
END $$;

-- ============================================================
-- 3. VERIFY — run this SELECT to review the results
-- ============================================================
-- SELECT code, name, set_type, release_date
-- FROM sets
-- WHERE game_id = (SELECT id FROM games WHERE slug = 'startrek_1e')
-- ORDER BY set_type, name;
