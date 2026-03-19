-- Speed up joins and lookups on sets
CREATE INDEX idx_sets_game_id ON sets(game_id);
CREATE INDEX idx_sets_code ON sets(code);

-- Speed up joins and lookups on cards
CREATE INDEX idx_cards_game_id ON cards(game_id);
CREATE INDEX idx_cards_name ON cards(name);

-- Speed up joins on printings
CREATE INDEX idx_printings_card_id ON printings(card_id);
CREATE INDEX idx_printings_set_id ON printings(set_id);