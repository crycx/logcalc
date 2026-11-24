/**
 * Võrdlus Viktra Revit-joonistega ("_S_" PDF-id, Dropbox/logcalc/Vanad joonised – EI OLE repos).
 * Revit'i väärtused on võetud lõikenimekirjadest (Wall 1/2/A/B) ja "List of all items" tabelitest.
 * Need testid kalibreerisid valemid D9–D12 (vt DEVIATIONS.md).
 */
import { describe, expect, it } from 'vitest';
import { calculateHouse, type HouseInput } from '../src/index.js';

interface RevitHouse {
  name: string;
  input: HouseInput;
  revit: {
    wallsJm: number;
    joists: { count: number | null; length: number };
    floor: { count: number; length: number };
    roofBoards: number;
    /** pärlinid + harjapärlin kokku */
    purlins: number;
  };
}

const base = { lengthScenario: 'log' as const, roof: {}, purlins: {} };

const HOUSES: RevitHouse[] = [
  {
    name: 'Annika I 28 (ühekalle)',
    input: {
      ...base, roofType: 'mono', width: 2900, depth: 2000, sideWallHeight: 0, frontBackWallHeight: 2109, roofHeight: 1881,
      log: { thickness: 28, height: 114 },
      longBoards: [{ length: 3100, height: 114, count: 2 }],
      doors: [{ width: 1440, height: 1995, count: 1 }],
      floorDirection: '12', foundation: { joistWidth: 40, joistHeight: 70 }, floor: { boardWidth: 110 },
    },
    revit: { wallsJm: 150.82, joists: { count: 4, length: 2690 }, floor: { count: 24, length: 1740 }, roofBoards: 28, purlins: 1 },
  },
  {
    name: 'Bente IV 28 (viilkatus)',
    input: {
      ...base, roofType: 'gable', width: 2950, depth: 3800, sideWallHeight: 1824, frontBackWallHeight: 1767, roofHeight: 2223,
      log: { thickness: 28, height: 114 },
      longBoards: [{ length: 4000, height: 114, count: 2 }],
      doors: [{ width: 1435, height: 1767, count: 1 }],
      floorDirection: '12', foundation: { joistWidth: 40, joistHeight: 70 }, floor: { boardWidth: 110 },
    },
    // prusse 8 (vahe 508) – automaatika (max 600) annab 7, seepärast count: null
    revit: { wallsJm: 208.62, joists: { count: null, length: 2740 }, floor: { count: 25, length: 3540 }, roofBoards: 72, purlins: 3 },
  },
  {
    name: 'Carina 28 (ühekalle, uks + aken, ring)',
    input: {
      ...base, roofType: 'mono', width: 3553, depth: 2943, sideWallHeight: 0, frontBackWallHeight: 2223, roofHeight: 1881,
      log: { thickness: 28, height: 114 },
      longBoards: [{ length: 3753, height: 114, count: 2 }],
      doors: [{ width: 1440, height: 1995, count: 1 }],
      windows: [{ width: 920, height: 456, count: 1 }],
      floorDirection: 'AB', foundation: { joistWidth: 40, joistHeight: 70, ring: true }, floor: { boardWidth: 110 },
    },
    // prusse 10 (vahe 368) – mudelipõhine valik, automaatika ei taba
    revit: { wallsJm: 211.05, joists: { count: null, length: 2654 }, floor: { count: 25, length: 3295 }, roofBoards: 34, purlins: 3 },
  },
  {
    name: 'Placas I 40 (viilkatus, varikatus)',
    input: {
      ...base, roofType: 'gable', width: 4500, depth: 3000, sideWallHeight: 2052, frontBackWallHeight: 1995, roofHeight: 2565,
      log: { thickness: 40, height: 114 },
      longBoards: [{ length: 3900, height: 114, count: 2 }, { length: 3500, height: 114, count: 2 }, { length: 3200, height: 114, count: 2 }],
      doors: [{ width: 1440, height: 1995, count: 1 }],
      windows: [{ width: 520, height: 1938, count: 2 }],
      floorDirection: '12', foundation: { joistWidth: 40, joistHeight: 70 }, floor: { boardWidth: 110 },
    },
    // Revit: katuselaudu 72; reegel annab 70 (3900/110 = 35,5 -> 35 poole kohta). Tõenäoliselt Revit'i viga.
    revit: { wallsJm: 257.34, joists: { count: 6, length: 4290 }, floor: { count: 38, length: 2717 }, roofBoards: 70, purlins: 5 },
  },
  {
    name: 'Brantevik II 40 (viilkatus, varikatus 1200)',
    input: {
      ...base, roofType: 'gable', width: 3800, depth: 3800, sideWallHeight: 2052, frontBackWallHeight: 1995, roofHeight: 2565,
      log: { thickness: 40, height: 114 },
      longBoards: [
        { length: 5100, height: 114, count: 2 }, { length: 4700, height: 114, count: 2 },
        { length: 4400, height: 114, count: 2 }, { length: 4100, height: 114, count: 2 },
      ],
      doors: [{ width: 1440, height: 1995, count: 1 }],
      windows: [{ width: 770, height: 990, count: 1 }],
      floorDirection: 'AB', foundation: { joistWidth: 40, joistHeight: 70 }, floor: { boardWidth: 110 },
    },
    revit: { wallsJm: 270.21, joists: { count: 7, length: 3590 }, floor: { count: 32, length: 3515 }, roofBoards: 92, purlins: 3 },
  },
];

describe.each(HOUSES)('Revit: $name', ({ input, revit }) => {
  const r = calculateHouse(input);

  it(`seinad ${revit.wallsJm} jm (±0,05)`, () => {
    expect(Math.abs(r.walls.netJm - revit.wallsJm)).toBeLessThan(0.05);
  });

  it(`vundamendi pruss ${revit.joists.length} mm (±10)${revit.joists.count ? `, ${revit.joists.count} tk` : ''}`, () => {
    expect(Math.abs(r.foundation!.joistLength - revit.joists.length)).toBeLessThanOrEqual(10);
    if (revit.joists.count !== null) expect(r.foundation!.joistCount).toBe(revit.joists.count);
  });

  it(`põrandalauad ${revit.floor.count} tk × ${revit.floor.length} mm (±5)`, () => {
    expect(r.floor!.boardCount).toBe(revit.floor.count);
    expect(Math.abs(r.floor!.boardLength - revit.floor.length)).toBeLessThanOrEqual(5);
  });

  it(`katuselauad ${revit.roofBoards} tk`, () => {
    expect(r.roof!.boardCount).toBe(revit.roofBoards);
  });

  it(`pärlinid kokku ${revit.purlins} tk`, () => {
    expect(r.purlins!.pieces).toBe(revit.purlins);
  });
});

describe('Revit: käsitsi prusside arv (Bente IV 8 tk, Carina 10 tk + ring)', () => {
  it('Bente IV: 8 prussi × 2740', () => {
    const f = calculateHouse({ ...HOUSES[1]!.input, foundation: { joistWidth: 40, joistHeight: 70, count: 8 } }).foundation!;
    expect(f.joistCount).toBe(8);
    expect(f.joistLength).toBe(2740);
  });

  it('Carina: 10 prussi + ring 2 × ~3343', () => {
    const f = calculateHouse({ ...HOUSES[2]!.input, foundation: { joistWidth: 40, joistHeight: 70, ring: true, count: 10 } }).foundation!;
    expect(f.joistCount).toBe(10);
    expect(Math.abs(f.ringPieces!.length - 3343)).toBeLessThanOrEqual(10);
  });
});
