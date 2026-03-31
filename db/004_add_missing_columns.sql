-- Migration 004: Add columns that were applied directly to the live DB
-- without corresponding migration files.
-- Safe to run multiple times (uses IF NOT EXISTS / DO $$ blocks).

-- ============================================================
-- 1. COLUMNS
-- ============================================================

ALTER TABLE games
    ADD COLUMN IF NOT EXISTS card_back_image TEXT;

ALTER TABLE sets
    ADD COLUMN IF NOT EXISTS icon_url TEXT,
    ADD COLUMN IF NOT EXISTS set_type VARCHAR(50);

ALTER TABLE cards
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);

ALTER TABLE printings
    ADD COLUMN IF NOT EXISTS back_image_url TEXT;


-- ============================================================
-- 2. UNIQUE CONSTRAINTS
-- ============================================================

-- MTG identity: same-name cards within a game are the same card.
-- Used by: ingest_mtg.py  ON CONFLICT (name, game_id) WHERE external_id IS NULL
--
-- A full UNIQUE (game_id, name) constraint would break Pokemon, which has multiple
-- cards named "Pikachu" etc. (each genuinely different, identified by external_id).
-- A partial index scoped to external_id IS NULL safely covers MTG only.
--
-- NOTE: ingest_mtg.py must use ON CONFLICT (name, game_id) WHERE external_id IS NULL
--       to match this partial index.
CREATE UNIQUE INDEX IF NOT EXISTS unique_card_name_per_game
    ON cards (game_id, name)
    WHERE external_id IS NULL;

-- Pokemon / YuGiOh / Star Wars identity: external_id is canonical.
-- Used by: ingest_pokemon.py, ingest_yugioh.py, ingest_starwars_decipher.py
--          ON CONFLICT (game_id, external_id)
-- NOTE: Already exists in live DB as 'unique_card_external_id' (confirmed 2026-03-30).
--       This block is a no-op on existing DBs; creates it on fresh installs.
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname IN ('unique_card_external_id', 'unique_card_external_id_per_game')
          AND conrelid = 'cards'::regclass
    ) THEN
        ALTER TABLE cards
            ADD CONSTRAINT unique_card_external_id UNIQUE (game_id, external_id);
    END IF;
END $$;


-- ============================================================
-- 3. INDEXES
-- ============================================================

-- external_id is queried frequently in all non-MTG ingestion lookups.
-- The unique constraint above creates an implicit index, but this partial
-- index keeps it lean by excluding NULLs (MTG cards have no external_id).
CREATE INDEX IF NOT EXISTS idx_cards_external_id
    ON cards (external_id)
    WHERE external_id IS NOT NULL;
