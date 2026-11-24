<?php
declare(strict_types=1);

namespace LogCalc;

use PDO;

/**
 * Seansipõhine autentimine (PHP session, httpOnly + Secure + SameSite=Lax küpsis).
 * Rollid: superadmin (kõik kliendid), admin (oma kliendi kasutajad ja hinnad), user.
 */
final class Auth
{
    private const MAX_FAILS = 8;
    private const FAIL_WINDOW_MIN = 15;
    /** Võltsräsi, et olematu kasutaja korral võtaks kontroll sama kaua aega */
    private const DUMMY_HASH = '$2y$10$J2A1sLgE4NTUcaUqv1JOG.6AkfY4dQl.GjAfjBSMu0KbSumhfBHUS';

    /** @var array<string, mixed>|null|false false = pole veel laetud */
    private array|null|false $current = false;

    /** @param array<string, mixed> $cfg session seadistus */
    public function __construct(private readonly PDO $db, private readonly array $cfg, private readonly AuthLog $log)
    {
    }

    public function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        $path = (string) ($this->cfg['path'] ?? '');
        if ($path !== '') {
            if (!is_dir($path)) {
                mkdir($path, 0700, true);
            }
            session_save_path($path);
        }
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.gc_maxlifetime', (string) ($this->cfg['lifetime'] ?? 1209600));
        session_name((string) ($this->cfg['name'] ?? 'LCSESS'));
        session_set_cookie_params([
            'lifetime' => (int) ($this->cfg['lifetime'] ?? 1209600),
            'path' => '/',
            'secure' => (bool) ($this->cfg['secure'] ?? true),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }

    /** @return array<string, mixed>|null */
    public function user(): ?array
    {
        if ($this->current !== false) {
            return $this->current;
        }
        $id = $_SESSION['uid'] ?? null;
        $this->current = is_int($id) ? $this->loadUser($id) : null;
        return $this->current;
    }

    /** @return array<string, mixed> */
    public function requireUser(): array
    {
        return $this->user() ?? throw new HttpException(401, 'Palun logi sisse.');
    }

    /** @return array<string, mixed> */
    public function requireRole(string ...$roles): array
    {
        $u = $this->requireUser();
        if (!in_array($u['role'], $roles, true)) {
            throw new HttpException(403, 'Selleks puuduvad õigused.');
        }
        return $u;
    }

    /** @return array<string, mixed> */
    public function login(string $email, string $password, string $ip): array
    {
        $st = $this->db->prepare('SELECT id, tenant_id, password_hash, active FROM users WHERE email = ?');
        $st->execute([$email]);
        $row = $st->fetch() ?: null;
        $uid = $row ? (int) $row['id'] : null;
        $tid = $row ? (int) $row['tenant_id'] : null;

        $since = gmdate('Y-m-d H:i:s', time() - self::FAIL_WINDOW_MIN * 60);
        $st = $this->db->prepare('SELECT COUNT(*) FROM login_attempts WHERE success = 0 AND at > ? AND (email = ? OR ip = ?)');
        $st->execute([$since, $email, $ip]);
        if ((int) $st->fetchColumn() >= self::MAX_FAILS) {
            $this->log->record('login_blocked', $uid, $tid, $email, null, 'liiga palju katseid');
            throw new HttpException(429, 'Liiga palju ebaõnnestunud katseid. Proovi ' . self::FAIL_WINDOW_MIN . ' minuti pärast uuesti.');
        }

        $hash = $row['password_hash'] ?? null;
        $hasHash = is_string($hash) && $hash !== '';
        $pwOk = password_verify($password, $hasHash ? $hash : self::DUMMY_HASH) && $hasHash;
        $ok = $pwOk && $row !== null && (int) $row['active'] === 1;

        $this->db->prepare('INSERT INTO login_attempts (email, ip, success, at) VALUES (?, ?, ?, ?)')
            ->execute([$email, $ip, $ok ? 1 : 0, gmdate('Y-m-d H:i:s')]);
        if (!$ok) {
            $why = $row === null ? 'tundmatu e-post' : (!$hasHash ? 'parool määramata' : (!$pwOk ? 'vale parool' : 'kasutaja välja lülitatud'));
            $this->log->record('login_failed', $uid, $tid, $email, null, $why);
            throw new HttpException(401, 'Vale e-post või parool.');
        }

        $id = (int) $row['id'];
        if (password_needs_rehash((string) $hash, PASSWORD_DEFAULT)) {
            $this->setPassword($id, $password);
        }
        $this->db->prepare('UPDATE users SET last_login_at = ? WHERE id = ?')->execute([gmdate('Y-m-d H:i:s'), $id]);
        // vanad katsed ära (hoiab tabeli väikese)
        $this->db->prepare('DELETE FROM login_attempts WHERE at < ?')->execute([gmdate('Y-m-d H:i:s', time() - 86400)]);
        $this->log->record('login', $id, $tid, $email);
        $this->log->prune();

        session_regenerate_id(true);
        $_SESSION['uid'] = $id;
        $this->current = $this->loadUser($id);
        return $this->current ?? throw new HttpException(500, 'Kasutajat ei leitud.');
    }

    public function logout(): void
    {
        $u = $this->user();
        if ($u) {
            $this->log->record('logout', $u['id'], $u['tenant_id'], (string) $u['email']);
        }
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 3600,
                'path' => $p['path'],
                'secure' => $p['secure'],
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
            session_destroy();
        }
        $this->current = null;
    }

    public function log(): AuthLog
    {
        return $this->log;
    }

    public function verifyPassword(int $userId, string $password): bool
    {
        $st = $this->db->prepare('SELECT password_hash FROM users WHERE id = ?');
        $st->execute([$userId]);
        $hash = $st->fetchColumn();
        return is_string($hash) && $hash !== '' && password_verify($password, $hash);
    }

    public function setPassword(int $userId, string $password): void
    {
        self::assertPasswordStrength($password);
        $this->db->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), $userId]);
    }

    public static function assertPasswordStrength(string $password): void
    {
        if (mb_strlen($password) < 10) {
            throw new HttpException(422, 'Parool peab olema vähemalt 10 märki.');
        }
    }

    /** @return array<string, mixed>|null */
    private function loadUser(int $id): ?array
    {
        $st = $this->db->prepare(
            'SELECT u.id, u.email, u.name, u.role, u.tenant_id, t.slug AS tenant_slug, t.name AS tenant_name
             FROM users u JOIN tenants t ON t.id = u.tenant_id
             WHERE u.id = ? AND u.active = 1'
        );
        $st->execute([$id]);
        $u = $st->fetch();
        if (!$u) {
            return null;
        }
        $u['id'] = (int) $u['id'];
        $u['tenant_id'] = (int) $u['tenant_id'];
        return $u;
    }

    /** @param array<string, mixed> $u */
    public static function publicUser(array $u): array
    {
        return [
            'id' => $u['id'],
            'email' => $u['email'],
            'name' => $u['name'],
            'role' => $u['role'],
            'tenant' => ['id' => $u['tenant_id'], 'slug' => $u['tenant_slug'], 'name' => $u['tenant_name']],
        ];
    }
}
