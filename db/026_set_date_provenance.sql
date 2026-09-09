-- 026_set_date_provenance.sql
-- Records WHERE a set's release_date came from and WHEN it was last checked.
--
-- 024/025 established how precise a date is; they say nothing about whether the
-- value was ever verified. Those are different questions, and conflating them
-- hides real errors: a Doomtown set sitting at date_precision='month' looks
-- exactly as trustworthy as a Middle-earth one, yet an audit against Wikipedia
-- found MECCG correct on all 9 dates while 11 of 16 Doomtown sets had the wrong
-- YEAR (Episodes 4-9 dated 1999 that shipped in 1998, Pine Box/Shootout/Mouth of
-- Hell dated 2000 that shipped in 1999). Precision was never the problem there.
--
-- The precision ladder we fall back down, best first:
--
--     exact    -- a specific day is documented
--     month    -- only the month is documented
--     year     -- only the year is documented
--     unknown  -- no trustworthy date exists anywhere
--
-- Research finding worth recording: for dead 1990s CCGs, 'exact' is usually
-- unreachable. Wikipedia's Doomtown release table is headed "Year"; Shadowfist is
-- year-only for 28 of 29 sets; no source consulted (Wikipedia, Tolkien Gateway,
-- Council of Elrond, meccg.com, Fandom) publishes a day-of-month for any of them.
-- Month is frequently the true ceiling, so a verified 'month' is a finished
-- result, not a half-done one.
--
-- Safe to re-run.

ALTER TABLE sets ADD COLUMN IF NOT EXISTS date_source      text;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS date_verified_at timestamptz;

-- Deliberately left NULL for every existing row. We genuinely do not know the
-- provenance of the dates already in the table, and stamping a guessed source
-- onto them would repeat the exact mistake this work exists to undo. NULL here
-- means "provenance unrecorded", which is the truth.
COMMENT ON COLUMN sets.date_source IS
  'Where release_date came from. NULL = provenance unrecorded (not yet verified).';
COMMENT ON COLUMN sets.date_verified_at IS
  'When release_date was last confirmed against date_source. NULL = never verified.';

-- Constrain to known sources so a typo ("wikipeda") cannot silently masquerade as
-- a verified value. Extend this list in a later migration when a source is added.
ALTER TABLE sets DROP CONSTRAINT IF EXISTS sets_date_source_check;
ALTER TABLE sets ADD CONSTRAINT sets_date_source_check
  CHECK (date_source IS NULL OR date_source IN (
    'wikipedia',      -- en.wikipedia.org, via the MediaWiki API
    'official-api',   -- the game's own publisher API (Scryfall, Pokemon TCG, ...)
    'publisher-site', -- publisher's own site, not an API
    'fan-wiki',       -- game-specific community wiki
    'ccgtrader',      -- the original bulk scrape; low trust
    'manual'          -- entered by hand from a cited source
  ));

-- Rank of a precision value, so callers order the ladder identically everywhere
-- and a weaker source can never silently overwrite a stronger one.
CREATE OR REPLACE FUNCTION date_precision_rank(p text)
RETURNS int IMMUTABLE LANGUAGE sql AS $$
  SELECT CASE p
    WHEN 'exact'   THEN 3
    WHEN 'month'   THEN 2
    WHEN 'year'    THEN 1
    ELSE 0                    -- 'unknown' or anything unrecognised
  END
$$;

-- Verified rows should be findable cheaply when reporting coverage.
CREATE INDEX IF NOT EXISTS idx_sets_date_verified
  ON sets (date_verified_at) WHERE date_verified_at IS NOT NULL;
