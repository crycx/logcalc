<?php
declare(strict_types=1);

namespace LogCalc\Api;

use LogCalc\Auth;
use LogCalc\HttpException;
use LogCalc\Input;
use LogCalc\Request;
use PDO;

/**
 * Majad (projektid).
 *
 * Nähtavus:
 *   - omanik
 *   - kasutaja, kellega maja on jagatud (project_shares: view | edit)
 *   - oma ettevõtte admin; superadmin näeb kõiki
 * Muuta: omanik, admin, edit-jagamisega kasutaja.
 * Kustutada ja jagamist hallata: omanik, admin.
 */
final class ProjectsApi
{
    private const MAX_DATA = 512_000;

    public function __construct(private readonly PDO $db, private readonly Auth $auth)
    {
    }

    public function list(Request $req): array
    {
        $u = $this->auth->requireUser();
        $isAdmin = in_array($u['role'], ['admin', 'superadmin'], true) ? 1 : 0;
        $isSuper = $u['role'] === 'superadmin' ? 1 : 0;
        $st = $this->db->prepare(
            'SELECT p.id, p.tenant_id, p.name, p.created_at, p.updated_at, p.owner_id,
                    o.name AS owner_name, o.email AS owner_email,
                    s.permission AS share_permission,
                    (SELECT COUNT(*) FROM project_shares x WHERE x.project_id = p.id) AS share_count
             FROM projects p
             LEFT JOIN users o ON o.id = p.owner_id
             LEFT JOIN project_shares s ON s.project_id = p.id AND s.user_id = ?
             WHERE p.owner_id = ? OR s.user_id IS NOT NULL OR (? = 1 AND p.tenant_id = ?) OR ? = 1
             ORDER BY p.updated_at DESC
             LIMIT 1000'
        );
        $st->execute([$u['id'], $u['id'], $isAdmin, $u['tenant_id'], $isSuper]);
        return ['projects' => array_map(fn ($r) => $this->summary($u, $r), $st->fetchAll())];
    }

    public function get(Request $req, array $p): array
    {
        $u = $this->auth->requireUser();
        return ['project' => $this->full($u, $this->find($u, $p['id']))];
    }

