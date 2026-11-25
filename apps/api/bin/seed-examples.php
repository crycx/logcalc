<?php
declare(strict_types=1);

/**
 * Lisab näidismajad (Bente IV 28, Placas I 40, Brantevik II 40, Annika, Carina, Kolding 40) kasutaja salvestatud majadeks.
 * Olemasolevat sama nimega maja ei dubleerita.
 *
 *   php bin/seed-examples.php [--email=kasutaja@firma.ee]
 *
 * Ilma --email-ita: ainus superadmin.
 */
require __DIR__ . '/../src/bootstrap.php';

use LogCalc\Db;

$opt = getopt('', ['email::']);
$pdo = Db::connect(logcalc_config()['db']);
Db::migrate($pdo, LOGCALC_APP_ROOT . '/schema');

if (!empty($opt['email'])) {
    $st = $pdo->prepare('SELECT id, tenant_id, email FROM users WHERE email = ?');
    $st->execute([strtolower((string) $opt['email'])]);
    $users = $st->fetchAll();
} else {
    $users = $pdo->query("SELECT id, tenant_id, email FROM users WHERE role = 'superadmin'")->fetchAll();
}
if (count($users) !== 1) {
    fwrite(STDERR, count($users) === 0 ? "Kasutajat ei leitud.\n" : "Mitu superadmini – anna --email=...\n");
    exit(1);
}
$user = $users[0];

// Vaikeväärtused = frontendi DEFAULT_VALUE (apps/web/src/app/house-form.ts), ilma hindadeta
$defaults = [
    'roofType' => 'gable', 'lengthScenario' => 'log',
    'width' => 2950, 'depth' => 3800, 'sideWallHeight' => 1824, 'frontBackWallHeight' => 1767, 'roofHeight' => 2223,
    'logThickness' => 28, 'logHeight' => 114,
    'longBoards' => [], 'doors' => [], 'windows' => [],
    'floorDirection' => '12',
    'foundationOn' => true, 'joistWidth' => 40, 'joistHeight' => 70, 'joistCount' => 0, 'joistMaxSpacing' => 500,
    'dist12' => 0, 'distAB' => 0, 'ring' => false,
    'floorOn' => true, 'floorBoardWidth' => 110, 'floorGap' => 5,
    'roofOn' => true, 'roofBoardLength' => 0, 'roofOverhang' => 200, 'roofBoardWidth' => 110,
    'purlinsOn' => true, 'purlinCount' => 0, 'ridgeOnly' => false,
];
$row = static fn (int $a, int $b, int $count) => ['a' => $a, 'b' => $b, 'count' => $count];

