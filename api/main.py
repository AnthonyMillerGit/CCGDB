from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg2
import psycopg2.extras
import os
import secrets
import smtplib
from email.message import EmailMessage
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, EmailStr
import bcrypt
from jose import JWTError, jwt

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

# ── Config ────────────────────────────────────────────────────────────────────

APP_NAME = "CardVault"

JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))

APP_URL = os.getenv("APP_URL", "http://localhost:5173")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")

bearer_scheme = HTTPBearer(auto_error=False)

# ── Pydantic models ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

class CollectionAddRequest(BaseModel):
    printing_id: int
    quantity: int = 1

class CollectionUpdateRequest(BaseModel):
    quantity: int

class CreateDeckRequest(BaseModel):
    game_id: int
    name: str
    description: str = ""

class UpdateDeckRequest(BaseModel):
    name: str = None
    description: str = None

class DeckCardRequest(BaseModel):
    card_id: int
    quantity: int = 1

class DeckCardUpdateRequest(BaseModel):
    quantity: int

# ── Utilities ─────────────────────────────────────────────────────────────────

def send_email(to: str, subject: str, body: str):
    if not SMTP_HOST:
        print(f"\n── DEV EMAIL ──────────────────────────\nTo: {to}\nSubject: {subject}\n\n{body}\n───────────────────────────────────────\n")
        return
    msg = EmailMessage()
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(msg)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ── Database ──────────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        cursor_factory=psycopg2.extras.RealDictCursor
    )

