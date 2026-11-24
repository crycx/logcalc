/**
 * Seinamudeli lõikenimekiri vs Viktra Revit-joonised (Wall 1/2/A/B tabelid, "_S_" PDF-id Dropboxis).
 * Avade asukohad on võetud seinte mõõtketist (nt Placas "505 | 520 | 505 | 1440 | 505 | 520 | 505").
 * Võrdlus: iga profiili tükid pikkuse järgi sorteeritult, lubatud ±15 mm (viilupalgid erinevad Revitist mõne mm).
 */
import { describe, expect, it } from 'vitest';
import { calculateHouse, type HouseInput } from '../src/index.js';

/** [profiil, arv, pikkus] */
type Piece = [string, number, number];

interface Case {
  name: string;
  input: HouseInput;
  walls: Record<'1' | '2' | 'A' | 'B', Piece[]>;
}

const TOL = 15;

const CASES: Case[] = [
  {
    name: 'Annika I 28 (ühekalle)',
    input: {
      roofType: 'mono', lengthScenario: 'log', width: 2900, depth: 2000, sideWallHeight: 0,
      frontBackWallHeight: 2109, roofHeight: 1881, log: { thickness: 28, height: 114 },
      longBoards: [{ length: 3100, height: 114, count: 2 }],
      doors: [{ width: 1440, height: 1995, count: 1, wall: '1', offset: 730 }],
    },
    walls: {
      '1': [['28x57', 2, 730], ['28x114', 34, 730], ['28x114', 1, 3100]],
      '2': [['28x57', 1, 2900], ['28x114', 15, 2900], ['28x114', 1, 3100]],
      A: [['28x114', 1, 543], ['28x114', 1, 1429], ['28x114', 1, 2000], ['28x114', 16, 2000]],
      B: [['28x114', 1, 543], ['28x114', 1, 1429], ['28x114', 1, 2000], ['28x114', 16, 2000]],
    },
  },
  {
    name: 'Bente IV 28 (viilkatus)',
    input: {
      roofType: 'gable', lengthScenario: 'log', width: 2950, depth: 3800, sideWallHeight: 1824,
      frontBackWallHeight: 1767, roofHeight: 2223, log: { thickness: 28, height: 114 },
      longBoards: [{ length: 4000, height: 114, count: 2 }],
      doors: [{ width: 1435, height: 1767, count: 1, wall: '1', offset: 758 }],
    },
    walls: {
      '1': [['28x57', 2, 758], ['28x114', 30, 758], ['28x114', 1, 774], ['28x114', 1, 1544], ['28x114', 1, 2313], ['28x114', 1, 2950]],
      '2': [['28x57', 1, 2950], ['28x114', 1, 774], ['28x114', 1, 1544], ['28x114', 1, 2313], ['28x114', 1, 2950], ['28x114', 15, 2950]],
      A: [['28x114', 15, 3800], ['28x114', 1, 4000]],
      B: [['28x114', 15, 3800], ['28x114', 1, 4000]],
    },
  },
  {
    name: 'Carina 28 (ühekalle, uks + aken)',
    input: {
      roofType: 'mono', lengthScenario: 'log', width: 3553, depth: 2943, sideWallHeight: 0,
      frontBackWallHeight: 2223, roofHeight: 1881, log: { thickness: 28, height: 114 },
      longBoards: [{ length: 3753, height: 114, count: 2 }],
      doors: [{ width: 1440, height: 1995, count: 1, wall: '1', offset: 450 }],
      // aknalaud = pool palki + 13 rida; kõrgus 4 rida
      windows: [{ width: 920, height: 456, count: 1, wall: '1', offset: 450 + 1440 + 293, sill: 57 + 13 * 114 }],
    },
    walls: {
      '1': [['28x57', 1, 450], ['28x57', 1, 1663], ['28x114', 4, 293], ['28x114', 21, 450], ['28x114', 13, 1663], ['28x114', 1, 3553], ['28x114', 1, 3753]],
      '2': [['28x57', 1, 3553], ['28x114', 15, 3553], ['28x114', 1, 3753]],
      A: [['28x114', 1, 551], ['28x114', 1, 1453], ['28x114', 1, 2362], ['28x114', 1, 2943], ['28x114', 16, 2943]],
      B: [['28x114', 1, 551], ['28x114', 1, 1453], ['28x114', 1, 2362], ['28x114', 1, 2943], ['28x114', 16, 2943]],
    },
  },
  {
    name: 'Placas I 40 (viilkatus, 2 akent + uks)',
    input: {
      roofType: 'gable', lengthScenario: 'log', width: 4500, depth: 3000, sideWallHeight: 2052,
      frontBackWallHeight: 1995, roofHeight: 2565, log: { thickness: 40, height: 114 },
      longBoards: [{ length: 3900, height: 114, count: 2 }, { length: 3500, height: 114, count: 2 }, { length: 3200, height: 114, count: 2 }],
      doors: [{ width: 1440, height: 1995, count: 1, wall: '1', offset: 1530 }],
      windows: [
        { width: 520, height: 1938, count: 1, wall: '1', offset: 505, sill: 57 },
        { width: 520, height: 1938, count: 1, wall: '1', offset: 3475, sill: 57 },
      ],
    },
    walls: {
      '1': [['40x57', 2, 1530], ['40x114', 68, 505], ['40x114', 1, 941], ['40x114', 1, 1878], ['40x114', 1, 2801], ['40x114', 1, 3752], ['40x114', 1, 4500]],
      '2': [['40x57', 1, 4500], ['40x114', 1, 941], ['40x114', 1, 1878], ['40x114', 1, 2801], ['40x114', 1, 3752], ['40x114', 1, 4500], ['40x114', 17, 4500]],
      A: [['40x114', 15, 3000], ['40x114', 1, 3200], ['40x114', 1, 3500], ['40x114', 1, 3900]],
      B: [['40x114', 15, 3000], ['40x114', 1, 3200], ['40x114', 1, 3500], ['40x114', 1, 3900]],
    },
  },
  {
    name: 'Brantevik II 40 (viilkatus, aken + uks, varikatus)',
    input: {
      roofType: 'gable', lengthScenario: 'log', width: 3800, depth: 3800, sideWallHeight: 2052,
      frontBackWallHeight: 1995, roofHeight: 2565, log: { thickness: 40, height: 114 },
      longBoards: [
        { length: 5100, height: 114, count: 2 }, { length: 4700, height: 114, count: 2 },
        { length: 4400, height: 114, count: 2 }, { length: 4100, height: 114, count: 2 },
      ],
      doors: [{ width: 1440, height: 1995, count: 1, wall: '1', offset: 1785 }],
      // aknalaud = pool palki + 8 rida; kõrgus 9 rida
      windows: [{ width: 770, height: 9 * 114, count: 1, wall: '1', offset: 575, sill: 57 + 8 * 114 }],
    },
    walls: {
      '1': [['40x57', 1, 575], ['40x57', 1, 1785], ['40x114', 9, 440], ['40x114', 26, 575], ['40x114', 8, 1785],
        ['40x114', 1, 787], ['40x114', 1, 1568], ['40x114', 1, 2349], ['40x114', 1, 3130], ['40x114', 1, 3794]],
      '2': [['40x57', 1, 3800], ['40x114', 1, 787], ['40x114', 1, 1568], ['40x114', 1, 2349], ['40x114', 1, 3130], ['40x114', 1, 3794], ['40x114', 17, 3800]],
      A: [['40x114', 14, 3800], ['40x114', 1, 4100], ['40x114', 1, 4400], ['40x114', 1, 4700], ['40x114', 1, 5100]],
      B: [['40x114', 14, 3800], ['40x114', 1, 4100], ['40x114', 1, 4400], ['40x114', 1, 4700], ['40x114', 1, 5100]],
    },
  },
];

