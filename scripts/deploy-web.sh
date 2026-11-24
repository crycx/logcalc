#!/usr/bin/env bash
# Ehitab Angular rakenduse ja laeb selle aadressile https://uuslogcalc.sinpal.ee
# Eeldab ~/.ssh/config kirjet "veebimajutus" (võtmepõhine SSH, port 1022).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-veebimajutus}"
REMOTE_DIR="${REMOTE_DIR:-htdocs/uuslogcalc}"

echo "==> Testid (calc-engine)"
(cd "$ROOT/packages/calc-engine" && npx vitest run)

echo "==> Build (apps/web)"
(cd "$ROOT/apps/web" && npx ng build)

echo "==> Upload -> $REMOTE_HOST:~/$REMOTE_DIR"
# Vanad räsiga failid ja index.html maha, .well-known (SSL) jääb alles
ssh "$REMOTE_HOST" "cd ~/$REMOTE_DIR && rm -f index.html favicon.ico main-*.js chunk-*.js polyfills-*.js styles-*.css .htaccess"
tar -C "$ROOT/apps/web/dist/web/browser" -cf - . | ssh "$REMOTE_HOST" "tar -C ~/$REMOTE_DIR -xf -"

echo "==> Kontroll"
curl -fsS -o /dev/null -w "https://uuslogcalc.sinpal.ee -> %{http_code}\n" https://uuslogcalc.sinpal.ee/
