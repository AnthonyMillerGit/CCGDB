from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import psycopg2
import psycopg2.extras
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

# Database connection
def get_db():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        cursor_factory=psycopg2.extras.RealDictCursor
    )

app = FastAPI(
    title="CCG Platform API",
    description="API for collectible card game data",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def root():
    return {"message": "CCG Platform API", "version": "0.1.0"}

# Get all games
@app.get("/api/games")
def get_games():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, slug, description FROM games ORDER BY name")
            return cur.fetchall()
    finally:
        conn.close()

# Get a single game by slug
@app.get("/api/games/{slug}")
def get_game(slug: str):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, slug, description FROM games WHERE slug = %s", (slug,))
            game = cur.fetchone()
            if not game:
                raise HTTPException(status_code=404, detail="Game not found")
            return game
    finally:
        conn.close()

# Get all sets for a game
@app.get("/api/games/{slug}/sets")
def get_sets(slug: str):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT s.id, s.name, s.code, s.release_date, s.total_cards, s.icon_url, s.set_type
                FROM sets s
                JOIN games g ON g.id = s.game_id
                WHERE g.slug = %s
                ORDER BY s.release_date DESC NULLS LAST
            """, (slug,))
            return cur.fetchall()
    finally:
        conn.close()

# Get cards for a set
@app.get("/api/sets/{set_id}/cards")
def get_cards_for_set(set_id: int):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT ON (c.id)
                       c.id, c.name, c.card_type, c.rules_text,
                       p.collector_number, p.rarity, p.image_url, p.artist
                FROM cards c
                JOIN printings p ON p.card_id = c.id
                WHERE p.set_id = %s
                ORDER BY c.id, p.collector_number
            """, (set_id,))
            return cur.fetchall()
    finally:
        conn.close()

# Search cards by name
@app.get("/api/cards/search")
def search_cards(name: str, game: str = None):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if game:
                cur.execute("""
                    SELECT c.id, c.name, c.card_type, c.rules_text, g.slug AS game
                    FROM cards c
                    JOIN games g ON g.id = c.game_id
                    WHERE c.name ILIKE %s AND g.slug = %s
                    ORDER BY c.name
                    LIMIT 50
                """, (f"%{name}%", game))
            else:
                cur.execute("""
                    SELECT c.id, c.name, c.card_type, c.rules_text, g.slug AS game
                    FROM cards c
                    JOIN games g ON g.id = c.game_id
                    WHERE c.name ILIKE %s
                    ORDER BY c.name
                    LIMIT 50
                """, (f"%{name}%",))
            return cur.fetchall()
    finally:
        conn.close()

# Get a single card with all its printings
@app.get("/api/cards/{card_id}")
def get_card(card_id: int):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Get card
            cur.execute("""
                SELECT c.id, c.name, c.card_type, c.rules_text, c.attributes,
                       g.name AS game, g.slug AS game_slug
                FROM cards c
                JOIN games g ON g.id = c.game_id
                WHERE c.id = %s
            """, (card_id,))
            card = cur.fetchone()
            if not card:
                raise HTTPException(status_code=404, detail="Card not found")

            # Get all printings
            cur.execute("""
                SELECT p.id, p.collector_number, p.rarity, p.image_url,
                       p.artist, p.flavor_text, s.name AS set_name, s.code AS set_code
                FROM printings p
                JOIN sets s ON s.id = p.set_id
                WHERE p.card_id = %s
                ORDER BY s.release_date
            """, (card_id,))
            printings = cur.fetchall()

            return {**card, "printings": printings}
    finally:
        conn.close()