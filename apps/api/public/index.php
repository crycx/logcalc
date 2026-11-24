<?php
declare(strict_types=1);

/**
 * LogCalc API sisenemispunkt. Ainult see fail on veebis avalik.
 * Kood ja seadistus asuvad väljaspool veebijuurt:
 *   - serveris: ~/logcalc-api/   (htdocs/uuslogcalc/api/index.php -> ../../../logcalc-api)
 *   - repos:    apps/api/        (public/index.php -> ..)
 */
$candidates = array_filter([
    getenv('LOGCALC_API_ROOT') ?: null,
    dirname(__DIR__, 3) . '/logcalc-api',
    dirname(__DIR__),
]);
foreach ($candidates as $root) {
    if (is_file($root . '/src/bootstrap.php')) {
        require $root . '/src/bootstrap.php';
        \LogCalc\App::run();
    }
}
http_response_code(500);
header('Content-Type: application/json');
echo '{"error":"API ei ole paigaldatud."}';
