/** 3D mudel (WALL-GRAPH.md, etapp 5): palgid oma kohal, katusepinnad, viilupalkide lõikejoon. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONSTANTS, calculateHouse, houseModel3d, planTemplate, type HouseInput } from '../src/index.js';

const C = DEFAULT_CONSTANTS;
const base: HouseInput = {
  roofType: 'gable', lengthScenario: 'log', width: 6000, depth: 8000,
  sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 3200, log: { thickness: 40, height: 114 },
  roof: {}, purlins: {},
};

describe('3D: ristkülik viilkatusega', () => {
  const r = calculateHouse(base);
  const m = houseModel3d(base, r, C);

  it('4 seina, iga palgitükk mudelist; 2 katusepoolt, katus räästaseina ülemise palgi peal', () => {
    expect(m.walls.map((w) => w.id).sort()).toEqual(['1', '2', 'A', 'B']);
    expect(m.roofs.length).toBe(2);
    // katus toetub räästaseina ülemise palgi siseservale; välisserv lõigatakse kaldu (faas)
    const wa = m.walls.find((w) => w.id === 'A')!;
    const eaveTop = Math.max(...wa.pieces.map((p) => p.y1));
    const roofAt = (r: (typeof m.roofs)[0], x: number) => {
      const [p0, , p2] = r.pts;
      return p0[2] + ((x - p0[0]) / (p2[0] - p0[0])) * (p2[2] - p0[2]);
    };
    expect(roofAt(m.roofs[0]!, 120 + 20)).toBeCloseTo(eaveTop, 6);
    // A kulgeb tagant ette (u = (0, 1)), normaal (−1, 0) = väljapoole: s = +t/2 on välisserv, madalam
    const rc = wa.roofCross!;
    expect(rc.z0 - rc.k * 20).toBeCloseTo(eaveTop, 6);
    expect(rc.z0 + rc.k * 20).toBeCloseTo(roofAt(m.roofs[0]!, 100), 6);
    expect(rc.k).toBeLessThan(0);
    expect(m.walls.find((w) => w.id === '1')!.roofCross).toBeNull();
    // hari ligikaudu Hari h (räästa rea ümarduse võrra kõrgem)
    for (const roof of m.roofs) expect(Math.abs(Math.max(...roof.pts.map((p) => p[2])) - 3200)).toBeLessThan(120);
    // räästas allpool küljeseina ülemist serva (üleulatus)
    expect(Math.min(...m.roofs[0]!.pts.map((p) => p[2]))).toBeLessThan(2166);
  });

  it('sein 1: palgi algus vasakus otsas (x = 0), kesktelg esiseina joonel', () => {
    const w1 = m.walls.find((w) => w.id === '1')!;
    expect(w1.origin).toEqual({ x: 0, y: 8000 - 120 });
    expect(w1.u).toEqual({ x: 1, y: 0 });
    expect(w1.length).toBe(6000);
  });

  it('viilusein: katuse joon tõuseb harjani keskel; räästasein joont ei saa', () => {
    const w1 = m.walls.find((w) => w.id === '1')!;
    const peak = w1.roofLine!.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(peak[0]).toBeCloseTo(3000, 6);
    expect(peak[1]).toBeCloseTo(Math.max(...m.roofs[0]!.pts.map((p) => p[2])), 6);
    expect(m.walls.find((w) => w.id === 'A')!.roofLine).toBeNull();
  });

  it('katus ulatub harja suunas palgi otsteni', () => {
    const ys = m.roofs[0]!.pts.map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(0, 6);
    expect(Math.max(...ys)).toBeCloseTo(8000, 6);
  });
});

describe('3D: viilupalgid katuse järgi (Revit Bente IV 28: 15 + faasitud ülemine palk = 1824, hari 2223)', () => {
  const input: HouseInput = {
    roofType: 'gable', lengthScenario: 'log', width: 2950, depth: 3800, sideWallHeight: 1824, frontBackWallHeight: 1767,
    roofHeight: 2223, log: { thickness: 28, height: 114 }, longBoards: [{ length: 4000, height: 114, count: 2 }], roof: {}, purlins: {},
  };
  const m = houseModel3d(input, calculateHouse(input), C);
  const w1 = m.walls.find((w) => w.id === '1')!;
  const roofAt = (X: number) => {
    const l = w1.roofLine!;
    for (let i = 1; i < l.length; i++) {
      const [x0, z0] = l[i - 1]!;
      const [x1, z1] = l[i]!;
      if (X >= x0 - 1e-6 && X <= x1 + 1e-6) return z0 + ((X - x0) / (x1 - x0 || 1)) * (z1 - z0);
    }
    return NaN;
  };

  it('viilupalgi alumised nurgad katusejoonel (lõikenimekirja pikkus = alumine serv), tipp Hari h', () => {
    const gable = w1.pieces.filter((p) => p.kind === 'gable' && p.x1 - p.x0 < 2950 - 1);
    // Revit 2313 / 1544 / 774 (mudel paar mm lühem, vt graph-houses ±15)
    expect(gable.length).toBe(3);
    gable.forEach((p, i) => expect(Math.abs(p.x1 - p.x0 - [2313, 1544, 774][i]!)).toBeLessThanOrEqual(6));
    for (const p of gable) {
      expect(roofAt(p.x0)).toBeCloseTo(p.y0, 0);
      expect(roofAt(p.x1)).toBeCloseTo(p.y0, 0);
    }
    expect(Math.max(...w1.roofLine!.map((q) => q[1]))).toBeCloseTo(2223, 6);
  });

  it('räästasein: ülemine palk (4000) siseservas 1824, välisserv faasitud', () => {
    const wa = m.walls.find((w) => w.id === 'A')!;
    expect(Math.max(...wa.pieces.map((p) => p.y1))).toBe(1824);
    expect(wa.roofCross!.z0 - wa.roofCross!.k * 14).toBeCloseTo(1824, 6);
  });
});

describe('3D: L-maja', () => {
  const model = (W: number, D: number) => {
    const input = { ...base, width: W, depth: D, plan: planTemplate('lshape', W, D, 40, C) };
    return houseModel3d(input, calculateHouse(input), C);
  };
  const top = (rs: { pts: number[][] }[]) => Math.max(...rs.flatMap((r) => r.pts.map((p) => p[2]!)));

  it('kitsam tiib (8000 × 6000): tiiva hari madalam ja ulatub orus põhiosa katusesse pool tiiva laiusest', () => {
    const m = model(8000, 6000);
    expect(m.roofs.length).toBe(4);
    const wing = m.roofs.filter((r) => r.part === 1);
    expect(top(wing)).toBeLessThan(top(m.roofs.filter((r) => r.part === 0)));
    // tiib x 4000..7880, laius 2880: ots orus 4000 − 1440
    const xs = wing.flatMap((r) => r.pts.map((p) => p[0]));
    expect(Math.min(...xs)).toBeCloseTo(4000 - 2880 / 2, 6);
    expect(Math.max(...xs)).toBeCloseTo(8000, 6);
  });

  it('laiem tiib (6000 × 8000): laiem osa läbib, kitsam põhiosa ulatub orus selle katusesse', () => {
    const m = model(6000, 8000);
    const main = m.roofs.filter((r) => r.part === 0);
    const wide = m.roofs.filter((r) => r.part === 1);
    expect(top(main)).toBeLessThan(top(wide));
    const ys = main.flatMap((r) => r.pts.map((p) => p[1]));
    expect(Math.min(...ys)).toBeCloseTo(4000 - 2880 / 2, 6);
    const xs = wide.flatMap((r) => r.pts.map((p) => p[0]));
    expect(Math.min(...xs)).toBeCloseTo(0, 6);
    expect(Math.max(...xs)).toBeCloseTo(6000, 6);
  });
});

describe('3D: ühekalle', () => {
  const input: HouseInput = { ...base, roofType: 'mono', sideWallHeight: 0, frontBackWallHeight: 2109, roofHeight: 1881 };
  const m = houseModel3d(input, calculateHouse(input), C);
  it('üks katusepind, esiserv kõrgem', () => {
    expect(m.roofs.length).toBe(1);
    const [p0, , p2] = m.roofs[0]!.pts;
    expect(p0[1]).toBeGreaterThan(p2[1]);
    expect(p0[2]).toBeGreaterThan(p2[2]);
  });
});
