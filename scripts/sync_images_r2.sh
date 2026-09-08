#!/usr/bin/env bash
# Upload new card images and card-backs from local assets/ to Cloudflare R2.
#
# Usage:
#   ./scripts/sync_images_r2.sh                     # every game (slow — see note)
#   ./scripts/sync_images_r2.sh mtg swu grand-archive   # only these games
#
# PREFER THE SCOPED FORM. `aws s3 sync` diffs by listing BOTH sides in full, so a
# bare run walks all ~520k local files and every remote object just to find the
# handful that changed — the listing, not the upload, is nearly all the runtime.
# Pass the same game slugs you passed to ingestion/update.sh and it only lists
# those prefixes. Dead games whose sets last changed 20 years ago never need it.
#
# Required env vars (set once in ~/.zshrc or export before running):
#   R2_ACCOUNT_ID       — Cloudflare account ID (32-char hex, from R2 dashboard)
#   R2_ACCESS_KEY_ID    — R2 API token Access Key ID
#   R2_SECRET_ACCESS_KEY — R2 API token Secret Access Key
#
# The script uses `aws s3 sync` pointed at the R2 S3-compatible endpoint.
# Only new/changed files are uploaded (size-based comparison).
# Runs under caffeinate so the Mac won't sleep mid-upload.

set -euo pipefail

BUCKET="ccgvault-assets"
ASSETS_ROOT="$(cd "$(dirname "$0")/.." && pwd)/assets"
LOCAL_ASSETS_DIR="$ASSETS_ROOT/cards"
LOCAL_CARDBACKS_DIR="$ASSETS_ROOT/card-backs"

# ── Credentials ───────────────────────────────────────────────────────────────
# Fall back to the saved credentials file so a fresh shell (and weekly.sh) can
# run this without exporting anything by hand. Env vars still win if set.
R2_CREDS_FILE="${R2_CREDS_FILE:-$HOME/Documents/AWS/r2-credentials.txt}"
if [[ -r "$R2_CREDS_FILE" ]]; then
  if [[ -z "${R2_ACCESS_KEY_ID:-}" ]]; then
    R2_ACCESS_KEY_ID=$(grep -i "Access Key ID" "$R2_CREDS_FILE" | grep -iv secret \
      | sed 's/.*: *//' | tr -d ' \r\n')
  fi
  if [[ -z "${R2_SECRET_ACCESS_KEY:-}" ]]; then
    R2_SECRET_ACCESS_KEY=$(grep -i "Secret Access Key" "$R2_CREDS_FILE" \
      | sed 's/.*: *//' | tr -d ' \r\n')
  fi
  if [[ -z "${R2_ACCOUNT_ID:-}" ]]; then
    R2_ACCOUNT_ID=$(grep -iE "account (id|ID)" "$R2_CREDS_FILE" \
      | sed 's/.*: *//' | tr -d ' \r\n')
  fi
fi

if [[ -z "${R2_ACCOUNT_ID:-}" || -z "${R2_ACCESS_KEY_ID:-}" || -z "${R2_SECRET_ACCESS_KEY:-}" ]]; then
  echo "ERROR: Missing R2 credentials. Export these before running:"
  echo "  export R2_ACCOUNT_ID=<your-cloudflare-account-id>"
  echo "  export R2_ACCESS_KEY_ID=<r2-token-access-key>"
  echo "  export R2_SECRET_ACCESS_KEY=<r2-token-secret-key>"
  echo ""
  echo "Get them at: Cloudflare Dashboard → R2 → Manage R2 API Tokens"
  echo "(account id also available from: npx wrangler whoami)"
  echo "Or put them in $R2_CREDS_FILE as 'Account ID: …' / 'Access Key ID: …' /"
  echo "'Secret Access Key: …' lines and they will be picked up automatically."
  exit 1
fi

R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

if [[ ! -d "$LOCAL_ASSETS_DIR" ]]; then
  echo "ERROR: Local assets directory not found: $LOCAL_ASSETS_DIR"
  exit 1
fi

# Game slugs given as args scope the sync to those directories only.
GAMES=("$@")

# Fail loudly on a typo'd slug rather than silently syncing nothing.
for g in "${GAMES[@]}"; do
  if [[ ! -d "$LOCAL_ASSETS_DIR/$g" ]]; then
    echo "ERROR: No image directory for game '$g' ($LOCAL_ASSETS_DIR/$g)"
    echo "       Slugs must match the directory names under assets/cards/."
    exit 1
  fi
done

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

sync_dir() {  # sync_dir <local-dir> <s3-prefix> <label>
  local src="$1" dest="$2" label="$3"
  local count
  count=$(find "$src" -type f | wc -l | tr -d ' ')
  echo "── $label — $count local file(s)"
  caffeinate -i \
    aws s3 sync "$src" "s3://$BUCKET/$dest" \
      --endpoint-url "$R2_ENDPOINT" \
      --size-only \
      --no-progress \
      --region auto
}

echo "=== Syncing card images to R2 ==="
echo "Endpoint: $R2_ENDPOINT"
echo ""

if [[ ${#GAMES[@]} -gt 0 ]]; then
  echo "Scoped to ${#GAMES[@]} game(s): ${GAMES[*]}"
  echo ""
  for g in "${GAMES[@]}"; do
    sync_dir "$LOCAL_ASSETS_DIR/$g" "cards/$g/" "$g"
  done
else
  echo "FULL sync — walking every game. Pass game slugs to scope this."
  echo ""
  sync_dir "$LOCAL_ASSETS_DIR" "cards/" "all games"
fi

# ── Card-back images (game thumbnails) ─────────────────────────────────────────
# Small set, but easy to miss — these are served at assets.ccgvault.io/card-backs/
# and a missing one shows up as a blank card back on the /games page.
if [[ -d "$LOCAL_CARDBACKS_DIR" ]]; then
  echo ""
  echo "=== Syncing card-backs to R2 ==="
  echo "Source : $LOCAL_CARDBACKS_DIR"
  echo "Dest   : s3://$BUCKET/card-backs/"
  echo ""
  sync_dir "$LOCAL_CARDBACKS_DIR" "card-backs/" "card-backs"
fi

echo ""
echo "Sync complete."
