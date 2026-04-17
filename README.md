# CCGVault

A multi-TCG collection and deck management platform supporting 20+ trading card games. Browse cards, track your collection, build decks, create wishlists, and read game-related blog posts — all in one place.

**Live site:** [ccgvault.io](https://ccgvault.io)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend API | Go, Chi v5, pgx v5 |
| Frontend | React 19, Vite, Tailwind CSS |
| Mobile | React Native, Expo |
| Database | PostgreSQL 16 |
| Auth | JWT |
| Data Ingestion | Python 3 |
| Email | Resend |
| Deployment | Cloud VPS (API), Cloudflare Pages (frontend), Cloudflare R2 (images) |

---

## Project Structure

```
CCGDB/
├── api-go/          # Go REST API
├── frontend/        # React web app
├── mobile/          # React Native app (Expo)
├── ingestion/       # Python scripts for importing card data
├── db/              # PostgreSQL migration files
├── assets/          # Card images (local dev)
├── backup.sh        # Nightly database backup script
└── docker-compose.yml
```

---

## Supported Games

Magic: The Gathering, Pokémon, Yu-Gi-Oh, One Piece, Digimon, Lorcana, Flesh and Blood, Star Wars Unlimited, Star Wars Decipher, Star Trek (1e & 2e), Weiss Schwarz, Vanguard, Force of Will, Final Fantasy TCG, Grand Archive, Altered, Sorcery, Metazoo, Naruto CCG, Dragon Ball Z CCG, Vampire: The Eternal Struggle, and more.

---

## Features

- Browse and search cards across all supported games
- Track your collection with per-printing quantities
- Build and export deck lists
- Wishlist cards you want to acquire
- Random card discovery
- Blog with rich text editing and game/card tagging
- User authentication with email verification and password reset
- Export collections and decks (CSV, text)

---

## Local Development

### Prerequisites

- Go 1.22+
- Node.js 20+
- Docker (for PostgreSQL)
- Python 3.10+ (for ingestion scripts)

### Setup

1. **Start the database**

```bash
docker-compose up -d
```

2. **Run migrations**

```bash
psql -U your_db_user -d ccgdb -f db/001_initial.sql
# run remaining migration files in order
```

3. **Start the API**

```bash
cd api-go
cp ../.env.example .env  # fill in your values
go run .
```

4. **Start the frontend**

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the API at `http://localhost:8000`.

### Environment Variables

Create a `.env` file in the project root:

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=ccgdb
JWT_SECRET=your_jwt_secret
PORT=8000
ASSET_BASE_URL=http://localhost:8000/assets
RESEND_API_KEY=your_resend_key   # optional for local dev
APP_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Data Ingestion

Each game has its own ingestion script in `ingestion/`. Scripts pull card data from public APIs or structured sources and populate the database.

```bash
cd ingestion
pip install -r requirements.txt

# Example: ingest MTG data
python mtg/ingest_mtg.py

# Download card images
python download_images.py mtg
python download_images.py all    # all games
python download_images.py status # check progress
```

---

## Deployment

- **API** — Go binary running on a cloud VPS behind a reverse proxy
- **Frontend** — Deployed to Cloudflare Pages via `wrangler pages deploy`
- **Images** — Stored in Cloudflare R2
- **Database** — PostgreSQL in Docker with nightly backups via `backup.sh`

---

## License

CCGVault is an independent fan site and is not affiliated with, endorsed by, or sponsored by any card game publisher. All card names, images, and game content are the property of their respective owners.
