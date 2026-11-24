<?php
declare(strict_types=1);

/**
 * LogCalc API bootstrap: autoload + seadistus.
 * Rakenduse juurkaust (APP_ROOT) = selle kausta ülemkaust (src/..).
 */

const LOGCALC_APP_ROOT = __DIR__ . '/..';

spl_autoload_register(static function (string $class): void {
    $prefix = 'LogCalc\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

require __DIR__ . '/Http.php';

/** @return array<string, mixed> */
function logcalc_config(): array
{
    static $config = null;
    if ($config === null) {
        $file = getenv('LOGCALC_CONFIG') ?: LOGCALC_APP_ROOT . '/config.php';
        if (!is_file($file)) {
            throw new RuntimeException('config.php puudub: ' . $file);
        }
        $config = require $file;
    }
    return $config;
}
