-- Enable unaccent extension so search queries can match accented characters
-- without requiring the user to type the exact accent (e.g. "Poke Ball" finds "Poké Ball").
CREATE EXTENSION IF NOT EXISTS unaccent;
