#!/usr/bin/env bash
# API läbimängimine curl-iga.
# Kasutus: BASE=http://127.0.0.1:8098/api EMAIL=... PASSWORD=... bash tests/smoke.sh
# Kasutaja peab olema admin (testib ka hinnakirja salvestamist).
set -uo pipefail
BASE="${BASE:?BASE puudub}"
EMAIL="${EMAIL:?EMAIL puudub}"
PASSWORD="${PASSWORD:?PASSWORD puudub}"
JAR="$(mktemp)"
FAILS=0
H=(-H 'Content-Type: application/json' -H 'X-Requested-With: logcalc')

check() { # nimi oodatud_kood tegelik_kood
  if [[ "$2" == "$3" ]]; then echo "  ok   $1 ($3)"; else echo "  FAIL $1: oodati $2, saadi $3"; FAILS=$((FAILS+1)); fi
}
req() { # meetod tee [keha] -> kood, keha failis /tmp/lc_body
  local m=$1 p=$2 b=${3:-}
  if [[ -n "$b" ]]; then curl -s -o /tmp/lc_body -w '%{http_code}' -b "$JAR" -c "$JAR" -X "$m" "${H[@]}" --data "$b" "$BASE$p"
  else curl -s -o /tmp/lc_body -w '%{http_code}' -b "$JAR" -c "$JAR" -X "$m" "${H[@]}" "$BASE$p"; fi
}

echo "== $BASE"
check "health" 200 "$(req GET /health)"
check "me ilma sisselogimiseta" 200 "$(req GET /auth/me)"; grep -q '"user":null' /tmp/lc_body || { echo "  FAIL me peaks olema null"; FAILS=$((FAILS+1)); }
check "projects ilma sisselogimiseta" 401 "$(req GET /projects)"
check "CSRF: POST ilma päiseta" 403 "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data '{}' "$BASE/auth/login")"
check "CSRF: võõras Origin" 403 "$(curl -s -o /dev/null -w '%{http_code}' -X POST "${H[@]}" -H 'Origin: https://evil.example' --data '{}' "$BASE/auth/login")"
check "vale parool" 401 "$(req POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"vale-parool-123\"}")"
check "sisselogimine" 200 "$(req POST /auth/login "$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASSWORD")")"
check "me" 200 "$(req GET /auth/me)"
check "tenant" 200 "$(req GET /tenant)"
check "hinnakiri (admin)" 200 "$(req PUT /tenant/settings '{"prices":{"seinaLauad":1.33,"katuseLauad":0.69}}')"
grep -q '"seinaLauad":1.33' /tmp/lc_body || { echo "  FAIL hind ei salvestunud"; FAILS=$((FAILS+1)); }
check "kataloog (admin)" 200 "$(req PUT /tenant/settings '{"catalog":{"doors":[{"name":"Test uks","width":900,"height":1900,"price":250}],"windows":[]}}')"
grep -q '"Test uks"' /tmp/lc_body && grep -q '"seinaLauad":1.33' /tmp/lc_body || { echo "  FAIL kataloog ei salvestunud või kirjutas hinnad üle"; FAILS=$((FAILS+1)); }
check "kataloog: vigane rida" 422 "$(req PUT /tenant/settings '{"catalog":{"doors":[{"name":"","width":900}]}}')"
check "projekt: loo" 201 "$(req POST /projects '{"name":"Smoke test maja","data":{"width":3000,"depth":4000}}')"
PID=$(grep -o '"id":[0-9]*' /tmp/lc_body | head -1 | cut -d: -f2)
check "projekt: nimekiri" 200 "$(req GET /projects)"
check "projekt: ava" 200 "$(req GET "/projects/$PID")"
check "projekt: muuda" 200 "$(req PUT "/projects/$PID" '{"name":"Smoke test maja 2"}')"
grep -q 'Smoke test maja 2' /tmp/lc_body || { echo "  FAIL nimi ei muutunud"; FAILS=$((FAILS+1)); }
check "projekt: vale id" 404 "$(req GET /projects/999999)"
check "projekt: SQL injection id" 404 "$(req GET '/projects/1%20OR%201=1')"
check "jagamine: nimekiri" 200 "$(req GET "/projects/$PID/shares")"
check "jagamine: olematu kasutaja" 404 "$(req POST "/projects/$PID/shares" '{"email":"pole-olemas@example.com","permission":"view"}')"
check "jagamine: iseendaga" 422 "$(req POST "/projects/$PID/shares" "{\"email\":\"$EMAIL\",\"permission\":\"view\"}")"
check "jagamine: vale õigus" 422 "$(req POST "/projects/$PID/shares" '{"email":"x@example.com","permission":"admin"}')"
if [[ -n "${SHARE_EMAIL:-}" ]]; then
  check "jagamine: lisa" 201 "$(req POST "/projects/$PID/shares" "{\"email\":\"$SHARE_EMAIL\",\"permission\":\"edit\"}")"
  grep -q "$SHARE_EMAIL" /tmp/lc_body || { echo "  FAIL jagamine puudub nimekirjast"; FAILS=$((FAILS+1)); }
  SUID=$(grep -o '"userId":[0-9]*' /tmp/lc_body | head -1 | cut -d: -f2)
  check "jagamine: eemalda" 200 "$(req DELETE "/projects/$PID/shares/$SUID")"
fi
check "projekt: kustuta" 200 "$(req DELETE "/projects/$PID")"
check "projekt: kustutatud" 404 "$(req GET "/projects/$PID")"
check "väljalogimine" 200 "$(req POST /auth/logout)"
check "pärast väljalogimist" 401 "$(req GET /projects)"
rm -f "$JAR" /tmp/lc_body
echo "== Vigu: $FAILS"
exit $FAILS
