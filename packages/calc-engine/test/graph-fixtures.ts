/** Nora I, Boden II, Lund (Viktra Revit) plaanina – ühised testandmed (graph-houses, floor-plan). */
import type { HouseInput, HousePlan } from '../src/index.js';
export type Piece = [string, number, number]; // [profiil, arv, pikkus]
export const TOL = 15;
export const J = 120; // 100 ülejääki + ½ × 40

export const g = (lengths: number[]): Piece[] => lengths.map((l) => ['40x114', 1, l]);

/** Ristkülik + lisaseinad; x-seinad antakse y (kesktelg) järgi, A/B kulgevad tagant ette */
export function plan(W: number, D: number, xWalls: { id: string; y: number; extra?: object }[], extra: HousePlan['walls'] = [], nodes: HousePlan['nodes'] = []): HousePlan {
  const n: HousePlan['nodes'] = [];
  const walls: HousePlan['walls'] = [];
  for (const w of xWalls) {
    n.push({ id: `${w.id}a`, x: J, y: w.y }, { id: `${w.id}b`, x: W - J, y: w.y });
    walls.push({ id: w.id, a: `${w.id}a`, b: `${w.id}b`, ...w.extra });
  }
  const back = xWalls.reduce((a, b) => (a.y < b.y ? a : b));
  const front = xWalls.reduce((a, b) => (a.y > b.y ? a : b));
  return {
    nodes: [...n, ...nodes],
    walls: [
      ...walls,
      { id: 'A', a: `${back.id}a`, b: `${front.id}a` },
      { id: 'B', a: `${back.id}b`, b: `${front.id}b` },
      ...extra,
    ],
  };
}

export interface Case {
  name: string;
  input: HouseInput;
  walls: Record<string, Piece[]>;
}

export const NORA: Case = {
  name: 'Nora I 40 (garaaž, keskviil)',
  input: {
    roofType: 'gable', lengthScenario: 'log', width: 3200, depth: 5700,
    sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 2564, log: { thickness: 40, height: 114 },
    longBoards: [{ length: 5950, height: 114, count: 2 }],
    plan: plan(3200, 5700, [
      { id: '3', y: J },
      { id: '2', y: 2850, extra: { topOnly: 1, gable: true } },
      { id: '1', y: 5700 - J },
    ]),
    doors: [
      { name: 'garaažiuks', width: 2380, height: 1995, count: 1, wall: '1', offset: 410, sill: 0 },
      { width: 850, height: 1938, count: 1, wall: 'B', offset: 920, sill: 0 },
    ],
    windows: [{ width: 770, height: 1026, count: 1, wall: 'B', offset: 4010, sill: 912 }],
  },
  walls: {
    '1': [['40x57', 2, 410], ['40x114', 34, 410], ['40x114', 1, 3200], ...g([836, 1669, 2503, 3198])],
    '2': [['40x114', 1, 3200], ...g([836, 1669, 2503, 3198])],
    '3': [['40x57', 1, 3200], ['40x114', 18, 3200], ...g([836, 1669, 2503, 3198])],
    A: [['40x114', 18, 5700], ['40x114', 1, 5950]],
    B: [['40x114', 26, 920], ['40x114', 9, 2240], ['40x114', 8, 3930], ['40x114', 1, 5700], ['40x114', 1, 5950]],
  },
};

// Boden: veranda ees (sein 1 = ainult viil), A/B ülemised 3 rida ulatuvad veranda kohale
export const BODEN_GABLE = [284, 568, 852, 1136, 1420 /* Revit 1286, D14 */, 1704, 1987, 2271, 2555, 2839, 2900];
export const BODEN_PORCH = { open: [{ x0: 3800, x1: 4800, topRows: 3 }] };
export const BODEN: Case = {
  name: 'Boden II 40 (lahtine veranda, magamislava serv)',
  input: {
    roofType: 'gable', lengthScenario: 'log', width: 2900, depth: 4800,
    sideWallHeight: 2311, frontBackWallHeight: 2109, roofHeight: 3363, log: { thickness: 40, height: 114 },
    longBoards: [{ length: 4800, height: 145, count: 2 }],
    plan: (() => {
      const p = plan(2900, 4800, [
        { id: '4', y: J },
        { id: '3', y: 2640, extra: { topOnly: 2 } },
        { id: '2', y: 3680 },
        { id: '1', y: 4800 - J, extra: { topOnly: 1 } },
      ]);
      for (const w of p.walls) if (w.id === 'A' || w.id === 'B') Object.assign(w, BODEN_PORCH);
      return p;
    })(),
    doors: [{ width: 1210, height: 1995, count: 1, wall: '2', offset: 1340, sill: 0 }],
    windows: [
      { width: 770, height: 1026, count: 1, wall: '2', offset: 350, sill: 969 },
      { width: 770, height: 1026, count: 1, wall: 'A', offset: 1295, sill: 912 },
    ],
  },
  walls: {
    '1': [['40x114', 1, 2900], ...g(BODEN_GABLE)],
    '2': [['40x57', 1, 350], ['40x57', 1, 1340], ['40x114', 9, 220], ['40x114', 26, 350], ['40x114', 8, 1340], ['40x114', 2, 2900]],
    '3': [['40x114', 2, 2900]],
    '4': [['40x57', 1, 2900], ['40x114', 18, 2900], ...g(BODEN_GABLE)],
    // Revit ALG4/BLG2 4700 (veranda ots faasitud, D15) -> mudelis 4800
    A: [['40x114', 9, 1295], ['40x114', 9, 1735], ['40x114', 8, 3800], ['40x114', 2, 4800], ['40x145', 1, 4800]],
    B: [['40x114', 17, 3800], ['40x114', 2, 4800], ['40x145', 1, 4800]],
  },
};

