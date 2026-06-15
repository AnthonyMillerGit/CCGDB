-- Migration 016: Pinned thumbnail card for decks.
ALTER TABLE decks ADD COLUMN IF NOT EXISTS thumbnail_card_id INT REFERENCES cards(id) ON DELETE SET NULL;
