-- Functional indexes for case-insensitive search and lookups.
-- idx_cards_lower_name, idx_sets_lower_code, idx_printings_lower_collector
-- were created manually on both DBs. idx_sets_lower_name is new.
-- All use IF NOT EXISTS so this is safe to run on existing DBs.
CREATE INDEX IF NOT EXISTS idx_cards_lower_name          ON cards    (lower(name));
CREATE INDEX IF NOT EXISTS idx_sets_lower_name           ON sets     (lower(name));
CREATE INDEX IF NOT EXISTS idx_sets_lower_code           ON sets     (lower(code));
CREATE INDEX IF NOT EXISTS idx_printings_lower_collector ON printings(lower(collector_number));
