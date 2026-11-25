<?php
declare(strict_types=1);

namespace LogCalc;

use PDO;

/**
 * Parooli seadmise lingid (tabel password_tokens): kutse uuele kasutajale ('invite') ja admini saadetud uue parooli
 * link ('reset'). Link on ühekordne ja aegub; andmebaasis ainult SHA-256 räsi. Uus link tühistab sama kasutaja vanad.
 */
final class PasswordTokens
{
    public const DAYS = 7;

    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array{token: string, expiresAt: string} */
    public function create(int $userId, string $purpose, ?int $createdBy): array
    {
        $now = gmdate('Y-m-d H:i:s');
        // vanad kasutamata lingid kehtetuks
        $this->db->prepare('UPDATE password_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL')->execute([$now, $userId]);
        $token = bin2hex(random_bytes(32));
        $expires = gmdate('Y-m-d H:i:s', time() + self::DAYS * 86400);
        $this->db->prepare('INSERT INTO password_tokens (user_id, token_hash, purpose, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$userId, hash('sha256', $token), $purpose, $createdBy, $now, $expires]);
        return ['token' => $token, 'expiresAt' => $expires];
    }

    /**
     * Kehtiv link koos kasutajaga (aktiivne, kasutamata, aegumata) või null.
     *
     * @return array<string, mixed>|null
     */
    public function find(string $token): ?array
    {
        if (!preg_match('/^[0-9a-f]{64}$/', $token)) {
            return null;
        }
        $st = $this->db->prepare(
            'SELECT pt.id, pt.user_id, pt.purpose, pt.expires_at, u.email, u.name, u.tenant_id, t.name AS tenant_name
             FROM password_tokens pt JOIN users u ON u.id = pt.user_id JOIN tenants t ON t.id = u.tenant_id
             WHERE pt.token_hash = ? AND pt.used_at IS NULL AND pt.expires_at > ? AND u.active = 1'
        );
        $st->execute([hash('sha256', $token), gmdate('Y-m-d H:i:s')]);
        $r = $st->fetch();
        return $r ?: null;
    }

    public function consume(int $id): void
    {
        $this->db->prepare('UPDATE password_tokens SET used_at = ? WHERE id = ?')->execute([gmdate('Y-m-d H:i:s'), $id]);
    }

    /** Kasutajad, kellel on kehtiv kasutamata link (kasutajate nimekirja jaoks) */
    public function pendingSql(string $userCol): string
    {
        return "(SELECT COUNT(*) FROM password_tokens pt WHERE pt.user_id = $userCol AND pt.used_at IS NULL AND pt.expires_at > '"
            . gmdate('Y-m-d H:i:s') . "')";
    }
}
