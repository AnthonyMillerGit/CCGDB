#!/usr/bin/env bash
# Deploy the Go API binary to production (EC2 + systemd).
#
# Usage:
#   ./scripts/deploy_api.sh
#
# Strategy:
#   1. Cross-compile the Go binary for the server (Linux/amd64) — NOT the Mac's
#      arch. Building without GOOS/GOARCH produces a darwin/arm64 binary that
#      fails on EC2 with status=203/EXEC.
#   2. SCP it to a temp path on EC2 (can't overwrite the live binary while it's
#      running — Linux returns "Text file busy").
#   3. On EC2: back up the current binary, stop the service, move the new binary
#      into place, start the service, and verify it came back healthy. If the new
#      binary fails to start, roll back to the backup automatically.
#
# Frontend deploy is the `deploy` alias (~/.zshrc); card data is
# deploy_carddata.sh. This is the API counterpart.

set -euo pipefail

EC2_HOST="ubuntu@52.8.18.142"
EC2_KEY="/Users/anthonymiller/Documents/AWS/ccgvault-key.pem"
REMOTE_BIN="/home/ubuntu/CCGDB/api-go/ccgvault"
SERVICE="ccgvault"
LOCAL_BIN="/tmp/ccgvault-linux-$(date +%Y%m%d_%H%M%S)"
API_HEALTH_URL="https://api.ccgvault.io/"

echo "=== Building API for Linux/amd64 ==="
( cd "$(dirname "$0")/../api-go" \
  && caffeinate -i env GOOS=linux GOARCH=amd64 go build -o "$LOCAL_BIN" . )
echo "Built $LOCAL_BIN ($(du -sh "$LOCAL_BIN" | cut -f1))"

echo ""
echo "=== Copying to EC2 (temp path) ==="
caffeinate -i scp -i "$EC2_KEY" "$LOCAL_BIN" "${EC2_HOST}:/tmp/ccgvault-new"

echo ""
echo "=== Swapping binary + restarting service on EC2 ==="
ssh -i "$EC2_KEY" "$EC2_HOST" bash <<REMOTE
set -euo pipefail
REMOTE_BIN="$REMOTE_BIN"
SERVICE="$SERVICE"

echo "Step 1: Back up current binary..."
cp "\$REMOTE_BIN" "\${REMOTE_BIN}.bak"
echo "  saved \${REMOTE_BIN}.bak"

echo "Step 2: Stop service, swap binary, start service..."
sudo systemctl stop "\$SERVICE"
mv /tmp/ccgvault-new "\$REMOTE_BIN"
chmod +x "\$REMOTE_BIN"
sudo systemctl start "\$SERVICE"

echo "Step 3: Verify..."
sleep 2
if systemctl is-active --quiet "\$SERVICE"; then
  echo "  service is active"
else
  echo "  !! service FAILED to start — rolling back to backup binary"
  sudo systemctl stop "\$SERVICE" || true
  mv "\${REMOTE_BIN}.bak" "\$REMOTE_BIN"
  sudo systemctl start "\$SERVICE"
  echo "  rolled back. Recent logs:"
  sudo journalctl -u "\$SERVICE" -n 20 --no-pager
  exit 1
fi

rm -f "\${REMOTE_BIN}.bak"
echo "Done on EC2."
REMOTE

echo ""
echo "=== Health check ($API_HEALTH_URL) ==="
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$API_HEALTH_URL" || true)
echo "  api.ccgvault.io -> $code"
[ "$code" = "200" ] && echo "API is live." || echo "WARNING: expected 200. Check journalctl on EC2."

rm -f "$LOCAL_BIN"
echo ""
echo "Local build artifact cleaned up. API deployment complete."
