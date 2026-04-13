-- Migration 007: Add users and user_collections tables for auth and collection tracking.

CREATE TABLE IF NOT EXISTS users (
    id           SERIAL PRIMARY KEY,
    username     TEXT UNIQUE NOT NULL,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_collections (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    printing_id INT NOT NULL REFERENCES printings(id) ON DELETE CASCADE,
    quantity    INT NOT NULL DEFAULT 1,
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, printing_id)
);

CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_printing_id ON user_collections(printing_id);
