<?php
declare(strict_types=1);

// Kasutus: php bin/migrate.php
require __DIR__ . '/../src/bootstrap.php';

use LogCalc\Db;

try {
    $pdo = Db::connect(logcalc_config()['db']);
} catch (\PDOException $e) {
    fwrite(STDERR, 'Andmebaasiga ei saa ühendust: ' . $e->getMessage() . PHP_EOL
        . 'Kontrolli config.php: dsn (host=127.0.0.1;port=3306;dbname=...), user, pass.' . PHP_EOL);
    exit(1);
}
try {
    $applied = Db::migrate($pdo, LOGCALC_APP_ROOT . '/schema');
} catch (\RuntimeException $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}
echo $applied ? 'Rakendatud: ' . implode(', ', $applied) . PHP_EOL : 'Andmebaas on ajakohane.' . PHP_EOL;
echo 'Tabelid: ' . implode(', ', Db::tables($pdo)) . PHP_EOL;
