<?php
declare(strict_types=1);

namespace LogCalc\Api;

use LogCalc\Auth;
use LogCalc\AuthLog;
use LogCalc\HttpException;
use LogCalc\Input;
use LogCalc\Mailer;
use LogCalc\PasswordTokens;
use LogCalc\Request;
use PDO;

/**
 * Kasutajate haldus ja sisselogimiste logi.
 * Admin: oma kliendi kasutajad ja sündmused. Superadmin: kõik kliendid (ka tundmatu e-postiga katsed).
 */
final class UsersApi
{
    private const ROLE_NAMES = ['user' => 'kasutaja', 'admin' => 'admin', 'superadmin' => 'superadmin'];

    public function __construct(
        private readonly PDO $db,
        private readonly Auth $auth,
        private readonly PasswordTokens $tokens,
        private readonly Mailer $mailer,
        private readonly string $appUrl,
    ) {
    }

    public function list(Request $req): array
    {
        $me = $this->auth->requireRole('admin', 'superadmin');
        $sql = 'SELECT ' . $this->cols() . ' FROM users u JOIN tenants t ON t.id = u.tenant_id';
        $args = [];
        if ($me['role'] !== 'superadmin') {
            $sql .= ' WHERE u.tenant_id = ?';
            $args[] = $me['tenant_id'];
        }
        $st = $this->db->prepare($sql . ' ORDER BY t.name, u.name, u.email');
        $st->execute($args);
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
            $st = $this->db->prepare('SELECT 1 FROM tenants WHERE id = ?');
            $st->execute([$tenantId]);
            if (!$st->fetchColumn()) {
                throw new HttpException(422, 'Klienti ei leitud.');
            }
        }
        // kutse: parooli pole, kasutaja saab e-postiga lingi parooli määramiseks; muidu admin annab algse parooli
        $invite = ($d['invite'] ?? false) === true;
        $password = $d['password'] ?? null;
        if (!$invite) {
            if (!is_string($password)) {
                throw new HttpException(422, 'Algne parool on kohustuslik.');
            }
            Auth::assertPasswordStrength($password);
        }
        $st = $this->db->prepare('SELECT 1 FROM users WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetchColumn()) {
            throw new HttpException(409, 'Selle e-postiga kasutaja on juba olemas.');
        }
        $this->db->prepare('INSERT INTO users (tenant_id, email, name, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
            ->execute([$tenantId, $email, $name, $invite ? null : password_hash((string) $password, PASSWORD_DEFAULT), $role, gmdate('Y-m-d H:i:s')]);
        $id = (int) $this->db->lastInsertId();
        $this->auth->log()->record('user_created', $id, $tenantId, $email, $me['id'], 'roll: ' . self::ROLE_NAMES[$role] . ($invite ? ', kutsega' : ''));
        if (!$invite) {
            return ['user' => $this->find($me, $id)];
        }
        $info = $this->sendLink($me, $this->find($me, $id), 'invite');
        return ['user' => $this->find($me, $id), 'invite' => $info];
    }

    /**
     * Parooli seadmise link uuesti: kutse, kui parool on määramata, muidu uue parooli link. Vana link kaotab kehtivuse.
     */
    public function invite(Request $req, array $p): array
    {
        $me = $this->auth->requireRole('admin', 'superadmin');
        $target = $this->find($me, $p['id']);
        if ($target['role'] === 'superadmin' && $me['role'] !== 'superadmin') {
            throw new HttpException(403, 'Superadmini saab muuta ainult superadmin.');
        }
        if (!$target['active']) {
            throw new HttpException(422, 'Kasutaja on välja lülitatud – aktiveeri ta enne.');
        }
        $info = $this->sendLink($me, $target, $target['passwordSet'] ? 'reset' : 'invite');
        return ['user' => $this->find($me, $target['id']), 'invite' => $info];
    }