$examples = [
    'Bente IV 28' => [
        'longBoards' => [$row(4000, 115, 2)],
        'doors' => [$row(1440, 1824, 1)],
    ],
    'Placas I 40' => [
        'width' => 4500, 'depth' => 3000, 'sideWallHeight' => 2052, 'frontBackWallHeight' => 1995, 'roofHeight' => 2565,
        'logThickness' => 40,
        'longBoards' => [$row(3900, 114, 2), $row(3500, 114, 2), $row(3200, 114, 2)],
        'doors' => [$row(1440, 1995, 1)],
        'windows' => [$row(520, 1938, 2)],
    ],
    'Brantevik II 40' => [
        'width' => 3800, 'depth' => 3800, 'sideWallHeight' => 2058, 'frontBackWallHeight' => 1995, 'roofHeight' => 2565,
        'logThickness' => 40,
        'longBoards' => [$row(5100, 120, 2), $row(4700, 114, 2), $row(4400, 114, 2), $row(4100, 114, 2)],
        'doors' => [$row(1440, 1995, 1)],
        'windows' => [$row(765, 990, 1)],
        'floorDirection' => 'AB', 'floorBoardWidth' => 95,
    ],
    // Ühekaldelised, Revit-joonistega kinnitatud (packages/calc-engine/test/revit-houses.test.ts)
    'Annika I 28 (ühekalle)' => [
        'roofType' => 'mono', 'width' => 2900, 'depth' => 2000, 'sideWallHeight' => 0,
        'frontBackWallHeight' => 2109, 'roofHeight' => 1881, 'fbAuto' => false,
        'longBoards' => [$row(3100, 114, 2)],
        'doors' => [$row(1440, 1995, 1)],
        'floorDirection' => '12', 'joistMode' => 'auto', 'joistMaxSpacing' => 600,
        'roofOverhang' => 0, 'roofBoardWidth' => 0,
    ],
    'Carina 28 (ühekalle)' => [
        'roofType' => 'mono', 'width' => 3553, 'depth' => 2943, 'sideWallHeight' => 0,
        'frontBackWallHeight' => 2223, 'roofHeight' => 1881, 'fbAuto' => false,
        'longBoards' => [$row(3753, 114, 2)],
        'doors' => [$row(1440, 1995, 1)],
        'windows' => [$row(920, 456, 1)],
        'floorDirection' => 'AB', 'ring' => true, 'joistMode' => 'count', 'joistCount' => 10, 'joistMaxSpacing' => 600,
        'roofOverhang' => 0, 'roofBoardWidth' => 0,
    ],
    // Plaaniga, Revit-iga tükk tüki haaval kinnitatud (packages/calc-engine/test/graph-fixtures.ts KOLDING)
    'Kolding 40 (veranda)' => [
        'width' => 3800, 'depth' => 5700, 'sideWallHeight' => 2166, 'frontBackWallHeight' => 2109, 'roofHeight' => 2670,
        'fbAuto' => false, 'logThickness' => 40,
        'longBoards' => [$row(5900, 114, 4)],
        'doors' => [['a' => 1440, 'b' => 1995, 'count' => 1, 'wall' => '2', 'offset' => 1180, 'sill' => 0]],
        'windows' => [
            ['a' => 520, 'b' => 1938, 'count' => 1, 'wall' => '2', 'offset' => 440, 'sill' => 57],
            ['a' => 520, 'b' => 1938, 'count' => 1, 'wall' => '2', 'offset' => 2840, 'sill' => 57],
        ],
        'plan' => json_decode('{"nodes":[{"id":"3a","x":120,"y":120},{"id":"3b","x":3680,"y":120},{"id":"2a","x":120,"y":3680},{"id":"2b","x":3680,"y":3680},{"id":"1a","x":120,"y":5580},{"id":"1b","x":3680,"y":5580}],"walls":[{"id":"3","a":"3a","b":"3b"},{"id":"2","a":"2a","b":"2b","gable":true},{"id":"1","a":"1a","b":"1b","open":[{"x0":0,"x1":3800,"bottomRows":6,"topRows":1,"cap":50},{"x0":1180,"x1":2620,"topRows":1}],"railings":[{"x0":0,"x1":1180,"rows":6,"firstSpacerRow":2,"spacers":[0,836],"spacerLengths":[440,344],"handrail":true,"post":"start"},{"x0":2620,"x1":3800,"rows":6,"firstSpacerRow":2,"spacers":[2620,3360],"spacerLengths":[344,440],"handrail":true,"post":"end"}]},{"id":"A","a":"3a","b":"1a","open":[{"x0":3800,"x1":5700,"bottomRows":6,"topRows":2,"steps":[400,800,1200]}],"railings":[{"x0":3800,"x1":5700,"rows":5,"spacers":[4358,5260],"spacerLengths":[344,440],"handrail":true}]},{"id":"B","a":"3b","b":"1b","open":[{"x0":3800,"x1":5700,"bottomRows":6,"topRows":2,"steps":[400,800,1200]}],"railings":[{"x0":3800,"x1":5700,"rows":5,"spacers":[4358,5260],"spacerLengths":[344,440],"handrail":true}]}]}', true, 512, JSON_THROW_ON_ERROR),
    ],
];

$exists = $pdo->prepare('SELECT COUNT(*) FROM projects WHERE owner_id = ? AND name = ?');
$insert = $pdo->prepare('INSERT INTO projects (tenant_id, owner_id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
foreach ($examples as $name => $data) {
    $exists->execute([$user['id'], $name]);
    if ((int) $exists->fetchColumn() > 0) {
        echo "olemas:  $name\n";
        continue;
    }
    $now = gmdate('Y-m-d H:i:s');
    $insert->execute([$user['tenant_id'], $user['id'], $name, json_encode($data + $defaults, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $now, $now]);
    echo "lisatud: $name\n";
}
echo "Kasutaja: {$user['email']}\n";
