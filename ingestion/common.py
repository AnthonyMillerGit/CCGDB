"""
Shared utilities for CCGDB ingestion scripts.

Usage in a standard game script (ingestion/game/ingest_game.py):
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from common import get_db_connection, upsert_game, ingestion_db

For nested scripts (ingestion/game/edition/ingest_game.py), use parents[2].
"""

import os
import psycopg2
from contextlib import contextmanager
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / '.env')


def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD")
    )


@contextmanager
def ingestion_db():
    """Open a DB connection and handle rollback/close automatically.

    Usage:
        with ingestion_db() as conn:
            game_id = upsert_game(conn, ...)
            ...
            conn.commit()
    """
    conn = get_db_connection()
    try:
        yield conn
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()


def upsert_game(conn, name, slug, description, card_back_image=None):
    """Insert or look up a game by slug. Returns the game's DB id."""
    with conn.cursor() as cur:
        if card_back_image is not None:
            cur.execute("""
                INSERT INTO games (name, slug, description, card_back_image)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (slug) DO NOTHING
                RETURNING id;
            """, (name, slug, description, card_back_image))
        else:
            cur.execute("""
                INSERT INTO games (name, slug, description)
                VALUES (%s, %s, %s)
                ON CONFLICT (slug) DO NOTHING
                RETURNING id;
            """, (name, slug, description))
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT id FROM games WHERE slug = %s", (slug,))
        return cur.fetchone()[0]
