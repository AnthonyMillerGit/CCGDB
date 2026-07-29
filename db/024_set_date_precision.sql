-- 024_set_date_precision.sql
-- Records how precise each set's release_date actually is, so guessed dates are
-- no longer silently trusted. Many legacy games were bulk-imported with dates
-- placeheld to the 1st of a month (or Jan 1 when only the year was known) —
-- ~45% of all dated sets land on the 1st. This lets the UI show an honest
-- "2004" or "May 2004" instead of a fabricated "Jan 1, 2004".
--
-- Values: 'exact' | 'month' | 'year' | 'unknown'
-- Safe to re-run: column add is IF NOT EXISTS and the backfill is deterministic.

ALTER TABLE sets ADD COLUMN IF NOT EXISTS date_precision text NOT NULL DEFAULT 'exact';

ALTER TABLE sets DROP CONSTRAINT IF EXISTS sets_date_precision_check;
ALTER TABLE sets ADD CONSTRAINT sets_date_precision_check
  CHECK (date_precision IN ('exact', 'month', 'year', 'unknown'));

-- Classify each set. A game is treated as "guessed-dates" when >= 70% of its
-- dated sets fall on the 1st of a month. Real-date games (API-sourced) sit at
-- <= 21% day-1; guessed games at 97-100%, so the split is unambiguous.
WITH game_pct AS (
  SELECT game_id,
         AVG((EXTRACT(DAY FROM release_date) = 1)::int)::numeric AS frac_day1
  FROM sets
  WHERE release_date IS NOT NULL
  GROUP BY game_id
)
UPDATE sets s
SET date_precision = CASE
  WHEN s.release_date IS NULL THEN 'unknown'
  -- Real-date game: trust the date as-is, even genuine 1st-of-month releases.
  WHEN COALESCE(gp.frac_day1, 0) < 0.70 THEN 'exact'
  -- Guessed-dates game: decode the placeholder shape.
  WHEN EXTRACT(MONTH FROM s.release_date) = 1
       AND EXTRACT(DAY FROM s.release_date) = 1 THEN 'year'
  WHEN EXTRACT(DAY FROM s.release_date) = 1 THEN 'month'
  -- A specific (non-1st) day was recorded even in a guessed game — treat as known.
  ELSE 'exact'
END
FROM game_pct gp
WHERE gp.game_id = s.game_id;

-- Any set whose game had zero dated sets (so no game_pct row) and any remaining
-- null-date set: mark unknown.
UPDATE sets SET date_precision = 'unknown' WHERE release_date IS NULL;

-- Bulk placeholders that the day-of-month test misses: some dates were faked
-- quarterly/yearly and encoded on the 30th/31st (end of month) rather than the
-- 1st, in otherwise real-date games. A date shared by an implausibly large
-- number of sets in one game (>= 20) cannot be a real simultaneous release —
-- genuine multi-product days top out around 13 (e.g. MTG Commander drops) — so
-- it's a placeholder. Downgrade to year precision (the value is not trustworthy
-- beyond, at most, its year). Example: 51 Weiss Schwarz sets all on 2014-10-31.
WITH bulk AS (
  SELECT game_id, release_date
  FROM sets
  WHERE release_date IS NOT NULL
  GROUP BY game_id, release_date
  HAVING COUNT(*) >= 20
)
UPDATE sets s
SET date_precision = 'year'
FROM bulk b
WHERE s.game_id = b.game_id
  AND s.release_date = b.release_date
  AND s.date_precision = 'exact';
