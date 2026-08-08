#!/bin/bash
# i35 ERP rollback — swaps the last deployed release back in (dist.prev).
# Usage: ./rollback.sh
set -euo pipefail

KEY="$HOME/.ssh/n8ndigitalocean"
HOST="root@192.34.62.199"
REMOTE_DIR="/opt/i35erp"
PUBLIC_URL="http://192.34.62.199:3100"

echo "==> Rolling back to the previous release..."
ssh -i "$KEY" "$HOST" "cd $REMOTE_DIR && if [ ! -d dist.prev ]; then echo 'No previous release found (dist.prev missing).'; exit 1; fi && rm -rf dist.old && cp -r dist dist.old && rm -rf dist && cp -r dist.prev dist && systemctl restart i35erp"

echo "==> Health check..."
sleep 3
curl -fsS -m 10 "$PUBLIC_URL/api/health" && echo && echo "✅ Rollback complete — current release moved to dist.old"