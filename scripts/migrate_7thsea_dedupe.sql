-- 7th Sea CCG duplicate card cleanup
-- Re-ingest created new card records (id > 2000000) with slightly different names
-- (accents, quotes, spacing) from original scrape (id < 2000000).
-- This script merges them: remaps printings to old card IDs, deletes new card records.

BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;

-- ── Step 1: Build new→old card ID mapping via normalized name match ────────────
CREATE TEMP TABLE card_remap AS
SELECT DISTINCT ON (n.id)
  n.id     AS new_card_id,
  n.name   AS new_name,
  o.id     AS old_card_id,
  o.name   AS old_name
FROM cards n
JOIN games g ON g.id = n.game_id AND g.slug = 'seventhsea'
JOIN cards o ON o.id < 2000000 AND o.game_id = n.game_id
  AND regexp_replace(lower(unaccent(n.name)), '[^a-z0-9]', '', 'g')
    = regexp_replace(lower(unaccent(o.name)), '[^a-z0-9]', '', 'g')
WHERE n.id > 2000000
ORDER BY n.id, o.id ASC;

SELECT COUNT(*) AS card_pairs_normalized FROM card_remap;

-- ── Step 2: Add spelling near-misses not caught by normalization ──────────────
INSERT INTO card_remap (new_card_id, new_name, old_card_id, old_name)
SELECT n.id, n.name, o.id, o.name
FROM (VALUES
  (2778307, 1300486),  -- Lumiere de l'Empereur → Lumiere de l'Emereur
  (2778314, 1300496),  -- Mordekei's Casket → Mordekai's Casket
  (2778362, 1300560),  -- Two-Toe Terrance → Two-Toe Terrence
  (2778236, 1300555)   -- "Target Their Powder Room" → Target Their Powder Rooms!
) AS m(new_id, old_id)
JOIN cards n ON n.id = m.new_id
JOIN cards o ON o.id = m.old_id
ON CONFLICT DO NOTHING;

SELECT COUNT(*) AS total_card_pairs FROM card_remap;

-- ── Step 3: Build printing-level mapping ─────────────────────────────────────
CREATE TEMP TABLE printing_remap AS
SELECT
  np.id                                     AS new_printing_id,
  np.set_id,
  r.new_card_id,
  r.old_card_id,
  np.image_url                              AS new_image_url,
  (SELECT op.id FROM printings op
   WHERE op.card_id = r.old_card_id AND op.set_id = np.set_id
   LIMIT 1)                                 AS old_printing_id,
  (SELECT op.image_url FROM printings op
   WHERE op.card_id = r.old_card_id AND op.set_id = np.set_id
   LIMIT 1)                                 AS old_image_url
FROM printings np
JOIN card_remap r ON r.new_card_id = np.card_id;

SELECT
  COUNT(*) FILTER (WHERE old_printing_id IS NOT NULL) AS duplicate_printings,
  COUNT(*) FILTER (WHERE old_printing_id IS NULL)     AS new_set_printings
FROM printing_remap;

-- ── Step 4: Copy image_url from new to old where old is NULL ─────────────────
UPDATE printings op
SET image_url = pr.new_image_url
FROM printing_remap pr
WHERE op.id = pr.old_printing_id
  AND op.image_url IS NULL
  AND pr.new_image_url IS NOT NULL;

-- ── Step 5: Remap user_collections from new printing → old printing ───────────

-- 5a: Where old_printing already exists for this user+finish, add quantities
UPDATE user_collections existing
SET quantity = existing.quantity + src.quantity
FROM user_collections src
JOIN printing_remap pr ON pr.new_printing_id = src.printing_id
WHERE existing.printing_id = pr.old_printing_id
  AND existing.user_id = src.user_id
  AND existing.finish = src.finish
  AND pr.old_printing_id IS NOT NULL;

-- 5b: Where no conflict, just update printing_id
UPDATE user_collections uc
SET printing_id = pr.old_printing_id
FROM printing_remap pr
WHERE uc.printing_id = pr.new_printing_id
  AND pr.old_printing_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_collections ex
    WHERE ex.printing_id = pr.old_printing_id
      AND ex.user_id = uc.user_id
      AND ex.finish = uc.finish
  );

-- 5c: Delete rows that were merged in 5a (quantity added to old row)
DELETE FROM user_collections uc
USING printing_remap pr
WHERE uc.printing_id = pr.new_printing_id
  AND pr.old_printing_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_collections ex
    WHERE ex.printing_id = pr.old_printing_id
      AND ex.user_id = uc.user_id
      AND ex.finish = uc.finish
  );

-- ── Step 6: For printings in sets the old card didn't have, remap card_id ────
UPDATE printings p
SET card_id = pr.old_card_id
FROM printing_remap pr
WHERE p.id = pr.new_printing_id
  AND pr.old_printing_id IS NULL;

-- ── Step 7: Delete duplicate new-range printings ──────────────────────────────
DELETE FROM printings p
USING printing_remap pr
WHERE p.id = pr.new_printing_id
  AND pr.old_printing_id IS NOT NULL;

-- ── Step 8: Delete new-range card records that have been fully remapped ───────
DELETE FROM cards n
USING card_remap r
WHERE n.id = r.new_card_id
  AND NOT EXISTS (SELECT 1 FROM printings WHERE card_id = n.id);

-- ── Final check ───────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM cards c JOIN games g ON g.id = c.game_id
   WHERE g.slug = 'seventhsea' AND c.id > 2000000) AS remaining_new_cards,
  (SELECT COUNT(*) FROM printings p JOIN cards c ON c.id = p.card_id
   JOIN games g ON g.id = c.game_id
   WHERE g.slug = 'seventhsea' AND c.id > 2000000) AS remaining_new_printings;

COMMIT;
