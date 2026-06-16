-- Add is_foil to user_collections and wishlists so foil and non-foil copies
-- of the same printing can be tracked with separate quantities.

BEGIN;

-- user_collections
ALTER TABLE user_collections
    ADD COLUMN is_foil boolean NOT NULL DEFAULT false;

ALTER TABLE user_collections
    DROP CONSTRAINT user_collections_user_id_printing_id_key;

ALTER TABLE user_collections
    ADD CONSTRAINT user_collections_user_id_printing_id_foil_key
    UNIQUE (user_id, printing_id, is_foil);

-- wishlists
ALTER TABLE wishlists
    ADD COLUMN is_foil boolean NOT NULL DEFAULT false;

ALTER TABLE wishlists
    DROP CONSTRAINT wishlists_user_id_printing_id_key;

ALTER TABLE wishlists
    ADD CONSTRAINT wishlists_user_id_printing_id_foil_key
    UNIQUE (user_id, printing_id, is_foil);

COMMIT;
