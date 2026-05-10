-- Migration 017: Convert absolute image_url values to relative paths.
-- The Go API now prepends ASSET_BASE_URL at serve time, so the DB stores
-- only the path portion (e.g. "cards/pokemon/foo.png").
-- External URLs (Scryfall, pokemontcg.io, etc.) are left untouched — the
-- API's imgURL helper passes any value already starting with "http" through unchanged.

-- Strip local dev prefix (run on local DB)
UPDATE printings
SET image_url = REPLACE(image_url, 'http://localhost:8000/assets/', '')
WHERE image_url LIKE 'http://localhost:8000/assets/%';

-- Strip R2 prefix (run on EC2 DB)
UPDATE printings
SET image_url = REPLACE(image_url, 'https://assets.ccgvault.io/', '')
WHERE image_url LIKE 'https://assets.ccgvault.io/%';
