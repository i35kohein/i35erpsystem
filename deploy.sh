#!/bin/bash
# i35 ERP deploy script — builds locally, ships to VPS, restarts service.
# Usage: ./deploy.sh
set -euo pipefail

KEY="$HOME/.ssh/n8ndigitalocean"
HOST="root@178.128.62.242"
REMOTE_DIR="/opt/i35erp"
PUBLIC_URL="http://178.128.62.242:3100"

# Audit G-P3: refuse to deploy a dirty tree — deploy.sh ships the working tree
# as-is (builds include uncommitted changes), so a reproducible deploy needs a
# clean checkout. Override with ALLOW_DIRTY=1 for hotfixes.
if [ "${ALLOW_DIRTY:-0}" != "1" ] && ! git diff --quiet; then
  echo "❌ Working tree has uncommitted changes — commit first for a reproducible deploy."
  echo "   (or run: ALLOW_DIRTY=1 ./deploy.sh)"
  exit 1
fi

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
# Backup the CURRENT live release to dist.prev BEFORE overwriting it (audit G
# P2): the old code ran the backup after rsync, so dist.prev was a copy of the
# NEW build — rollback.sh could never restore the previous good release.
ssh -i "$KEY" "$HOST" "cd $REMOTE_DIR && rm -rf dist.prev && cp -r dist dist.prev"

# NOTE: `dist` without trailing slash => lands in $REMOTE_DIR/dist (server expects that layout)
# Audit G-P3: dist is synced SEPARATELY with --delete (prunes stale hashed
# assets from old builds), then package files are copied WITHOUT --delete so
# dist.prev / credentials.json / .env.production / error-log.jsonl are never
# touched.
rsync -az --delete -e "ssh -i $KEY" dist/ "$HOST:$REMOTE_DIR/dist/"
rsync -az -e "ssh -i $KEY" package.json package-lock.json "$HOST:$REMOTE_DIR/"

echo "==> [3/4] Installing deps + restarting service..."
# dist.prev already holds the previous release (backed up before upload), so
# rollback.sh can swap it back if the new build fails the health check.
ssh -i "$KEY" "$HOST" "cd $REMOTE_DIR && npm install --omit=dev --no-audit --no-fund && systemctl restart i35erp"

echo "==> [4/4] Health check..."
sleep 3
curl -fsS -m 10 "$PUBLIC_URL/api/health" && echo && echo "✅ Deploy complete: $PUBLIC_URL"