/** Profiilide kaupa sorteeritud pikkuste loend */
const expand = (pieces: { profile: string; count: number; length: number }[]) => {
  const m = new Map<string, number[]>();
  for (const p of pieces) m.set(p.profile, [...(m.get(p.profile) ?? []), ...Array<number>(p.count).fill(p.length)]);
  for (const list of m.values()) list.sort((a, b) => a - b);
  return m;
};

describe.each(CASES)('Lõikenimekiri vs Revit: $name', ({ input, walls }) => {
  const r = calculateHouse(input);

  it.each(['1', '2', 'A', 'B'] as const)('sein %s: samad tükid (±15 mm)', (id) => {
    const cut = r.cutList.find((c) => c.wall === id)!;
    const actual = expand(cut.pieces);
    const expected = expand(walls[id].map(([profile, count, length]) => ({ profile, count, length })));
    expect([...actual.keys()].sort()).toEqual([...expected.keys()].sort());
    for (const [profile, exp] of expected) {
      const act = actual.get(profile)!;
      expect(act.length, `${id} ${profile} tükkide arv`).toBe(exp.length);
      exp.forEach((len, i) => expect(Math.abs(act[i]! - len), `${id} ${profile} tükk ${i}: ${act[i]} vs ${len}`).toBeLessThanOrEqual(TOL));
    }
  });

  it('lõikenimekirja jm kokku ≈ seinte jm (mootor)', () => {
    const total = r.cutList.reduce((s, c) => s + c.totalJm, 0);
    expect(Math.abs(total - r.walls.netJm)).toBeLessThan(0.1);
  });
});

describe('tähised nagu Revitis', () => {
  it('Placas sein 1: otsatükid (sälguga) ja avade vahelised tükid on eri tähised (Revit 1LG-5 34 + 1LG-7 34)', () => {
    const cut = calculateHouse(CASES[3]!.input).cutList.find((c) => c.wall === '1')!;
    const p505 = cut.pieces.filter((p) => p.length === 505);
    expect(p505.map((p) => [p.notches, p.count]).sort()).toEqual([[0, 34], [1, 34]]);
    expect(new Set(p505.map((p) => p.mark)).size).toBe(2);
  });

  it('Carina sein 1: vasaku otsa ja akna parempoolsed 450 tükid on üks detail (Revit 1LG-2 21 × 450)', () => {
    const cut = calculateHouse(CASES[2]!.input).cutList.find((c) => c.wall === '1')!;
    expect(cut.pieces.filter((p) => p.length === 450 && p.profile === '28x114').map((p) => p.count)).toEqual([21]);
  });

  it('Annika sein 1: 1BL-1, 1LG-1, 1TL-1; külgseina kolmnurk tähisega *', () => {
    const r = calculateHouse(CASES[0]!.input);
    const w1 = r.cutList.find((c) => c.wall === '1')!;
    expect(w1.pieces.map((p) => p.mark)).toEqual(['1BL-1', '1LG-1', '1TL-1']);
    const a = r.cutList.find((c) => c.wall === 'A')!;
    expect(a.pieces.filter((p) => p.mark.endsWith('*')).length).toBe(3);
  });
});
