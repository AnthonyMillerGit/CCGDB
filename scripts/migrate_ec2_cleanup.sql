-- CCGVault EC2 cleanup migration
-- Run in two parts so dedup succeeds independently of card-specific fixes

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: Remove duplicate printings
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TEMP TABLE dupe_map AS
SELECT
  MIN(p.id) AS keep_id,
  array_agg(p.id ORDER BY p.id) AS all_ids
FROM printings p
JOIN cards c ON c.id = p.card_id
JOIN sets s ON s.id = p.set_id
GROUP BY c.game_id, s.id, c.name
HAVING COUNT(*) > 1;

CREATE TEMP TABLE remap AS
SELECT keep_id, unnest(all_ids[2:]) AS old_id FROM dupe_map;

INSERT INTO user_collections (user_id, printing_id, quantity, finish, condition)
SELECT uc.user_id, r.keep_id, SUM(uc.quantity), uc.finish, MAX(uc.condition)
FROM user_collections uc
JOIN remap r ON r.old_id = uc.printing_id
GROUP BY uc.user_id, r.keep_id, uc.finish
ON CONFLICT (user_id, printing_id, finish) DO UPDATE
  SET quantity = user_collections.quantity + EXCLUDED.quantity;

DELETE FROM user_collections uc
USING remap r
WHERE uc.printing_id = r.old_id;

DELETE FROM printings p
USING remap r
WHERE p.id = r.old_id;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: Card-specific fixes
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Fix The Calloways — revert to base stats, split Experienced into own card
DO $$
DECLARE
  v_game_id   int;
  v_card_id   int;
  v_set_id    int;
  v_new_card  int;
BEGIN
  SELECT id INTO v_game_id FROM games WHERE slug = 'seventhsea';

  -- Pick the single card record that has the base Calloways data
  SELECT id INTO v_card_id
  FROM cards
  WHERE name = 'The Calloways' AND game_id = v_game_id
  LIMIT 1;

  SELECT id INTO v_set_id
  FROM sets
  WHERE name = 'Fate''s Debt' AND game_id = v_game_id
  LIMIT 1;

  -- Revert base card to Broadsides stats
  UPDATE cards
  SET
    rules_text = 'React: Tack immediately after you have put an Artifact Adventure into play. Move your Ship 1 Sea closer to the Adventure.',
    attributes = '{"can": 0, "sai": 0, "adv": 2, "inf": 3, "swa": 2, "cost": "5", "cost_raw": "5 Inf.", "cost_type": "In", "type": "Crew", "rarity": "U", "faction": "Explorer", "boarding": "Punch", "mrp": "MRP"}'::jsonb
  WHERE id = v_card_id;

  -- Create Experienced card if it doesn't exist yet
  IF NOT EXISTS (SELECT 1 FROM cards WHERE name = 'The Calloways - Exp.' AND game_id = v_game_id) THEN
    INSERT INTO cards (game_id, name, card_type, rules_text, attributes)
    VALUES (
      v_game_id, 'The Calloways - Exp.', 'Crew',
      'Experienced - Unique - Loyal - Swordsman +1. The Calloways have +2 Swashbuckling while you are the Defender in a Boarding.',
      '{"can": 0, "sai": 3, "adv": 2, "inf": 3, "swa": 3, "cost": "7", "cost_raw": "7 Inf.", "cost_type": "In", "type": "Crew", "rarity": "R", "faction": "Explorer", "boarding": "Punch", "mrp": "MRP"}'::jsonb
    )
    RETURNING id INTO v_new_card;

    -- Remap Fate's Debt printing to the new card
    UPDATE printings
    SET card_id = v_new_card, image_url = NULL
    WHERE set_id = v_set_id AND card_id = v_card_id;
  END IF;
END $$;

-- Clear wrong image from Kitka Maritova in Iron Shadow
UPDATE printings p
SET image_url = NULL
FROM cards c, sets s, games g
WHERE p.card_id = c.id
  AND p.set_id = s.id
  AND s.game_id = g.id
  AND g.slug = 'seventhsea'
  AND s.name = 'Iron Shadow'
  AND c.name ILIKE 'kitka maritova';

COMMIT;

-- Final check
SELECT COUNT(*) AS remaining_dupes FROM (
  SELECT c.game_id, s.id, c.name
  FROM printings p
  JOIN cards c ON c.id = p.card_id
  JOIN sets s ON s.id = p.set_id
  GROUP BY c.game_id, s.id, c.name
  HAVING COUNT(*) > 1
) sub;
