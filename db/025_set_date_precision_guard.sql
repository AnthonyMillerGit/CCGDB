-- 025_set_date_precision_guard.sql
-- Keeps sets.date_precision honest on INSERT/UPDATE.
--
-- 024 added the column and backfilled it, but sets.date_precision defaults to
-- 'exact' and none of the 17 ingest scripts set it. So any set written after 024
-- claims exact precision by default — including sets with no release_date at all,
-- which would sit at 'exact' while release_date IS NULL. This trigger makes the
-- one unambiguous rule structurally impossible to violate, regardless of which
-- script does the writing:
--
--   release_date IS NULL  <=>  date_precision = 'unknown'
--
-- It deliberately does NOT guess precision for non-null dates. A 1st-of-month
-- date is genuinely correct for many API-sourced games, so downgrading it here
-- would trade one fabrication for another. Ingest scripts that know their source
-- only gives month- or year-precision should set date_precision explicitly; the
-- trigger leaves any such explicit value alone.
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION sets_enforce_date_precision()
RETURNS trigger AS $$
BEGIN
  IF NEW.release_date IS NULL THEN
    -- No date means no precision to claim.
    NEW.date_precision := 'unknown';
  ELSIF NEW.date_precision IS NULL OR NEW.date_precision = 'unknown' THEN
    -- A date arrived (or was added by this UPDATE) but precision still says
    -- 'unknown'. Default to 'exact'; a caller that knows better sets it itself.
    NEW.date_precision := 'exact';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sets_date_precision ON sets;
CREATE TRIGGER trg_sets_date_precision
  BEFORE INSERT OR UPDATE OF release_date, date_precision ON sets
  FOR EACH ROW EXECUTE FUNCTION sets_enforce_date_precision();

-- Repair any rows that already drifted between 024 and this migration.
UPDATE sets SET date_precision = 'unknown'
  WHERE release_date IS NULL AND date_precision <> 'unknown';
UPDATE sets SET date_precision = 'exact'
  WHERE release_date IS NOT NULL AND date_precision = 'unknown';
