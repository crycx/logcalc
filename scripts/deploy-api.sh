#!/usr/bin/env bash
# Laeb PHP API serverisse:
#   kood       -> ~/logcalc-api/{src,schema,bin}        (väljaspool veebijuurt)
#   sisenemine -> ~/htdocs/uuslogcalc/api/{index.php,.htaccess}
# config.php-d ja data/ kausta EI puudutata. Lõpus käivitatakse migratsioon.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-veebimajutus}"
APP_DIR="${APP_DIR:-logcalc-api}"
WEB_DIR="${WEB_DIR:-htdocs/uuslogcalc/api}"

echo "==> PHP süntaks"
for f in $(cd "$ROOT/apps/api" && ls src/*.php src/Api/*.php bin/*.php public/index.php); do
  php -l "$ROOT/apps/api/$f" >/dev/null
done

echo "==> Kood -> $REMOTE_HOST:~/$APP_DIR"
ssh "$REMOTE_HOST" "mkdir -p ~/$APP_DIR/data && chmod 700 ~/$APP_DIR/data && rm -rf ~/$APP_DIR/src ~/$APP_DIR/schema ~/$APP_DIR/bin"
tar -C "$ROOT/apps/api" -cf - src schema bin config.example.php | ssh "$REMOTE_HOST" "tar -C ~/$APP_DIR -xf -"

echo "==> Sisenemispunkt -> $REMOTE_HOST:~/$WEB_DIR"
ssh "$REMOTE_HOST" "mkdir -p ~/$WEB_DIR"
tar -C "$ROOT/apps/api/public" -cf - index.php .htaccess | ssh "$REMOTE_HOST" "tar -C ~/$WEB_DIR -xf -"

echo "==> Migratsioon"
ssh "$REMOTE_HOST" "cd ~/$APP_DIR && if [ -f config.php ]; then php bin/migrate.php; else echo 'config.php puudub – loo see: cp config.example.php config.php && nano config.php'; fi"

echo "==> Kontroll"
curl -sS -w "  (%{http_code})\n" https://uuslogcalc.sinpal.ee/api/health
