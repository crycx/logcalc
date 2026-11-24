#!/usr/bin/env bash
# Kasutajahalduse ja sisselogimiste logi test.
# SA = superadmin, A = teise kliendi admin. Test loob A kliendile kasutaja U (e-post unikaalne).
# Kasutus: BASE=... SA_EMAIL=... SA_PASSWORD=... A_EMAIL=... A_PASSWORD=... bash tests/users.sh
set -uo pipefail
BASE="${BASE:?}"; SA_EMAIL="${SA_EMAIL:?}"; SA_PASSWORD="${SA_PASSWORD:?}"; A_EMAIL="${A_EMAIL:?}"; A_PASSWORD="${A_PASSWORD:?}"
JS="$(mktemp)"; JA="$(mktemp)"; JU="$(mktemp)"; FAILS=0
H=(-H 'Content-Type: application/json' -H 'X-Requested-With: logcalc' -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/142.0 Safari/537.36')
check() { if [[ "$2" == "$3" ]]; then echo "  ok   $1 ($3)"; else echo "  FAIL $1: oodati $2, saadi $3"; FAILS=$((FAILS+1)); fi; }
has() { if grep -q -- "$2" /tmp/lc_ub; then echo "  ok   $1"; else echo "  FAIL $1: puudub $2"; head -c 400 /tmp/lc_ub; echo; FAILS=$((FAILS+1)); fi; }
hasnt() { if grep -q -- "$2" /tmp/lc_ub; then echo "  FAIL $1: ei tohiks olla $2"; FAILS=$((FAILS+1)); else echo "  ok   $1"; fi; }
req() { # jar meetod tee [keha]
  local j=$1 m=$2 p=$3 b=${4:-}
  if [[ -n "$b" ]]; then curl -s -o /tmp/lc_ub -w '%{http_code}' -b "$j" -c "$j" -X "$m" "${H[@]}" --data "$b" "$BASE$p"
  else curl -s -o /tmp/lc_ub -w '%{http_code}' -b "$j" -c "$j" -X "$m" "${H[@]}" "$BASE$p"; fi
}
login() { req "$1" POST /auth/login "$(printf '{"email":"%s","password":"%s"}' "$2" "$3")"; }

U_EMAIL="test-$(date +%s)@example.com"
echo "== kasutajad ja logi: $BASE"
check "ilma sisselogimiseta: /users" 401 "$(req "$JU" GET /users)"
check "ilma sisselogimiseta: /auth-events" 401 "$(req "$JU" GET /auth-events)"
check "SA logib sisse" 200 "$(login "$JS" "$SA_EMAIL" "$SA_PASSWORD")"
check "A logib sisse" 200 "$(login "$JA" "$A_EMAIL" "$A_PASSWORD")"

check "A: kasutajate nimekiri" 200 "$(req "$JA" GET /users)"
hasnt "A ei näe teise kliendi kasutajat" "\"$SA_EMAIL\""
has "nimekirjas on projectCount" '"projectCount"'
check "SA: kasutajate nimekiri" 200 "$(req "$JS" GET /users)"
has "SA näeb teise kliendi kasutajat" "\"$A_EMAIL\""

check "A: lühike parool" 422 "$(req "$JA" POST /users "{\"email\":\"$U_EMAIL\",\"name\":\"Test\",\"password\":\"lyhike\"}")"
check "A: ei saa luua superadmini" 422 "$(req "$JA" POST /users "{\"email\":\"$U_EMAIL\",\"role\":\"superadmin\",\"password\":\"pikk-parool-123\"}")"
check "A: loob kasutaja U" 201 "$(req "$JA" POST /users "{\"email\":\"$U_EMAIL\",\"name\":\"Test Kasutaja\",\"password\":\"pikk-parool-123\"}")"
UID_=$(grep -o '"id":[0-9]*' /tmp/lc_ub | head -1 | cut -d: -f2)
check "A: sama e-post uuesti" 409 "$(req "$JA" POST /users "{\"email\":\"$U_EMAIL\",\"password\":\"pikk-parool-123\"}")"

check "U: vale parool" 401 "$(login "$JU" "$U_EMAIL" "vale-parool-999")"
check "U logib sisse" 200 "$(login "$JU" "$U_EMAIL" "pikk-parool-123")"
check "U: /users keelatud" 403 "$(req "$JU" GET /users)"
check "U: /auth-events keelatud" 403 "$(req "$JU" GET /auth-events)"
check "U: oma sündmused" 200 "$(req "$JU" GET /auth/events)"
has "U näeb oma sisselogimist" '"type":"login"'
has "U näeb oma ebaõnnestunud katset" '"type":"login_failed"'
has "brauser on salvestatud" 'Chrome/142'

check "A: muudab U rolli ja nime" 200 "$(req "$JA" PATCH "/users/$UID_" '{"role":"admin","name":"Uus Nimi"}')"
has "roll muutus" '"role":"admin"'
check "A: lähtestab U parooli" 200 "$(req "$JA" PATCH "/users/$UID_" '{"password":"uus-parool-456"}')"
check "A: lülitab U välja" 200 "$(req "$JA" PATCH "/users/$UID_" '{"active":false}')"
check "U seanss kehtetu pärast väljalülitamist" 401 "$(req "$JU" GET /projects)"
check "U ei saa sisse (välja lülitatud)" 401 "$(login "$JU" "$U_EMAIL" "uus-parool-456")"
req "$JA" GET /auth/me >/dev/null; A_ID=$(grep -o '"id":[0-9]*' /tmp/lc_ub | head -1 | cut -d: -f2)
check "A: ei saa iseennast välja lülitada" 422 "$(req "$JA" PATCH "/users/$A_ID" '{"active":false}')"
check "A: ei saa oma rolli muuta" 422 "$(req "$JA" PATCH "/users/$A_ID" '{"role":"user"}')"
check "A: ei saa muuta teise kliendi kasutajat (SA)" 404 "$(req "$JA" PATCH "/users/1" '{"name":"x"}')"

check "A: logi" 200 "$(req "$JA" GET /auth-events)"
has "logis user_created" '"type":"user_created"'
has "logis rollimuutus" 'roll: kasutaja → admin'
has "logis password_reset" '"type":"password_reset"'
has "logis väljalülitamine" 'välja lülitatud'
has "logis väljalülitatud kasutaja katse" 'kasutaja välja lülitatud'
has "logis tegija (actor)" "\"actor\":{\"id\""
hasnt "A ei näe teise kliendi sündmusi" "\"$SA_EMAIL\""
check "A: logi filter failed" 200 "$(req "$JA" GET '/auth-events?type=failed')"
hasnt "failed filter: pole edukaid" '"type":"login"'
has "failed filter: vale parool" 'vale parool'
check "A: logi U kohta, limit 2" 200 "$(req "$JA" GET "/auth-events?userId=$UID_&limit=2")"
has "lehekülgede kaupa: more" '"more":true'

check "tundmatu e-post" 401 "$(login "$JU" "keegi-$(date +%s)@example.com" "suvaline-123")"
check "SA: logi" 200 "$(req "$JS" GET '/auth-events?type=failed')"
has "SA näeb tundmatu e-posti katset" 'tundmatu e-post'
check "A: logi" 200 "$(req "$JA" GET '/auth-events?type=failed')"
hasnt "A ei näe tundmatu e-posti katset" 'tundmatu e-post'

check "A logib välja" 200 "$(req "$JA" POST /auth/logout '{}')"
check "SA: logi" 200 "$(req "$JS" GET '/auth-events?type=logout')"
has "väljalogimine logis" "\"$A_EMAIL\""

echo
[[ $FAILS -eq 0 ]] && echo "Kõik korras." || { echo "$FAILS viga."; exit 1; }
