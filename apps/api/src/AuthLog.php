<?php
declare(strict_types=1);

namespace LogCalc;

use PDO;

/**
 * Sisselogimiste ja kasutajahalduse logi (tabel auth_events).
 *
 * Tüübid: login, login_failed, login_blocked, logout, password_changed,
 *         password_reset, user_created, user_updated.
 * Logi kirjutamise viga ei tohi sisselogimist takistada -> vead ainult error_log-i.
 */
final class AuthLog
{
    public const TYPES = ['login', 'login_failed', 'login_blocked', 'logout', 'password_changed', 'password_reset', 'user_created', 'user_updated'];

    public function __construct(
        private readonly PDO $db,
        private readonly string $ip,
        private readonly string $userAgent,
        private readonly int $retentionDays = 365,
    ) {
    }

    public static function fromRequest(PDO $db, Request $req, int $retentionDays = 365): self
    {
        return new self($db, $req->ip, (string) ($req->header('user-agent') ?? ''), $retentionDays);
    }

    public function record(string $type, ?int $userId, ?int $tenantId, string $email = '', ?int $actorId = null, string $detail = ''): void
    {
        try {
            $this->db->prepare(
                'INSERT INTO auth_events (tenant_id, user_id, actor_id, type, email, ip, user_agent, detail, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $tenantId,
                $userId,
                $actorId,
                $type,
                mb_substr($email, 0, 254),
                mb_substr($this->ip, 0, 45),
                mb_substr($this->userAgent, 0, 255),
                mb_substr($detail, 0, 255),
                gmdate('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            error_log('[logcalc-api] auth_events: ' . $e->getMessage());
        }
    }

    /** Vanemad kui säilitusaeg kirjed ära (kutsutakse eduka sisselogimise järel). */
    public function prune(): void
    {
        if ($this->retentionDays <= 0) {
            return;
        }
        try {
            $this->db->prepare('DELETE FROM auth_events WHERE at < ?')
                ->execute([gmdate('Y-m-d H:i:s', time() - $this->retentionDays * 86400)]);
        } catch (\Throwable $e) {
            error_log('[logcalc-api] auth_events prune: ' . $e->getMessage());
        }
    }
}
