-- Replace is_foil boolean with a finish field that can be 'normal', 'foil', or 'other'
ALTER TABLE user_collections ADD COLUMN IF NOT EXISTS finish VARCHAR(20) NOT NULL DEFAULT 'normal';
UPDATE user_collections SET finish = CASE WHEN is_foil THEN 'foil' ELSE 'normal' END;
ALTER TABLE user_collections DROP CONSTRAINT IF EXISTS user_collections_user_id_printing_id_foil_key;
ALTER TABLE user_collections ADD CONSTRAINT user_collections_user_id_printing_id_finish_key UNIQUE (user_id, printing_id, finish);
