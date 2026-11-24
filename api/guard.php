<?php
/**
 * Turvavärav vanale v2 API-le (rest.php). Lisatud 2026-11-24.
 *
 * - Lubatud ainult need andmetüübid, mida v2 frontend kasutab: sadul, kaldeline, hinnad.
 * - Lugemine (op=get) on avalik; create/update/delete nõuavad admini parooli (HTTP Basic auth).
 *   Kasutajanimi + bcrypt-räsi failis config/admin.php (ei ole gitis).
 * - SQL injection: idArray -> ainult positiivsed täisarvud, filters -> eemaldatud (frontend ei kasuta).
 *
 * Kasutus rest.php alguses:  $data = require __DIR__ . '/guard.php';
 */

const LC_ALLOWED_ORIGIN = 'https://logcalc.sinpal.ee';
const LC_ALLOWED_KINDS = ['sadul', 'kaldeline', 'hinnad'];
const LC_WRITE_OPS = ['create', 'update', 'delete'];

function lc_fail(int $code, string $message): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['message' => $message]);
    exit;
}

/** @return array{0: ?string, 1: ?string} */
function lc_basic_credentials(): array
{
    if (isset($_SERVER['PHP_AUTH_USER'])) {
        return [$_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW'] ?? ''];
    }
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (stripos($header, 'Basic ') === 0) {
        $decoded = base64_decode(substr($header, 6), true);
        if ($decoded !== false && str_contains($decoded, ':')) {
            [$user, $pass] = explode(':', $decoded, 2);
            return [$user, $pass];
        }
    }
    return [null, null];
}

function lc_require_admin(): void
{
    $file = __DIR__ . '/config/admin.php';
    if (!is_file($file)) {
        lc_fail(503, 'Admin pole seadistatud.');
    }
    $cfg = require $file;
    [$user, $pass] = lc_basic_credentials();
    $ok = is_array($cfg)
        && is_string($user) && is_string($pass)
        && hash_equals((string) ($cfg['user'] ?? ''), $user)
        && password_verify($pass, (string) ($cfg['hash'] ?? ''));
    if (!$ok) {
        header('WWW-Authenticate: Basic realm="LogCalc admin", charset="UTF-8"');
        lc_fail(401, 'Salvestamiseks on vaja sisse logida.');
    }
}

// --- CORS: ainult oma domeen ---
header('Access-Control-Allow-Origin: ' . LC_ALLOWED_ORIGIN);
header('Vary: Origin');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 3600');
header('Content-Type: application/json; charset=UTF-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit('OK');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    lc_fail(405, 'Ainult POST.');
}

$lcData = json_decode(file_get_contents('php://input') ?: 'null');
if (!is_object($lcData)) {
    lc_fail(400, 'Vigane päring.');
}

$lcKind = $lcData->kind ?? null;
if (!is_string($lcKind) || !in_array($lcKind, LC_ALLOWED_KINDS, true)) {
    lc_fail(404, 'Ei leitud.');
}

$lcOp = $lcData->op ?? 'get';
if (!is_string($lcOp) || !in_array($lcOp, array_merge(['get'], LC_WRITE_OPS), true)) {
    lc_fail(404, 'Ei leitud.');
}
if (in_array($lcOp, LC_WRITE_OPS, true)) {
    lc_require_admin();
}

// --- Sisendi puhastus (SQL injection) ---
// idArray: ainult massiiv positiivsetest täisarvudest. Skalaar/tühi -> null (= kõik, nagu v2 varem käitus).
$lcIds = $lcData->idArray ?? null;
if (is_array($lcIds)) {
    $lcIds = array_values(array_filter(array_map('intval', $lcIds), static fn (int $i) => $i > 0));
    $lcIds = $lcIds === [] ? null : $lcIds;
} else {
    $lcIds = null;
}
$lcData->idArray = $lcIds;
$lcData->filters = null;
if (isset($lcData->id)) {
    $lcData->id = (int) $lcData->id;
}

return $lcData;