def get_db_conn():
    """FastAPI dependency — yields a DB connection and closes it when done."""
    conn = get_db()
    try:
        yield conn
    finally:
        conn.close()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    conn=Depends(get_db_conn),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    with conn.cursor() as cur:
        cur.execute("SELECT id, username, email, is_verified, created_at FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ── App setup ─────────────────────────────────────────────────────────────────

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

# Serve card images and card backs from the project-level assets/ folder.
# In production replace with S3 — just update ASSET_BASE_URL in .env and
# the image URLs stored in the printings table; no code changes needed.
_assets_dir = Path(__file__).resolve().parents[1] / 'assets'
if _assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

# ── Games ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "CCG Platform API", "version": "0.1.0"}

@app.get("/api/games")
def get_games(conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, slug, description, card_back_image FROM games ORDER BY name")
        return cur.fetchall()

@app.get("/api/games/{slug}")
def get_game(slug: str, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, slug, description FROM games WHERE slug = %s", (slug,))
        game = cur.fetchone()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game

@app.get("/api/games/{slug}/sets")
def get_sets(slug: str, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT s.id, s.name, s.code, s.release_date, s.total_cards, s.icon_url, s.set_type
            FROM sets s
            JOIN games g ON g.id = s.game_id
            WHERE g.slug = %s
            ORDER BY s.release_date DESC NULLS LAST
        """, (slug,))
        return cur.fetchall()

# ── Sets ──────────────────────────────────────────────────────────────────────

@app.get("/api/sets/{set_id}")
def get_set(set_id: int, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT s.id, s.name, s.code, s.release_date,
                   g.name AS game_name, g.slug AS game_slug
            FROM sets s
            JOIN games g ON g.id = s.game_id
            WHERE s.id = %s
        """, (set_id,))
        set_data = cur.fetchone()
    if not set_data:
        raise HTTPException(status_code=404, detail="Set not found")
    return set_data

@app.get("/api/sets/{set_id}/cards")
def get_cards_for_set(set_id: int, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT ON (c.name)
                   c.id, c.name, c.card_type, c.rules_text,
                   p.id AS printing_id, p.collector_number, p.rarity, p.image_url, p.artist
            FROM cards c
            JOIN printings p ON p.card_id = c.id
            WHERE p.set_id = %s
            ORDER BY c.name, p.image_url NULLS LAST, p.id
        """, (set_id,))
        return cur.fetchall()

# ── Cards ─────────────────────────────────────────────────────────────────────

@app.get("/api/cards/search")
def search_cards(name: str, game: str = None, conn=Depends(get_db_conn)):
    params = [f"%{name}%"]
    game_filter = ""
    if game:
        game_filter = "AND g.slug = %s"
        params.append(game)
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT DISTINCT ON (c.id)
                c.id, c.name, c.card_type, c.rules_text,
                g.slug AS game, g.name AS game_name,
                p.image_url
            FROM cards c
            JOIN games g ON g.id = c.game_id
            LEFT JOIN printings p ON p.card_id = c.id
            WHERE c.name ILIKE %s {game_filter}
            ORDER BY c.id, p.image_url NULLS LAST
            LIMIT 50
        """, params)
        return cur.fetchall()

@app.get("/api/cards/{card_id}")
def get_card(card_id: int, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT c.id, c.name, c.card_type, c.rules_text, c.attributes,
                   g.id AS game_id, g.name AS game, g.slug AS game_slug
            FROM cards c
            JOIN games g ON g.id = c.game_id
            WHERE c.id = %s
        """, (card_id,))
        card = cur.fetchone()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        cur.execute("""
            SELECT p.id, p.collector_number, p.rarity, p.image_url,
                   p.back_image_url, p.artist, p.flavor_text,
                   p.set_id, s.name AS set_name, s.code AS set_code,
                   s.release_date
            FROM printings p
            JOIN sets s ON s.id = p.set_id
            WHERE p.card_id = %s
            ORDER BY s.release_date
        """, (card_id,))
        printings = cur.fetchall()
    return {**card, "printings": printings}

@app.get("/api/printings/{printing_id}")
def get_printing(printing_id: int, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT p.id, p.collector_number, p.rarity, p.image_url,
                   p.back_image_url, p.artist, p.flavor_text,
                   s.name AS set_name, s.code AS set_code, s.release_date,
                   c.id AS card_id, c.name AS card_name, c.card_type,
                   c.rules_text, c.attributes,
                   g.name AS game, g.slug AS game_slug
            FROM printings p
            JOIN sets s ON s.id = p.set_id
            JOIN cards c ON c.id = p.card_id
            JOIN games g ON g.id = c.game_id
            WHERE p.id = %s
        """, (printing_id,))
        printing = cur.fetchone()
    if not printing:
        raise HTTPException(status_code=404, detail="Printing not found")
    return printing

@app.get("/api/search/suggestions")
def search_suggestions(q: str, limit: int = 8, conn=Depends(get_db_conn)):
    if len(q) < 2:
        return []
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT ON (c.name, g.slug)
                c.id, c.name, c.card_type, g.name AS game, g.slug AS game_slug,
                p.image_url
            FROM cards c
            JOIN games g ON g.id = c.game_id
            JOIN printings p ON p.card_id = c.id
            WHERE c.name ILIKE %s
            ORDER BY c.name, g.slug, p.image_url NULLS LAST, c.id
            LIMIT %s
        """, (f"%{q}%", limit))
        return cur.fetchall()

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register", status_code=201)
def register(body: RegisterRequest, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s OR username = %s", (body.email, body.username))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Username or email already in use")
        cur.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id, username, email",
            (body.username, body.email, hash_password(body.password))
        )
        user = cur.fetchone()
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=24)
        cur.execute(
            "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (user["id"], token, expires)
        )
        conn.commit()
    send_email(
        body.email,
        f"Verify your {APP_NAME} email",
        f"Hi {body.username},\n\nPlease verify your email address by clicking the link below:\n\n"
        f"{APP_URL}/verify-email?token={token}\n\nThis link expires in 24 hours.\n\nThanks,\n{APP_NAME}"
    )
    return {
        "token": create_token(user["id"]),
        "user": {"id": user["id"], "username": user["username"], "email": user["email"], "is_verified": False}
    }

@app.post("/api/auth/login")
def login(body: LoginRequest, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("SELECT id, username, email, password_hash, is_verified FROM users WHERE email = %s", (body.email,))
        user = cur.fetchone()
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "token": create_token(user["id"]),
        "user": {"id": user["id"], "username": user["username"], "email": user["email"], "is_verified": user["is_verified"]}
    }

@app.get("/api/auth/me")
def me(current_user=Depends(get_current_user)):
    return current_user

@app.get("/api/auth/verify-email")
def verify_email(token: str, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, user_id, expires_at, used_at
            FROM email_verification_tokens WHERE token = %s
        """, (token,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Invalid verification link")
        if row["used_at"]:
            raise HTTPException(status_code=400, detail="This link has already been used")
        if row["expires_at"] < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This link has expired")
        cur.execute("UPDATE users SET is_verified = TRUE WHERE id = %s", (row["user_id"],))
        cur.execute("UPDATE email_verification_tokens SET used_at = NOW() WHERE id = %s", (row["id"],))
        conn.commit()
    return {"message": "Email verified successfully"}

@app.post("/api/auth/resend-verification")
def resend_verification(current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    if current_user["is_verified"]:
        raise HTTPException(status_code=400, detail="Email is already verified")
    with conn.cursor() as cur:
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=24)
        cur.execute(
            "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (current_user["id"], token, expires)
        )
        conn.commit()
    send_email(
        current_user["email"],
        f"Verify your {APP_NAME} email",
        f"Hi {current_user['username']},\n\nPlease verify your email address:\n\n"
        f"{APP_URL}/verify-email?token={token}\n\nThis link expires in 24 hours.\n\nThanks,\n{APP_NAME}"
    )
    return {"message": "Verification email sent"}

@app.post("/api/auth/forgot-password")
def forgot_password(body: ForgotPasswordRequest, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("SELECT id, username FROM users WHERE email = %s", (body.email,))
        user = cur.fetchone()
    # Always return 200 to avoid leaking whether the email exists
    if not user:
        return {"message": "If that email is registered, you'll receive a reset link shortly"}
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (user["id"], token, expires)
        )
        conn.commit()
    send_email(
        body.email,
        f"Reset your {APP_NAME} password",
        f"Hi {user['username']},\n\nClick the link below to reset your password:\n\n"
        f"{APP_URL}/reset-password?token={token}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\nThanks,\n{APP_NAME}"
    )
    return {"message": "If that email is registered, you'll receive a reset link shortly"}

@app.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordRequest, conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, user_id, expires_at, used_at
            FROM password_reset_tokens WHERE token = %s
        """, (body.token,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Invalid reset link")
        if row["used_at"]:
            raise HTTPException(status_code=400, detail="This link has already been used")
        if row["expires_at"] < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This link has expired")
        cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hash_password(body.password), row["user_id"]))
        cur.execute("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = %s", (row["id"],))
        conn.commit()
    return {"message": "Password updated successfully"}

# ── Collection ────────────────────────────────────────────────────────────────

@app.get("/api/users/me/collection")
def get_collection(current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT
                uc.id, uc.printing_id, uc.quantity, uc.added_at,
                p.image_url, p.rarity, p.collector_number,
                c.id AS card_id, c.name AS card_name,
                s.id AS set_id, s.name AS set_name,
                g.id AS game_id, g.name AS game_name, g.slug AS game_slug
            FROM user_collections uc
            JOIN printings p ON p.id = uc.printing_id
            JOIN cards c ON c.id = p.card_id
            JOIN sets s ON s.id = p.set_id
            JOIN games g ON g.id = c.game_id
            WHERE uc.user_id = %s
            ORDER BY g.name, s.name, c.name
        """, (current_user["id"],))
        rows = cur.fetchall()
    # Group by game
    games: dict = {}
    for row in rows:
        gid = row["game_id"]
        if gid not in games:
            games[gid] = {"game_id": gid, "game_name": row["game_name"], "game_slug": row["game_slug"], "cards": []}
        games[gid]["cards"].append({
            "id": row["id"],
            "printing_id": row["printing_id"],
            "quantity": row["quantity"],
            "added_at": row["added_at"],
            "image_url": row["image_url"],
            "rarity": row["rarity"],
            "collector_number": row["collector_number"],
            "card_id": row["card_id"],
            "card_name": row["card_name"],
            "set_id": row["set_id"],
            "set_name": row["set_name"],
        })
    return list(games.values())

@app.post("/api/users/me/collection", status_code=201)
def add_to_collection(body: CollectionAddRequest, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM printings WHERE id = %s", (body.printing_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Printing not found")
        cur.execute("""
            INSERT INTO user_collections (user_id, printing_id, quantity)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, printing_id)
            DO UPDATE SET quantity = user_collections.quantity + EXCLUDED.quantity
            RETURNING id, printing_id, quantity
        """, (current_user["id"], body.printing_id, body.quantity))
        result = cur.fetchone()
        conn.commit()
    return result

@app.patch("/api/users/me/collection/{printing_id}")
def update_collection_quantity(printing_id: int, body: CollectionUpdateRequest, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE user_collections SET quantity = %s
            WHERE user_id = %s AND printing_id = %s
            RETURNING id, printing_id, quantity
        """, (body.quantity, current_user["id"], printing_id))
        result = cur.fetchone()
        conn.commit()
    if not result:
        raise HTTPException(status_code=404, detail="Item not in collection")
    return result

@app.delete("/api/users/me/collection/{printing_id}", status_code=204)
def remove_from_collection(printing_id: int, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM user_collections WHERE user_id = %s AND printing_id = %s",
            (current_user["id"], printing_id)
        )
        conn.commit()

@app.get("/api/users/me/collection/set/{set_id}")
def get_collection_for_set(set_id: int, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT uc.printing_id, uc.quantity
            FROM user_collections uc
            JOIN printings p ON p.id = uc.printing_id
            WHERE uc.user_id = %s AND p.set_id = %s
        """, (current_user["id"], set_id))
        rows = cur.fetchall()
    return {row["printing_id"]: row["quantity"] for row in rows}

@app.get("/api/users/me/collection/printing/{printing_id}")
def get_collection_item(printing_id: int, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, printing_id, quantity, added_at
            FROM user_collections
            WHERE user_id = %s AND printing_id = %s
        """, (current_user["id"], printing_id))
        return cur.fetchone()

# ── Decks ─────────────────────────────────────────────────────────────────────

def _get_deck_or_403(cur, deck_id: int, user_id: int):
    cur.execute("SELECT id, user_id, game_id, name, description FROM decks WHERE id = %s", (deck_id,))
    deck = cur.fetchone()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if deck["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your deck")
    return deck

@app.get("/api/users/me/decks")
def list_decks(current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT d.id, d.name, d.description, d.created_at, d.updated_at,
                   g.id AS game_id, g.name AS game_name, g.slug AS game_slug,
                   COUNT(dc.id) AS card_count,
                   COALESCE(SUM(dc.quantity), 0) AS total_cards
            FROM decks d
            JOIN games g ON g.id = d.game_id
            LEFT JOIN deck_cards dc ON dc.deck_id = d.id
            WHERE d.user_id = %s
            GROUP BY d.id, g.id
            ORDER BY d.updated_at DESC
        """, (current_user["id"],))
        return cur.fetchall()

@app.post("/api/users/me/decks", status_code=201)
def create_deck(body: CreateDeckRequest, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM games WHERE id = %s", (body.game_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Game not found")
        cur.execute("""
            INSERT INTO decks (user_id, game_id, name, description)
            VALUES (%s, %s, %s, %s)
            RETURNING id, name, description, game_id, created_at
        """, (current_user["id"], body.game_id, body.name.strip(), body.description))
        deck = cur.fetchone()
        conn.commit()
    return deck

@app.get("/api/decks/{deck_id}")
def get_deck(deck_id: int, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        deck = _get_deck_or_403(cur, deck_id, current_user["id"])
        cur.execute("""
            SELECT dc.id, dc.card_id, dc.quantity,
                   c.name AS card_name, c.card_type, c.attributes,
                   g.name AS game_name, g.slug AS game_slug,
                   p.image_url
            FROM deck_cards dc
            JOIN cards c ON c.id = dc.card_id
            JOIN games g ON g.id = c.game_id
            LEFT JOIN LATERAL (
                SELECT image_url FROM printings
                WHERE card_id = c.id AND image_url IS NOT NULL
                ORDER BY id LIMIT 1
            ) p ON TRUE
            WHERE dc.deck_id = %s
            ORDER BY c.card_type, c.name
        """, (deck_id,))
        cards = cur.fetchall()
        cur.execute("SELECT id AS game_id, name AS game_name, slug AS game_slug FROM games WHERE id = %s", (deck["game_id"],))
        game = cur.fetchone()
    return {**deck, **game, "cards": cards}

@app.patch("/api/decks/{deck_id}")
def update_deck(deck_id: int, body: UpdateDeckRequest, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        _get_deck_or_403(cur, deck_id, current_user["id"])
        if body.name is not None:
            cur.execute("UPDATE decks SET name = %s, updated_at = NOW() WHERE id = %s", (body.name.strip(), deck_id))
        if body.description is not None:
            cur.execute("UPDATE decks SET description = %s, updated_at = NOW() WHERE id = %s", (body.description, deck_id))
        conn.commit()
    return {"message": "Deck updated"}

@app.delete("/api/decks/{deck_id}", status_code=204)
def delete_deck(deck_id: int, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        _get_deck_or_403(cur, deck_id, current_user["id"])
        cur.execute("DELETE FROM decks WHERE id = %s", (deck_id,))
        conn.commit()

@app.post("/api/decks/{deck_id}/cards", status_code=201)
def add_card_to_deck(deck_id: int, body: DeckCardRequest, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        deck = _get_deck_or_403(cur, deck_id, current_user["id"])
        cur.execute("SELECT id, game_id FROM cards WHERE id = %s", (body.card_id,))
        card = cur.fetchone()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        if card["game_id"] != deck["game_id"]:
            raise HTTPException(status_code=400, detail="Card does not belong to this deck's game")
        cur.execute("""
            INSERT INTO deck_cards (deck_id, card_id, quantity)
            VALUES (%s, %s, %s)
            ON CONFLICT (deck_id, card_id)
            DO UPDATE SET quantity = deck_cards.quantity + EXCLUDED.quantity
            RETURNING id, card_id, quantity
        """, (deck_id, body.card_id, body.quantity))
        result = cur.fetchone()
        cur.execute("UPDATE decks SET updated_at = NOW() WHERE id = %s", (deck_id,))
        conn.commit()
    return result

@app.patch("/api/decks/{deck_id}/cards/{card_id}")
def update_deck_card(deck_id: int, card_id: int, body: DeckCardUpdateRequest, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        _get_deck_or_403(cur, deck_id, current_user["id"])
        cur.execute("""
            UPDATE deck_cards SET quantity = %s
            WHERE deck_id = %s AND card_id = %s
            RETURNING id, card_id, quantity
        """, (body.quantity, deck_id, card_id))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Card not in deck")
        cur.execute("UPDATE decks SET updated_at = NOW() WHERE id = %s", (deck_id,))
        conn.commit()
    return result

@app.delete("/api/decks/{deck_id}/cards/{card_id}", status_code=204)
def remove_card_from_deck(deck_id: int, card_id: int, current_user=Depends(get_current_user), conn=Depends(get_db_conn)):
    with conn.cursor() as cur:
        _get_deck_or_403(cur, deck_id, current_user["id"])
        cur.execute("DELETE FROM deck_cards WHERE deck_id = %s AND card_id = %s", (deck_id, card_id))
        cur.execute("UPDATE decks SET updated_at = NOW() WHERE id = %s", (deck_id,))
        conn.commit()