    /**
     * Loob lingi ja saadab selle e-postiga. Link tagastatakse ka adminile (kui kiri ei jõua, saab selle ise edasi anda).
     *
     * @param array<string, mixed> $me
     * @param array<string, mixed> $user
     * @return array{url: string, mailed: bool, expiresAt: string, purpose: string}
     */
    private function sendLink(array $me, array $user, string $purpose): array
    {
        $t = $this->tokens->create($user['id'], $purpose, $me['id']);
        $url = rtrim($this->appUrl, '/') . '/parool?t=' . $t['token'];
        $hello = $user['name'] !== '' ? 'Tere, ' . $user['name'] . '!' : 'Tere!';
        $by = $me['name'] !== '' ? (string) $me['name'] : (string) $me['email'];
        $days = PasswordTokens::DAYS;
        $lines = $purpose === 'invite'
            ? [
                $hello,
                '',
                "$by lisas sind LogCalci kasutajaks ({$user['tenant']['name']}).",
                '',
                "Ava link, määra endale parool ja oled kohe sisse logitud (link kehtib $days päeva):",
                $url,
                '',
                "Sinu kasutajanimi: {$user['email']}",
                '',
                'Kui sa seda kirja ei oodanud, võid selle lihtsalt kustutada.',
            ]
            : [
                $hello,
                '',
                "$by saatis sulle lingi LogCalci uue parooli määramiseks.",
                '',
                "Ava link ja määra uus parool (link kehtib $days päeva):",
                $url,
                '',
                "Sinu kasutajanimi: {$user['email']}",
                '',
                'Kui sa seda ei palunud, võid kirja kustutada – vana parool jääb kehtima.',
            ];
        $subject = $purpose === 'invite' ? 'LogCalc: määra oma parool' : 'LogCalc: uue parooli määramine';
        $mailed = $this->mailer->send((string) $user['email'], $subject, implode("\n", $lines) . "\n");
        $this->auth->log()->record(
            'invite_sent',
            $user['id'],
            $user['tenant']['id'],
            (string) $user['email'],
            $me['id'],
            ($purpose === 'invite' ? 'kutse' : 'uue parooli link') . ($mailed ? ', e-kiri saadetud' : ', e-kirja ei saadetud'),
        );
        return ['url' => $url, 'mailed' => $mailed, 'expiresAt' => $t['expiresAt'], 'purpose' => $purpose];
    }

