<?php
declare(strict_types=1);

namespace LogCalc;

use PDO;

final class Db
{
    /** @param array{dsn: string, user?: ?string, pass?: ?string} $cfg */
    public static function connect(array $cfg): PDO
    {
        $dsn = $cfg['dsn'];
        if (str_starts_with($dsn, 'sqlite:')) {
            $dir = dirname(substr($dsn, 7));
            if (!is_dir($dir)) {
                mkdir($dir, 0700, true);
            }
        }
        $pdo = new PDO($dsn, $cfg['user'] ?? null, $cfg['pass'] ?? null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            $pdo->exec('PRAGMA foreign_keys = ON');
            $pdo->exec('PRAGMA journal_mode = WAL');
            $pdo->exec('PRAGMA busy_timeout = 5000');
        }
        return $pdo;
    }

    /**
     * Rakendab schema/<driver>/NNN_*.sql failid, mida pole veel rakendatud.
     * @return list<string> rakendatud failid
     */
    public static function migrate(PDO $pdo, string $schemaRoot): array
    {
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, applied_at VARCHAR(30) NOT NULL)');
        $done = $pdo->query('SELECT version FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN);
        $files = glob(rtrim($schemaRoot, '/') . '/' . $driver . '/*.sql') ?: [];
        sort($files);
        $applied = [];
        foreach ($files as $file) {
            $version = basename($file, '.sql');
            if (in_array($version, $done, true)) {
                continue;
            }
            // MySQL teeb DDL-i järel automaatse commit'i -> tehing ainult SQLite puhul
            $useTx = $driver === 'sqlite';
            if ($useTx) {
                $pdo->beginTransaction();
            }
            try {
                foreach (self::statements((string) file_get_contents($file)) as $sql) {
                    $pdo->exec($sql);
                }
                $st = $pdo->prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');
                $st->execute([$version, gmdate('Y-m-d H:i:s')]);
                if ($useTx && $pdo->inTransaction()) {
                    $pdo->commit();
                }
            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw new \RuntimeException("Migratsioon $version ebaõnnestus: " . $e->getMessage(), 0, $e);
            }
            $applied[] = $version;
        }
        return $applied;
    }

    /** @return list<string> tabelite nimed */
    public static function tables(PDO $pdo): array
    {
        $sql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite'
            ? "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            : 'SHOW TABLES';
        return $pdo->query($sql)->fetchAll(PDO::FETCH_COLUMN);
    }

    /** @return list<string> */
    private static function statements(string $sql): array
    {
        $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? '';
        return array_values(array_filter(array_map('trim', explode(';', $sql)), static fn ($s) => $s !== ''));
    }
}
