#!/usr/bin/env bash
# Jagamise õiguste test kahe kasutajaga.
# A = omanik (admin), B = teine kasutaja (soovitavalt teisest ettevõttest, roll user).
# Kasutus: BASE=... A_EMAIL=... A_PASSWORD=... B_EMAIL=... B_PASSWORD=... bash tests/share.sh
set -uo pipefail
BASE="${BASE:?}"; A_EMAIL="${A_EMAIL:?}"; A_PASSWORD="${A_PASSWORD:?}"; B_EMAIL="${B_EMAIL:?}"; B_PASSWORD="${B_PASSWORD:?}"
JA="$(mktemp)"; JB="$(mktemp)"; FAILS=0
H=(-H 'Content-Type: application/json' -H 'X-Requested-With: logcalc')
check() { if [[ "$2" == "$3" ]]; then echo "  ok   $1 ($3)"; else echo "  FAIL $1: oodati $2, saadi $3"; FAILS=$((FAILS+1)); fi; }
req() { # jar meetod tee [keha]
  local j=$1 m=$2 p=$3 b=${4:-}
  if [[ -n "$b" ]]; then curl -s -o /tmp/lc_sb -w '%{http_code}' -b "$j" -c "$j" -X "$m" "${H[@]}" --data "$b" "$BASE$p"
  else curl -s -o /tmp/lc_sb -w '%{http_code}' -b "$j" -c "$j" -X "$m" "${H[@]}" "$BASE$p"; fi
}
login() { req "$1" POST /auth/login "$(printf '{"email":"%s","password":"%s"}' "$2" "$3")"; }

echo "== jagamine: $BASE"
check "A logib sisse" 200 "$(login "$JA" "$A_EMAIL" "$A_PASSWORD")"
check "B logib sisse" 200 "$(login "$JB" "$B_EMAIL" "$B_PASSWORD")"
check "A loob maja" 201 "$(req "$JA" POST /projects '{"name":"Jagamise test","data":{"width":1}}')"
PID=$(grep -o '"id":[0-9]*' /tmp/lc_sb | head -1 | cut -d: -f2)
check "B ei näe enne jagamist" 404 "$(req "$JB" GET "/projects/$PID")"
req "$JB" GET /projects >/dev/null; ! grep -q '"Jagamise test"' /tmp/lc_sb && echo "  ok   B nimekirjas pole" || { echo "  FAIL B nimekirjas on"; FAILS=$((FAILS+1)); }
check "A jagab B-ga (vaatab)" 201 "$(req "$JA" POST "/projects/$PID/shares" "{\"email\":\"$B_EMAIL\",\"permission\":\"view\"}")"
BID=$(grep -o '"userId":[0-9]*' /tmp/lc_sb | head -1 | cut -d: -f2)
check "B näeb" 200 "$(req "$JB" GET "/projects/$PID")"
grep -q '"via":"shared"' /tmp/lc_sb && echo "  ok   via=shared" || { echo "  FAIL via"; FAILS=$((FAILS+1)); }
check "B (vaatab) ei saa muuta" 403 "$(req "$JB" PUT "/projects/$PID" '{"data":{"width":2}}')"
check "B ei saa kustutada" 403 "$(req "$JB" DELETE "/projects/$PID")"
check "B ei saa jagamist hallata" 403 "$(req "$JB" GET "/projects/$PID/shares")"
check "A annab muutmisõiguse" 201 "$(req "$JA" POST "/projects/$PID/shares" "{\"email\":\"$B_EMAIL\",\"permission\":\"edit\"}")"
check "B (muudab) saab muuta" 200 "$(req "$JB" PUT "/projects/$PID" '{"data":{"width":3}}')"
check "B ei saa ikka kustutada" 403 "$(req "$JB" DELETE "/projects/$PID")"
check "B eemaldab end jagamisest" 200 "$(req "$JB" DELETE "/projects/$PID/shares/$BID")"
check "B ei näe enam" 404 "$(req "$JB" GET "/projects/$PID")"
check "A kustutab" 200 "$(req "$JA" DELETE "/projects/$PID")"
rm -f "$JA" "$JB" /tmp/lc_sb
echo "== Vigu: $FAILS"
exit $FAILS
