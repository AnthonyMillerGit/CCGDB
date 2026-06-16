  -- ============================================================
  -- 1. POSTS TABLE
  -- ============================================================

  CREATE TABLE IF NOT EXISTS posts (
      id           SERIAL PRIMARY KEY,
      author_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      slug         TEXT NOT NULL UNIQUE,
      excerpt      TEXT,
      body         JSONB NOT NULL DEFAULT '{}',
      published_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS posts_published_at_idx ON posts (published_at DESC);
  CREATE INDEX IF NOT EXISTS posts_slug_idx ON posts (slug);

  -- ============================================================
  -- 2. TAGGING TABLES
  -- ============================================================

  CREATE TABLE IF NOT EXISTS post_game_tags (
      post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, game_id)
  );

  CREATE TABLE IF NOT EXISTS post_set_tags (
      post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      set_id  INT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, set_id)
  );

  CREATE TABLE IF NOT EXISTS post_card_tags (
      post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      card_id INT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, card_id)
  );

  -- ============================================================
  -- 3. VERIFY
  -- ============================================================

  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('posts', 'post_game_tags', 'post_set_tags', 'post_card_tags')
  ORDER BY table_name;
  EOF)
  ⎿  (No output)