    public function update(Request $req, array $p): array
    {
        $me = $this->auth->requireRole('admin', 'superadmin');
        $target = $this->find($me, $p['id']);
        $tid = $target['tenant']['id'];
        $d = $req->json();
        $changes = [];
        // admin ei tohi muuta superadmini
        if ($target['role'] === 'superadmin' && $me['role'] !== 'superadmin') {
            throw new HttpException(403, 'Superadmini saab muuta ainult superadmin.');
        }
        if (array_key_exists('name', $d)) {
            $name = (string) (Input::str($d, 'name', 120, false) ?? '');
            if ($name !== $target['name']) {
                $this->db->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([$name, $target['id']]);
                $changes[] = 'nimi';
            }
        }
        if (array_key_exists('role', $d) && $d['role'] !== $target['role']) {
            if ($target['id'] === $me['id']) {
                throw new HttpException(422, 'Oma rolli ei saa muuta.');
            }
            $role = $this->role($me, $d['role']);
            $this->db->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $target['id']]);
            $changes[] = 'roll: ' . self::ROLE_NAMES[$target['role']] . ' → ' . self::ROLE_NAMES[$role];
        }
        if (array_key_exists('active', $d) && (bool) $d['active'] !== $target['active']) {
            if ($target['id'] === $me['id']) {
                throw new HttpException(422, 'Iseennast ei saa välja lülitada.');
            }
            $this->db->prepare('UPDATE users SET active = ? WHERE id = ?')->execute([$d['active'] ? 1 : 0, $target['id']]);
            $changes[] = $d['active'] ? 'aktiveeritud' : 'välja lülitatud';
        }
        if ($changes) {
            $this->auth->log()->record('user_updated', $target['id'], $tid, $target['email'], $me['id'], implode(', ', $changes));
        }
        if (array_key_exists('password', $d)) {
            if (!is_string($d['password'])) {
                throw new HttpException(422, 'Vigane parool.');
            }
            $this->auth->setPassword($target['id'], $d['password']);
            $self = $target['id'] === $me['id'];
            $this->auth->log()->record($self ? 'password_changed' : 'password_reset', $target['id'], $tid, $target['email'], $me['id']);
        }
        return ['user' => $this->find($me, $target['id'])];
    }

    /**
     * Sündmuste logi. Filtrid: ?userId=, ?type=, ?before=<id> (lehekülgede kaupa), ?limit= (max 200).
     */
    public function events(Request $req): array
    {
        $me = $this->auth->requireRole('admin', 'superadmin');
        $limit = min(max($req->queryInt('limit', 100) ?? 100, 1), 200);
        $where = [];
        $args = [];
        if ($me['role'] !== 'superadmin') {
            $where[] = 'e.tenant_id = ?';
            $args[] = $me['tenant_id'];
        }
        if (($uid = $req->queryInt('userId')) !== null) {
            $where[] = 'e.user_id = ?';
            $args[] = $uid;
        }
        if (($before = $req->queryInt('before')) !== null) {
            $where[] = 'e.id < ?';
            $args[] = $before;
        }
        $type = $req->query['type'] ?? '';
        if ($type === 'failed') {
            $where[] = "e.type IN ('login_failed', 'login_blocked')";
        } elseif ($type === 'admin') {
            $where[] = "e.type IN ('user_created', 'user_updated', 'password_reset', 'password_changed', 'invite_sent', 'password_set')";
        } elseif (in_array($type, AuthLog::TYPES, true)) {
            $where[] = 'e.type = ?';
            $args[] = $type;
        }
        $sql = 'SELECT e.id, e.type, e.email, e.ip, e.user_agent, e.detail, e.at,
                       e.user_id, u.name AS user_name, u.email AS user_email,
                       e.actor_id, a.name AS actor_name, a.email AS actor_email,
                       t.name AS tenant_name
                FROM auth_events e
                LEFT JOIN users u ON u.id = e.user_id
                LEFT JOIN users a ON a.id = e.actor_id
                LEFT JOIN tenants t ON t.id = e.tenant_id'
            . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY e.id DESC LIMIT ' . ($limit + 1);
        $st = $this->db->prepare($sql);
        $st->execute($args);
        $rows = $st->fetchAll();
        $more = count($rows) > $limit;
        $rows = array_slice($rows, 0, $limit);
        return [
            'events' => array_map(static fn (array $r) => [
                'id' => (int) $r['id'],
                'type' => $r['type'],
                'at' => $r['at'],
                'email' => $r['email'],
                'ip' => $r['ip'],
                'userAgent' => $r['user_agent'],
                'detail' => $r['detail'],
                'user' => $r['user_id'] !== null ? ['id' => (int) $r['user_id'], 'name' => (string) $r['user_name'], 'email' => (string) $r['user_email']] : null,
                'actor' => $r['actor_id'] !== null ? ['id' => (int) $r['actor_id'], 'name' => (string) $r['actor_name'], 'email' => (string) $r['actor_email']] : null,
                'tenant' => $r['tenant_name'],
            ], $rows),
            'more' => $more,
        ];
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
        $sql = 'SELECT ' . $this->cols() . ' FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.id = ?';
        $args = [$id];
        if ($me['role'] !== 'superadmin') {
            $sql .= ' AND u.tenant_id = ?';
            $args[] = $me['tenant_id'];
        }
        $st = $this->db->prepare($sql);
        $st->execute($args);
        $r = $st->fetch() ?: throw new HttpException(404, 'Kasutajat ei leitud.');
        return self::row($r);
    }

    private function cols(): string
    {
        return "u.id, u.email, u.name, u.role, u.active, u.created_at, u.last_login_at, u.tenant_id, t.name AS tenant_name,
                (SELECT COUNT(*) FROM projects p WHERE p.owner_id = u.id) AS project_count,
                CASE WHEN u.password_hash IS NULL OR u.password_hash = '' THEN 0 ELSE 1 END AS password_set, "
            . $this->tokens->pendingSql('u.id') . ' AS link_pending';
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
            'tenant' => ['id' => (int) $r['tenant_id'], 'name' => $r['tenant_name']],
            'projectCount' => (int) $r['project_count'],
            'passwordSet' => (bool) (int) $r['password_set'],
            'linkPending' => (int) $r['link_pending'] > 0,
        ];
    }
}
