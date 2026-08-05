#!/bin/bash
# i35 ERP deploy script — builds locally, ships to VPS, restarts service.
# Usage: ./deploy.sh
set -euo pipefail

KEY="$HOME/.ssh/n8ndigitalocean"
HOST="root@157.245.192.70"
REMOTE_DIR="/opt/i35erp"
PUBLIC_URL="http://157.245.192.70:3100"

# 1) Make sure the SSH key is loaded (macOS Keychain keeps the passphrase
#    after the first time, so later runs are silent).
if ! ssh-add -L 2>/dev/null | grep -q "n8ndigitalocean"; then
  echo ">> Loading SSH key into agent (you may be asked for the passphrase)..."
  ssh-add --apple-use-keychain "$KEY" 2>/dev/null || ssh-add "$KEY"
fi

echo "==> [1/4] Building production bundle..."
cd "$(dirname "$0")"
npm run build

echo "==> [1b/4] Precompressing assets (Brotli)..."
node scripts/precompress.mjs

echo "==> [2/4] Uploading to VPS ($HOST:$REMOTE_DIR)..."
# NOTE: `dist` without trailing slash => lands in $REMOTE_DIR/dist (server expects that layout)
rsync -az --delete -e "ssh -i $KEY" dist package.json package-lock.json "$HOST:$REMOTE_DIR/"

echo "==> [3/4] Installing deps + restarting service..."
# Keep the previous release for instant rollback (rollback.sh swaps dist.prev).
ssh -i "$KEY" "$HOST" "cd $REMOTE_DIR && rm -rf dist.prev && cp -r dist dist.prev && npm install --omit=dev --no-audit --no-fund && systemctl restart i35erp"

echo "==> [4/4] Health check..."
sleep 3
curl -fsS -m 10 "$PUBLIC_URL/api/health" && echo && echo "✅ Deploy complete: $PUBLIC_URL"
