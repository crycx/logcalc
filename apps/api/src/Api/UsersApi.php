<?php
declare(strict_types=1);

namespace LogCalc\Api;

use LogCalc\Auth;
use LogCalc\HttpException;
use LogCalc\Input;
use LogCalc\Request;
use PDO;

/** Kasutajate haldus. Admin: oma kliendi kasutajad. Superadmin: kõik. */
final class UsersApi
{
    public function __construct(private readonly PDO $db, private readonly Auth $auth)
    {
    }

    public function list(Request $req): array
    {
        $me = $this->auth->requireRole('admin', 'superadmin');
        $st = $this->db->prepare(
            'SELECT id, email, name, role, active, created_at, last_login_at FROM users WHERE tenant_id = ? ORDER BY name, email'
        );
        $st->execute([$me['tenant_id']]);
        return ['users' => array_map(self::row(...), $st->fetchAll())];
    }

    public function create(Request $req): array
    {
        $me = $this->auth->requireRole('admin', 'superadmin');
        $d = $req->json();
        $email = Input::email($d);
        $name = (string) (Input::str($d, 'name', 120, false) ?? '');
        $role = $this->role($me, $d['role'] ?? 'user');
        $tenantId = $me['tenant_id'];
        if (isset($d['tenantId']) && $me['role'] === 'superadmin') {
            $tenantId = (int) $d['tenantId'];
        }
        $password = $d['password'] ?? null;
        if (!is_string($password)) {
            throw new HttpException(422, 'Algne parool on kohustuslik.');
        }
        Auth::assertPasswordStrength($password);
        try {
            $this->db->prepare('INSERT INTO users (tenant_id, email, name, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
                ->execute([$tenantId, $email, $name, password_hash($password, PASSWORD_DEFAULT), $role, gmdate('Y-m-d H:i:s')]);
        } catch (\PDOException) {
            throw new HttpException(409, 'Selle e-postiga kasutaja on juba olemas.');
        }
        return ['user' => $this->find($me, (int) $this->db->lastInsertId())];
    }

    public function update(Request $req, array $p): array
    {
        $me = $this->auth->requireRole('admin', 'superadmin');
        $target = $this->find($me, $p['id']);
        $d = $req->json();
        if (array_key_exists('name', $d)) {
            $this->db->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([(string) (Input::str($d, 'name', 120, false) ?? ''), $target['id']]);
        }
        if (array_key_exists('role', $d)) {
            if ($target['id'] === $me['id']) {
                throw new HttpException(422, 'Oma rolli ei saa muuta.');
            }
            $this->db->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$this->role($me, $d['role']), $target['id']]);
        }
        if (array_key_exists('active', $d)) {
            if ($target['id'] === $me['id']) {
                throw new HttpException(422, 'Iseennast ei saa välja lülitada.');
            }
            $this->db->prepare('UPDATE users SET active = ? WHERE id = ?')->execute([$d['active'] ? 1 : 0, $target['id']]);
        }
        if (array_key_exists('password', $d)) {
            if (!is_string($d['password'])) {
                throw new HttpException(422, 'Vigane parool.');
            }
            $this->auth->setPassword($target['id'], $d['password']);
        }
        return ['user' => $this->find($me, $target['id'])];
    }

    private function role(array $me, mixed $role): string
    {
        $allowed = $me['role'] === 'superadmin' ? ['user', 'admin', 'superadmin'] : ['user', 'admin'];
        if (!is_string($role) || !in_array($role, $allowed, true)) {
            throw new HttpException(422, 'Lubamatu roll.');
        }
        return $role;
    }

    /** @return array<string, mixed> */
    private function find(array $me, int $id): array
    {
        $sql = 'SELECT id, email, name, role, active, created_at, last_login_at, tenant_id FROM users WHERE id = ?';
        $args = [$id];
        if ($me['role'] !== 'superadmin') {
            $sql .= ' AND tenant_id = ?';
            $args[] = $me['tenant_id'];
        }
        $st = $this->db->prepare($sql);
        $st->execute($args);
        $r = $st->fetch() ?: throw new HttpException(404, 'Kasutajat ei leitud.');
        return self::row($r);
    }

    private static function row(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'email' => $r['email'],
            'name' => $r['name'],
            'role' => $r['role'],
            'active' => (bool) $r['active'],
            'createdAt' => $r['created_at'],
            'lastLoginAt' => $r['last_login_at'],
        ];
    }
}
