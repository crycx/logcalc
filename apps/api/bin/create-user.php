<?php
declare(strict_types=1);

/**
 * Loob kasutaja (ja vajadusel kliendi). Parool küsitakse terminalis (ei kuvata).
 *
 *   php bin/create-user.php --tenant=sinpal --tenant-name="Sinpal OÜ" --email=nimi@firma.ee --name="Nimi" --role=superadmin
 *
 * Mitteinteraktiivselt: LOGCALC_PASSWORD keskkonnamuutuja.
 */
require __DIR__ . '/../src/bootstrap.php';

use LogCalc\Auth;
use LogCalc\Db;

$opt = getopt('', ['tenant:', 'tenant-name::', 'email:', 'name::', 'role::']);
$slug = strtolower((string) ($opt['tenant'] ?? ''));
$email = strtolower(trim((string) ($opt['email'] ?? '')));
$role = (string) ($opt['role'] ?? 'user');
$name = (string) ($opt['name'] ?? '');

if ($slug === '' || $email === '' || !preg_match('/^[a-z0-9][a-z0-9-]*$/', $slug) || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    fwrite(STDERR, "Kasutus: php bin/create-user.php --tenant=slug [--tenant-name=\"Nimi\"] --email=e@post.ee [--name=\"Nimi\"] [--role=user|admin|superadmin]\n");
    exit(1);
}
if (!in_array($role, ['user', 'admin', 'superadmin'], true)) {
    fwrite(STDERR, "Vigane roll: $role\n");
    exit(1);
}

function ask_password(string $prompt): string
{
    $env = getenv('LOGCALC_PASSWORD');
    if (is_string($env) && $env !== '') {
        return $env;
    }
    fwrite(STDOUT, $prompt);
    $tty = function_exists('posix_isatty') ? posix_isatty(STDIN) : true;
    if ($tty) {
        @shell_exec('stty -echo 2>/dev/null');
    }
    $p = rtrim((string) fgets(STDIN), "\r\n");
    if ($tty) {
        @shell_exec('stty echo 2>/dev/null');
    }
    fwrite(STDOUT, PHP_EOL);
    return $p;
}

$pdo = Db::connect(logcalc_config()['db']);
Db::migrate($pdo, LOGCALC_APP_ROOT . '/schema');

$st = $pdo->prepare('SELECT id FROM tenants WHERE slug = ?');
$st->execute([$slug]);
$tenantId = $st->fetchColumn();
if ($tenantId === false) {
    $tenantName = (string) ($opt['tenant-name'] ?? $slug);
    $pdo->prepare('INSERT INTO tenants (slug, name, settings, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$slug, $tenantName, '{}', gmdate('Y-m-d H:i:s')]);
    $tenantId = (int) $pdo->lastInsertId();
    echo "Loodud klient: $tenantName ($slug)\n";
}

$password = ask_password("Parool kasutajale $email (min 10 märki): ");
$again = getenv('LOGCALC_PASSWORD') ? $password : ask_password('Korda parooli: ');
if ($password !== $again) {
    fwrite(STDERR, "Paroolid ei kattu.\n");
    exit(1);
}
try {
    Auth::assertPasswordStrength($password);
} catch (\Throwable $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}

$st = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$st->execute([$email]);
$existing = $st->fetchColumn();
$hash = password_hash($password, PASSWORD_DEFAULT);
if ($existing !== false) {
    $pdo->prepare('UPDATE users SET password_hash = ?, role = ?, active = 1, tenant_id = ? WHERE id = ?')
        ->execute([$hash, $role, $tenantId, $existing]);
    echo "Uuendatud kasutaja: $email ($role)\n";
} else {
    $pdo->prepare('INSERT INTO users (tenant_id, email, name, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
        ->execute([$tenantId, $email, $name, $hash, $role, gmdate('Y-m-d H:i:s')]);
    echo "Loodud kasutaja: $email ($role)\n";
}
