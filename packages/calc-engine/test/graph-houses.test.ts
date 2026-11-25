/**
 * Seinte graaf, etapp 2: Nora I 40, Boden II 40, Lund 40 vs Viktra Revit-joonised (Vanad joonised/andmed/*.json).
 * Iga sein: profiili kaupa sorteeritud tükkide pikkused, lubatud ±15 mm (viilupalgid erinevad mõne mm).
 * Teadlikud erinevused (DEVIATIONS.md D13–D15) on kirjas oodatud väärtuste juures.
 */
import { describe, expect, it } from 'vitest';
import { calculateHouse, type HouseInput } from '../src/index.js';
import { BODEN, J, KOLDING, LUND, NORA, TOL, plan, type Piece } from './graph-fixtures.js';


const expand = (pieces: { profile: string; count: number; length: number }[]) => {
  const m = new Map<string, number[]>();
  for (const p of pieces) m.set(p.profile, [...(m.get(p.profile) ?? []), ...Array<number>(p.count).fill(p.length)]);
  for (const list of m.values()) list.sort((a, b) => a - b);
  return m;
};

describe.each([NORA, BODEN, LUND, KOLDING])('Graaf vs Revit: $name', ({ input, walls }) => {
  const r = calculateHouse(input);

  it('seinad nagu Revitis', () => {
    expect(r.cutList.map((c) => c.wall).sort()).toEqual(Object.keys(walls).sort());
  });

  it.each(Object.keys(walls))('sein %s: samad tükid (±15 mm)', (id) => {
    const cut = r.cutList.find((c) => c.wall === id)!;
    const actual = expand(cut.pieces);
    const expected = expand(walls[id]!.map(([profile, count, length]) => ({ profile, count, length })));
    const show = (m: Map<string, number[]>) => JSON.stringify([...m.entries()]);
    expect([...actual.keys()].sort(), show(actual)).toEqual([...expected.keys()].sort());
    for (const [profile, exp] of expected) {
      const act = actual.get(profile)!;
      expect(act.length, `${id} ${profile} tükkide arv: ${act.join(',')}`).toBe(exp.length);
      exp.forEach((len, i) => expect(Math.abs(act[i]! - len), `${id} ${profile} tükk ${i}: ${act[i]} vs ${len}`).toBeLessThanOrEqual(TOL));
    }
  });
});

describe('detailid nagu Revitis (sälgud)', () => {
  it('Nora A: keskviilu liide sälgub ainult ülemist rida -> ALG1 17 × 5700 ja ALG2 1 × 5700 eraldi', () => {
    const A = calculateHouse(NORA.input).cutList.find((c) => c.wall === 'A')!;
    expect(A.pieces.filter((p) => p.length === 5700).map((p) => [p.count, p.notches])).toEqual([[17, 2], [1, 3]]);
  });

  it('Lund A: nurgapost ja piirde otspalgid (1 sälk) vs piirde keskmised vahepalgid (0) -> 13 + 3 × 300', () => {
    const A = calculateHouse(LUND.input).cutList.find((c) => c.wall === 'A')!;
    expect(A.pieces.filter((p) => p.length === 300).map((p) => [p.count, p.notches]).sort()).toEqual([[13, 1], [3, 0]]);
  });

  it('Lund A: ruumi palk 3600 ulatub 100 üle seina 2 (X-liide), läbivad palgid 3 sälku', () => {
    const A = calculateHouse(LUND.input).cutList.find((c) => c.wall === 'A')!;
    expect(A.pieces.find((p) => p.length === 3600)!.notches).toBe(2);
    expect(A.pieces.filter((p) => p.length === 5950).every((p) => p.notches === 3)).toBe(true);
  });
});

