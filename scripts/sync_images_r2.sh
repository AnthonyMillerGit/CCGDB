#!/usr/bin/env bash
# Upload new card images from local assets/ to Cloudflare R2.
#
# Usage:
#   ./scripts/sync_images_r2.sh
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
LOCAL_ASSETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/cards"

# ── Validate credentials ───────────────────────────────────────────────────────
if [[ -z "${R2_ACCOUNT_ID:-}" || -z "${R2_ACCESS_KEY_ID:-}" || -z "${R2_SECRET_ACCESS_KEY:-}" ]]; then
  echo "ERROR: Missing R2 credentials. Export these before running:"
  echo "  export R2_ACCOUNT_ID=<your-cloudflare-account-id>"
  echo "  export R2_ACCESS_KEY_ID=<r2-token-access-key>"
  echo "  export R2_SECRET_ACCESS_KEY=<r2-token-secret-key>"
  echo ""
  echo "Get them at: Cloudflare Dashboard → R2 → Manage R2 API Tokens"
  exit 1
fi

R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

if [[ ! -d "$LOCAL_ASSETS_DIR" ]]; then
  echo "ERROR: Local assets directory not found: $LOCAL_ASSETS_DIR"
  exit 1
fi

echo "=== Syncing card images to R2 ==="
echo "Source : $LOCAL_ASSETS_DIR"
echo "Dest   : s3://$BUCKET/cards/"
echo "Endpoint: $R2_ENDPOINT"
echo ""

# Count local files for reference
LOCAL_COUNT=$(find "$LOCAL_ASSETS_DIR" -type f | wc -l | tr -d ' ')
echo "Local image count: $LOCAL_COUNT"
echo ""

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

caffeinate -i \
  aws s3 sync "$LOCAL_ASSETS_DIR" "s3://$BUCKET/cards/" \
    --endpoint-url "$R2_ENDPOINT" \
    --size-only \
    --no-progress \
    --region auto

echo ""
echo "Sync complete."
