CREATE TABLE games (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sets (
    id              SERIAL PRIMARY KEY,
    game_id         INTEGER REFERENCES games(id),
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(20),
    release_date    DATE,
    total_cards     INTEGER,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (game_id, code)
);

CREATE TABLE cards (
    id              SERIAL PRIMARY KEY,
    game_id         INTEGER REFERENCES games(id),
    name            VARCHAR(300) NOT NULL,
    rules_text      TEXT,
    card_type       VARCHAR(100),
    attributes      JSONB,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE printings (
    id                  SERIAL PRIMARY KEY,
    card_id             INTEGER REFERENCES cards(id),
    set_id              INTEGER REFERENCES sets(id),
    collector_number    VARCHAR(20),
    rarity              VARCHAR(50),
    image_url           TEXT,
    artist              VARCHAR(200),
    flavor_text         TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_printing UNIQUE (card_id, set_id, collector_number)
);