describe('pikk sein: max 6 m, jätk vaheseina kohalt, read vaheliti', () => {
  // 9 m pikk maja, vaheseinad y = 3200 ja 5300 juures -> külgseina palgid 9000 jätkatakse
  const W = 4000;
  const D = 9000;
  const input: HouseInput = {
    roofType: 'gable', lengthScenario: 'log', width: W, depth: D,
    sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 2678, log: { thickness: 40, height: 114 },
    plan: plan(W, D, [{ id: '4', y: J }, { id: '3', y: 3200 }, { id: '2', y: 5300 }, { id: '1', y: D - J }]),
  };
  const r = calculateHouse(input);
  const A = r.cutList.find((c) => c.wall === 'A')!;

  it('ükski palk pole pikem kui 6000 ja hoiatust pole', () => {
    expect(Math.max(...A.pieces.map((p) => p.length))).toBeLessThanOrEqual(6000);
    expect(r.warnings.some((w) => w.code === 'wall.logTooLong')).toBe(false);
  });

  it('jätkud vaheliti: 1., 3., ... rida keskele lähemas vaheseinas (5300), 2., 4., ... teises (3200)', () => {
    const byLen = new Map<number, number>();
    for (const p of A.pieces) byLen.set(p.length, (byLen.get(p.length) ?? 0) + p.count);
    // 19 rida: 10 rida 5300 + 3700, 9 rida 3200 + 5800
    expect([...byLen.entries()].sort((a, b) => a[0] - b[0])).toEqual([[3200, 9], [3700, 10], [5300, 10], [5800, 9]]);
    // jätkukohas on mõlemal tükil sälk: otsatükk 1 nurk + 1 jätk = 2
    expect(A.pieces.find((p) => p.length === 3200)!.notches).toBe(2);
    expect(A.totalJm).toBeCloseTo((19 * D) / 1000, 6);
  });

  it('vaheseinata liiga pikk sein -> hoiatus', () => {
    const r2 = calculateHouse({ ...input, plan: undefined });
    expect(r2.warnings.find((w) => w.code === 'wall.logTooLong')?.message).toContain('pikemad kui 6000');
  });
});

describe('Gable Sauna 3 40 (250x760, viktra.ee): 7,8 m külgsein jätkatud vaheseinte kohal', () => {
  // Revit (Gable_Sauna_3_250x760_92503059_S_260212.pdf): seinad 2 ja 3 kesktelg 2580 / 4580 seina 1 otsast.
  // A/B algavad poole palgiga; jätk: BL ja paaris read seinas 3, paaritud read ja TL seinas 2.
  const D = 7800;
  const p = plan(2700, D, [
    { id: '4', y: J },
    { id: '3', y: D - 4580, extra: { gable: true } },
    { id: '2', y: D - 2580, extra: { gable: true } },
    { id: '1', y: D - J },
  ]);
  p.halfStart = 'y';
  const r = calculateHouse({
    roofType: 'gable', lengthScenario: 'log', width: 2700, depth: D,
    sideWallHeight: 2244, frontBackWallHeight: 2166, roofHeight: 2846, log: { thickness: 40, height: 114 },
    longBoards: [{ length: 8000, height: 135, count: 2 }],
    plan: p,
  });

  it('sein A: samad tükid mis Revitis', () => {
    const A = r.cutList.find((c) => c.wall === 'A')!;
    const exp = expand([
      { profile: '40x57', count: 1, length: 4580 }, { profile: '40x57', count: 1, length: 3220 },
      { profile: '40x114', count: 9, length: 2580 }, { profile: '40x114', count: 9, length: 5220 },
      { profile: '40x114', count: 9, length: 4580 }, { profile: '40x114', count: 9, length: 3220 },
      { profile: '40x135', count: 1, length: 2680 }, { profile: '40x135', count: 1, length: 5320 },
    ]);
    expect([...expand(A.pieces).entries()]).toEqual([...exp.entries()]);
    expect(r.warnings.some((w) => w.code === 'wall.logTooLong')).toBe(false);
  });

  it('otsaseinad algavad täispalgiga (19 rida), A/B poole palgiga', () => {
    const w1 = r.cutList.find((c) => c.wall === '1')!;
    expect(w1.pieces.some((x) => x.profile === '40x57')).toBe(false);
    expect(w1.pieces.find((x) => x.kind === 'log' && x.length === 2700)!.count).toBe(19);
  });
});
