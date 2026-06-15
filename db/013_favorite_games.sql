CREATE TABLE IF NOT EXISTS user_favorite_games (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);