    public function create(Request $req): array
    {
        $u = $this->auth->requireUser();
        $d = $req->json();
        $name = (string) Input::str($d, 'name', 200);
        $data = $this->encodeData($d);
        $now = gmdate('Y-m-d H:i:s');
        $this->db->prepare('INSERT INTO projects (tenant_id, owner_id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$u['tenant_id'], $u['id'], $name, $data, $now, $now]);
        return ['project' => $this->full($u, $this->find($u, (int) $this->db->lastInsertId()))];
    }

    public function update(Request $req, array $p): array
    {
        $u = $this->auth->requireUser();
        $row = $this->find($u, $p['id']);
        if (!$this->access($u, $row)['edit']) {
            throw new HttpException(403, 'Sul on selle maja kohta ainult vaatamisõigus.');
        }
        $d = $req->json();
        $name = array_key_exists('name', $d) ? (string) Input::str($d, 'name', 200) : $row['name'];
        $data = array_key_exists('data', $d) ? $this->encodeData($d) : $row['data'];
        $this->db->prepare('UPDATE projects SET name = ?, data = ?, updated_at = ? WHERE id = ?')
            ->execute([$name, $data, gmdate('Y-m-d H:i:s'), $row['id']]);
        return ['project' => $this->full($u, $this->find($u, (int) $row['id']))];
    }

    public function delete(Request $req, array $p): array
    {
        $u = $this->auth->requireUser();
        $row = $this->find($u, $p['id']);
        $this->assertManage($u, $row);
        $this->db->prepare('DELETE FROM project_shares WHERE project_id = ?')->execute([$row['id']]);
        $this->db->prepare('DELETE FROM projects WHERE id = ?')->execute([$row['id']]);
        return ['ok' => true];
    }

    // ------------------------------------------------------------------ jagamine

    public function shares(Request $req, array $p): array
    {
        $u = $this->auth->requireUser();
        $row = $this->find($u, $p['id']);
        $this->assertManage($u, $row);
        return ['shares' => $this->loadShares((int) $row['id'])];
    }

    public function addShare(Request $req, array $p): array
    {
        $u = $this->auth->requireUser();
        $row = $this->find($u, $p['id']);
        $this->assertManage($u, $row);
        $d = $req->json();
        $email = Input::email($d);
        $permission = $d['permission'] ?? 'view';
        if (!in_array($permission, ['view', 'edit'], true)) {
            throw new HttpException(422, 'Õigus peab olema "view" või "edit".');
        }
        $st = $this->db->prepare('SELECT id FROM users WHERE email = ? AND active = 1');
        $st->execute([$email]);
        $target = $st->fetchColumn();
        if ($target === false) {
            throw new HttpException(404, 'Selle e-postiga kasutajat ei leitud.');
        }
        $target = (int) $target;
        if ($target === (int) $row['owner_id']) {
            throw new HttpException(422, 'See kasutaja on maja omanik.');
        }
        $this->db->prepare('DELETE FROM project_shares WHERE project_id = ? AND user_id = ?')->execute([$row['id'], $target]);
        $this->db->prepare('INSERT INTO project_shares (project_id, user_id, permission, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$row['id'], $target, $permission, $u['id'], gmdate('Y-m-d H:i:s')]);
        return ['shares' => $this->loadShares((int) $row['id'])];
    }

    public function removeShare(Request $req, array $p): array
    {
        $u = $this->auth->requireUser();
        $row = $this->find($u, $p['id']);
        // omanik/admin eemaldab kellegi; jagatud kasutaja võib iseennast eemaldada
        if ($p['userId'] !== $u['id']) {
            $this->assertManage($u, $row);
        }
        $this->db->prepare('DELETE FROM project_shares WHERE project_id = ? AND user_id = ?')->execute([$row['id'], $p['userId']]);
        return ['shares' => $this->access($u, $row)['manage'] ? $this->loadShares((int) $row['id']) : []];
    }

    // ------------------------------------------------------------------ abi

    /** @return array<string, mixed> */
    private function find(array $u, int $id): array
    {
        $st = $this->db->prepare(
            'SELECT p.*, o.name AS owner_name, o.email AS owner_email, s.permission AS share_permission,
                    (SELECT COUNT(*) FROM project_shares x WHERE x.project_id = p.id) AS share_count
             FROM projects p
             LEFT JOIN users o ON o.id = p.owner_id
             LEFT JOIN project_shares s ON s.project_id = p.id AND s.user_id = ?
             WHERE p.id = ?'
        );
        $st->execute([$u['id'], $id]);
        $row = $st->fetch();
        if (!$row || !$this->access($u, $row)['view']) {
            throw new HttpException(404, 'Maja ei leitud.');
        }
        return $row;
    }

    /** @return array{view: bool, edit: bool, manage: bool, via: string} */
    private function access(array $u, array $row): array
    {
        $owner = (int) ($row['owner_id'] ?? 0) === $u['id'];
        $admin = $u['role'] === 'superadmin'
            || ($u['role'] === 'admin' && (int) $row['tenant_id'] === $u['tenant_id']);
        $share = $row['share_permission'] ?? null;
        $via = $owner ? 'owner' : ($share !== null ? 'shared' : ($admin ? 'admin' : 'none'));
        return [
            'view' => $owner || $admin || $share !== null,
            'edit' => $owner || $admin || $share === 'edit',
            'manage' => $owner || $admin,
            'via' => $via,
        ];
    }

    private function assertManage(array $u, array $row): void
    {
        if (!$this->access($u, $row)['manage']) {
            throw new HttpException(403, 'Seda saab teha ainult maja omanik või admin.');
        }
    }

    /** @return list<array<string, mixed>> */
    private function loadShares(int $projectId): array
    {
        $st = $this->db->prepare(
            'SELECT s.user_id, s.permission, s.created_at, u.email, u.name, t.name AS tenant_name
             FROM project_shares s JOIN users u ON u.id = s.user_id JOIN tenants t ON t.id = u.tenant_id
             WHERE s.project_id = ? ORDER BY u.email'
        );
        $st->execute([$projectId]);
        return array_map(static fn ($r) => [
            'userId' => (int) $r['user_id'],
            'email' => $r['email'],
            'name' => $r['name'],
            'tenant' => $r['tenant_name'],
            'permission' => $r['permission'],
            'createdAt' => $r['created_at'],
        ], $st->fetchAll());
    }

    private function encodeData(array $d): string
    {
        if (!isset($d['data']) || !is_array($d['data'])) {
            throw new HttpException(422, "Väli 'data' peab olema objekt.");
        }
        $json = json_encode($d['data'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (strlen($json) > self::MAX_DATA) {
            throw new HttpException(413, 'Maja andmed on liiga suured.');
        }
        return $json;
    }

    private function summary(array $u, array $r): array
    {
        $a = $this->access($u, $r);
        return [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'createdAt' => $r['created_at'],
            'updatedAt' => $r['updated_at'],
            'owner' => $r['owner_id'] !== null ? ['id' => (int) $r['owner_id'], 'name' => $r['owner_name'], 'email' => $r['owner_email']] : null,
            'access' => ['edit' => $a['edit'], 'manage' => $a['manage'], 'via' => $a['via']],
            'shareCount' => (int) ($r['share_count'] ?? 0),
        ];
    }

    private function full(array $u, array $r): array
    {
        return $this->summary($u, $r) + ['data' => json_decode((string) $r['data'], true)];
    }
}