// Lund: terrass ees (sein 1 = raam piirde ja postidega), sein 2 X-liidetega, AA/AB piirde otspostid
export const LUND_GABLE = [828, 1654, 2481, 3307, 4000];
export const LUND_SIDE = {
  open: [{ x0: 3600, x1: 5650, bottomRows: 7, topRows: 2 }],
  railings: [{ x0: 3600, x1: 5950, rows: 7, spacers: [4475, 5650] }],
};
export const LUND: Case = {
  name: 'Lund 40 (terrass piirdega, viiluga vahesein)',
  input: {
    roofType: 'gable', lengthScenario: 'log', width: 4000, depth: 5950,
    sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 2678, log: { thickness: 40, height: 114 },
    plan: (() => {
      const p = plan(
        4000,
        5950,
        [
          { id: '3', y: J },
          { id: '2', y: 3480, extra: { gable: true } },
          {
            id: '1',
            y: 5950 - J,
            extra: {
              open: [
                { x0: 300, x1: 3700, bottomRows: 7, topRows: 2 },
                { x0: 1200, x1: 2800, topRows: 2 },
              ],
              railings: [
                { x0: 0, x1: 1200, rows: 7, spacers: [0, 900] },
                { x0: 2800, x1: 4000, rows: 7, spacers: [2800, 3700] },
              ],
            },
          },
        ],
        [
          { id: 'AA', a: 'aa', b: 'aa1', height: 741 },
          { id: 'AB', a: 'ab', b: 'ab1', height: 741 },
        ],
        [
          { id: 'aa', x: 1100, y: 5950 - J - 180 }, { id: 'aa1', x: 1100, y: 5950 - J },
          { id: 'ab', x: 2900, y: 5950 - J - 180 }, { id: 'ab1', x: 2900, y: 5950 - J },
        ],
      );
      for (const w of p.walls) if (w.id === 'A' || w.id === 'B') Object.assign(w, LUND_SIDE);
      return p;
    })(),
    doors: [{ width: 1440, height: 1995, count: 1, wall: '2', offset: 600, sill: 0 }],
    windows: [
      { width: 770, height: 1026, count: 1, wall: '2', offset: 2630, sill: 969 },
      { width: 1540, height: 1026, count: 1, wall: 'A', offset: 1030, sill: 912 },
    ],
  },
  walls: {
    // Revit eristab piirde ülemise palgi (1LG9 / ALG6 / BLG5) ja seina ülemise (ATL/BTL) – sama mõõt (D13)
    '1': [['40x57', 2, 1200], ['40x114', 32, 300], ['40x114', 6, 1200], ['40x114', 2, 4000], ...g(LUND_GABLE)],
    '2': [['40x57', 1, 600], ['40x57', 1, 1960], ['40x114', 9, 590], ['40x114', 26, 600], ['40x114', 8, 1960], ['40x114', 1, 4000], ...g(LUND_GABLE)],
    '3': [['40x57', 1, 4000], ['40x114', 18, 4000], ...g(LUND_GABLE)],
    A: [['40x114', 16, 300], ['40x114', 18, 1030], ['40x114', 4, 3600], ['40x114', 6, 5950]],
    B: [['40x114', 16, 300], ['40x114', 13, 3600], ['40x114', 6, 5950]],
    AA: [['40x114', 6, 300], ['40x57', 1, 300]],
    AB: [['40x114', 6, 300], ['40x57', 1, 300]],
  },
};
