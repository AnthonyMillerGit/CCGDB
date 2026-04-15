#!/usr/bin/env python3
"""
Download card images from external CDNs and store them locally.
Updates the database image_url to point to the local path when done.

Fully resumable — skips files already on disk and rows already updated.

Usage:
    python download_images.py mtg
    python download_images.py pokemon
    python download_images.py yugioh
    python download_images.py all        # runs all priority games in order
    python download_images.py status     # show download progress for all games
"""

import os
import sys
import time
import hashlib
import requests
import psycopg2
import psycopg2.extras
import psycopg2.extensions
from pathlib import Path
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')

ASSET_BASE_URL = os.getenv('ASSET_BASE_URL', 'http://localhost:8000/assets').rstrip('/')
ASSETS_DIR = ROOT / 'assets'

# Concurrent downloads per game — respectful to external servers
MAX_WORKERS = 6
TIMEOUT = 30
RETRY_LIMIT = 3

# Games to process with 'all', in priority order
PRIORITY_GAMES = [
    'mtg',
    'pokemon',
    'yugioh',
    'starwars_decipher',
    'weissschwarz',
    'vanguard',
    'digimon',
    'fow',
    'fab',
    'swu',
    'startrek_1e',
    'startrek_2e',
    'onepiece',
    'metazoo',
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(
        host='localhost',
        database=os.getenv('POSTGRES_DB'),
        user=os.getenv('POSTGRES_USER'),
        password=os.getenv('POSTGRES_PASSWORD'),
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def url_to_filename(url):
    """
    Derive a safe, unique local filename from a URL.

    Short numeric basenames (e.g. Pokemon's "102.png") get prefixed with
    their parent directory so they stay unique across sets:
        https://images.pokemontcg.io/dp4/102.png  →  dp4_102.png

    Long basenames (UUIDs, card IDs) are used as-is:
        https://cards.scryfall.io/.../61a51b67-...jpg  →  61a51b67-....jpg
    """
    path = urlparse(url).path
    parts = [p for p in path.split('/') if p]
    if not parts:
        return hashlib.md5(url.encode()).hexdigest() + '.jpg'

    basename = parts[-1].split('?')[0]  # strip any stray query params
    stem = os.path.splitext(basename)[0]

    if len(stem) < 20 and len(parts) >= 2:
        return f"{parts[-2]}_{basename}"
    return basename


def download_one(url, dest_path, session):
    """Download a single image. Returns True on success, False on permanent failure."""
    if dest_path.exists():
        return True

    for attempt in range(RETRY_LIMIT):
        try:
            resp = session.get(url, timeout=TIMEOUT, stream=True)
            if resp.status_code == 200:
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                tmp = dest_path.with_suffix('.tmp')
                with open(tmp, 'wb') as f:
                    for chunk in resp.iter_content(8192):
                        f.write(chunk)
                tmp.rename(dest_path)
                return True
            elif resp.status_code == 404:
                return False  # no point retrying
            else:
                time.sleep(2 ** attempt)
        except Exception:
            if attempt < RETRY_LIMIT - 1:
                time.sleep(2 ** attempt)
    return False


def flush_with_retry(cur, conn, updates, retries=5):
    """Commit a batch of URL updates, retrying on deadlock."""
    for attempt in range(retries):
        try:
            cur.executemany(
                "UPDATE printings SET image_url = %s WHERE id = %s",
                updates,
            )
            conn.commit()
            return
        except psycopg2.errors.DeadlockDetected:
            conn.rollback()
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise


# ── Core download logic ───────────────────────────────────────────────────────

def download_game(slug):
    conn = get_db()
    cur = conn.cursor()

    # Only fetch printings that still point to external URLs
    cur.execute("""
        SELECT p.id, p.image_url
        FROM printings p
        JOIN cards c ON c.id = p.card_id
        JOIN games g ON g.id = c.game_id
        WHERE g.slug = %s
          AND p.image_url IS NOT NULL
          AND p.image_url NOT LIKE %s
        ORDER BY p.id
    """, (slug, ASSET_BASE_URL + '%'))

    rows = cur.fetchall()
    total = len(rows)

    if total == 0:
        already = count_local(slug, cur)
        print(f"  {slug}: already up to date ({already:,} local images)")
        conn.close()
        return

    print(f"\n{'='*60}")
    print(f"  {slug}: {total:,} images to download")
    print(f"{'='*60}")

    game_dir = ASSETS_DIR / 'cards' / slug
    game_dir.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers['User-Agent'] = 'CCGVault/1.0 (+https://ccgvault.io)'

    downloaded = skipped = failed = 0
    pending_updates = []

    def process(row):
        url = row['image_url']
        filename = url_to_filename(url)
        dest = game_dir / filename
        local_url = f"{ASSET_BASE_URL}/cards/{slug}/{filename}"
        success = download_one(url, dest, session)
        return row['id'], local_url, success, dest.exists() and dest.stat().st_size == 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(process, row): row for row in rows}
        for i, future in enumerate(as_completed(futures), 1):
            printing_id, local_url, success, was_existing = future.result()
            if success:
                pending_updates.append((local_url, printing_id))
                if was_existing:
                    skipped += 1
                else:
                    downloaded += 1
            else:
                failed += 1

            # Flush DB updates and print progress every 500 images
            if i % 500 == 0 or i == total:
                pct = i / total * 100
                print(f"  [{i:>{len(str(total))}}/{total}] {pct:.1f}%  "
                      f"downloaded={downloaded:,}  failed={failed:,}")
                if pending_updates:
                    flush_with_retry(cur, conn, pending_updates)
                    pending_updates = []

    # Final flush
    if pending_updates:
        flush_with_retry(cur, conn, pending_updates)

    conn.close()
    print(f"\n  {slug} done — downloaded: {downloaded:,}, "
          f"skipped (already on disk): {skipped:,}, failed: {failed:,}")


def count_local(slug, cur):
    cur.execute("""
        SELECT COUNT(*) FROM printings p
        JOIN cards c ON c.id = p.card_id
        JOIN games g ON g.id = c.game_id
        WHERE g.slug = %s AND p.image_url LIKE %s
    """, (slug, ASSET_BASE_URL + '%'))
    return cur.fetchone()['count']


# ── Status report ─────────────────────────────────────────────────────────────

def show_status():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT g.slug,
               COUNT(p.id) FILTER (WHERE p.image_url IS NOT NULL) AS total,
               COUNT(p.id) FILTER (WHERE p.image_url LIKE %s)     AS local,
               COUNT(p.id) FILTER (WHERE p.image_url IS NOT NULL
                                     AND p.image_url NOT LIKE %s)  AS remote
        FROM games g
        LEFT JOIN cards c ON c.game_id = g.id
        LEFT JOIN printings p ON p.card_id = c.id
        WHERE g.slug = ANY(%s)
        GROUP BY g.slug
        ORDER BY remote DESC, total DESC
    """, (ASSET_BASE_URL + '%', ASSET_BASE_URL + '%', PRIORITY_GAMES))

    rows = cur.fetchall()
    conn.close()

    print(f"\n{'Game':<30} {'Total':>8} {'Local':>8} {'Remote':>8} {'Done':>6}")
    print('-' * 65)
    for r in rows:
        total = r['total'] or 0
        local = r['local'] or 0
        pct = (local / total * 100) if total else 0
        print(f"{r['slug']:<30} {total:>8,} {local:>8,} {r['remote']:>8,} {pct:>5.1f}%")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    target = sys.argv[1]

    if target == 'status':
        show_status()
    elif target == 'all':
        for slug in PRIORITY_GAMES:
            download_game(slug)
        print("\nAll games complete.")
    elif target in PRIORITY_GAMES or True:  # allow any slug
        download_game(target)
