<?php
declare(strict_types=1);

namespace LogCalc\Api;

use LogCalc\Auth;
use LogCalc\HttpException;
use LogCalc\Input;
use LogCalc\Request;
use PDO;

/**
 * Kliendi (tenant) seaded: hinnakiri jm.
 * settings = { prices: { seinaLauad: 1.33, ... }, constants: { roofBoardWidth: 110, ... } }
 */
final class TenantApi
{
    public const PRICE_KEYS = [
        'seinaLauad', 'tuuleLiist', 'katuseLauad', 'parlinid', 'porandaLauad', 'terrassiLauad', 'vundament',
        'esiraastalaud', 'papikinnituslaud', 'toelaud38', 'toelaud95',
    ];
    public const CONSTANT_KEYS = [
        'cornerOverhang', 'roofBoardWidth', 'defaultRoofOverhang', 'maxJoistSpacing', 'maxPurlinSpacing',
        'longBoardThreshold', 'fasciaExtra', 'defaultFloorGap',
    ];

    public function __construct(private readonly PDO $db, private readonly Auth $auth)
    {
    }

    public function get(Request $req): array
    {
        $u = $this->auth->requireUser();
        return ['tenant' => $this->load($u['tenant_id'])];
    }

    public function updateSettings(Request $req): array
    {
        $u = $this->auth->requireRole('admin', 'superadmin');
        $d = $req->json();
        $tenant = $this->load($u['tenant_id']);
        $settings = $tenant['settings'];
        if (array_key_exists('prices', $d)) {
            $settings['prices'] = self::numbers($d['prices'], self::PRICE_KEYS, 'prices');
        }
        if (array_key_exists('constants', $d)) {
            $settings['constants'] = self::numbers($d['constants'], self::CONSTANT_KEYS, 'constants');
        }
        if (array_key_exists('catalog', $d)) {
            $settings['catalog'] = self::catalog($d['catalog']);
        }
        $this->db->prepare('UPDATE tenants SET settings = ? WHERE id = ?')
            ->execute([json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $u['tenant_id']]);
        return ['tenant' => $this->load($u['tenant_id'])];
    }

    public function listAll(Request $req): array
    {
        $this->auth->requireRole('superadmin');
        $rows = $this->db->query(
            'SELECT t.id, t.slug, t.name, t.created_at, (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS users
             FROM tenants t ORDER BY t.name'
        )->fetchAll();
        return ['tenants' => array_map(static fn ($r) => [
            'id' => (int) $r['id'], 'slug' => $r['slug'], 'name' => $r['name'], 'createdAt' => $r['created_at'], 'users' => (int) $r['users'],
        ], $rows)];
    }

    public function create(Request $req): array
    {
        $this->auth->requireRole('superadmin');
        $d = $req->json();
        $name = (string) Input::str($d, 'name', 120);
        $slug = strtolower((string) Input::str($d, 'slug', 60));
        if (!preg_match('/^[a-z0-9][a-z0-9-]*$/', $slug)) {
            throw new HttpException(422, 'Slug võib sisaldada ainult a-z, 0-9 ja sidekriipsu.');
        }
        try {
            $this->db->prepare('INSERT INTO tenants (slug, name, settings, created_at) VALUES (?, ?, ?, ?)')
                ->execute([$slug, $name, '{}', gmdate('Y-m-d H:i:s')]);
        } catch (\PDOException) {
            throw new HttpException(409, 'Sellise lühinimega klient on juba olemas.');
        }
        return ['tenant' => $this->load((int) $this->db->lastInsertId())];
    }

    /** @return array<string, mixed> */
    private function load(int $id): array
    {
        $st = $this->db->prepare('SELECT id, slug, name, settings FROM tenants WHERE id = ?');
        $st->execute([$id]);
        $r = $st->fetch() ?: throw new HttpException(404, 'Klienti ei leitud.');
        $settings = json_decode((string) $r['settings'], true);
        return ['id' => (int) $r['id'], 'slug' => $r['slug'], 'name' => $r['name'], 'settings' => is_array($settings) ? $settings : []];
    }

    /**
     * Uste ja akende kataloog: { doors: [{name, width, height, price}], windows: [...] }
     * @return array{doors: list<array<string, mixed>>, windows: list<array<string, mixed>>}
     */
    private static function catalog(mixed $v): array
    {
        if (!is_array($v)) {
            throw new HttpException(422, "Väli 'catalog' peab olema objekt.");
        }
        $out = ['doors' => [], 'windows' => []];
        foreach (['doors', 'windows'] as $kind) {
            $list = $v[$kind] ?? [];
            if (!is_array($list) || count($list) > 200) {
                throw new HttpException(422, "Väli 'catalog.$kind' peab olema loend (max 200).");
            }
            foreach ($list as $i => $item) {
                $name = is_array($item) ? trim((string) ($item['name'] ?? '')) : '';
                if ($name === '' || mb_strlen($name) > 80) {
                    throw new HttpException(422, "Kataloogi rida $kind.$i: nimi on kohustuslik (max 80 märki).");
                }
                $nums = [];
                foreach (['width' => 20000, 'height' => 20000, 'price' => 1_000_000] as $k => $max) {
                    $n = $item[$k] ?? 0;
                    if ((!is_int($n) && !is_float($n)) || $n < 0 || $n > $max) {
                        throw new HttpException(422, "Kataloogi rida $kind.$i: '$k' peab olema arv 0…$max.");
                    }
                    $nums[$k] = $k === 'price' ? round((float) $n, 2) : (int) round((float) $n);
                }
                $out[$kind][] = ['name' => $name] + $nums;
            }
        }
        return $out;
    }

    /**
     * @param list<string> $keys
     * @return array<string, float>
     */
    private static function numbers(mixed $v, array $keys, string $field): array
    {
        if (!is_array($v)) {
            throw new HttpException(422, "Väli '$field' peab olema objekt.");
        }
        $out = [];
        foreach ($v as $k => $n) {
            if (!in_array($k, $keys, true)) {
                continue;
            }
            if (!is_int($n) && !is_float($n) || $n < 0 || $n > 1_000_000) {
                throw new HttpException(422, "Väli '$field.$k' peab olema arv >= 0.");
            }
            $out[$k] = (float) $n;
        }
        return $out;
    }
}
