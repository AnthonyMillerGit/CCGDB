-- Migration 007: Deduplicate printings with NULL collector_number.
--
-- Root cause: UNIQUE (card_id, set_id, collector_number) doesn't fire when
-- collector_number IS NULL because NULL != NULL in Postgres unique constraints.
-- Affected games: starwars_decipher (2,517 dupe pairs), digimon (4,385),
-- onepiece (775). Each had been ingested multiple times, creating duplicate rows.
--
-- Fix in two steps: delete dupes, then add a partial unique index for NULL rows.

-- ============================================================
-- 1. DELETE DUPLICATES across all affected games
--    Keep the lowest-id printing per (card_id, set_id).
-- ============================================================

DELETE FROM printings
WHERE collector_number IS NULL
  AND id NOT IN (
      SELECT MIN(id)
      FROM printings
      WHERE collector_number IS NULL
      GROUP BY card_id, set_id
  );

-- ============================================================
-- 2. ADD PARTIAL UNIQUE INDEX for NULL collector_number rows
-- ============================================================

CREATE UNIQUE INDEX unique_printing_null_cn
    ON printings (card_id, set_id)
    WHERE collector_number IS NULL;

-- ============================================================
-- 3. VERIFY
-- ============================================================

SELECT g.slug,
       COUNT(DISTINCT c.id)  AS cards,
       COUNT(DISTINCT p.id)  AS printings
FROM games g
JOIN cards c ON c.game_id = g.id
JOIN printings p ON p.card_id = c.id
WHERE g.slug IN ('starwars_decipher', 'digimon', 'onepiece')
GROUP BY g.slug
ORDER BY g.slug;
