/** Katusemahud plaanist (WALL-GRAPH.md, etapp 4): L-maja, samal joonel jätkuvad seinad, nummerdus. */
import { describe, expect, it } from 'vitest';
import {
  calculateHouse,
  planGeometry,
  pitchRatio,
  planTemplate,
  rectanglePlan,
  renumberWalls,
  roofVolumes,
  type HouseInput,
  type HousePlan,
} from '../src/index.js';

const C = { cornerOverhang: 100 };
const T = 40;
const J = 120;
const base: HouseInput = {
  roofType: 'gable', lengthScenario: 'log', width: 6000, depth: 8000,
  sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 3200, log: { thickness: T, height: 114 },
  roof: { boardLength: 0, overhang: 0 }, purlins: { count: 0, ridgeOnly: false },
};

describe('katusemahud', () => {
  it('ristkülik: üks maht, hari sügavuse suunas', () => {
    const p = rectanglePlan(6000, 8000, T, C);
    const v = roofVolumes(p, planGeometry(p, T, C));
    expect(v).toEqual([{ x0: J, y0: J, x1: 6000 - J, y1: 8000 - J, ridge: 'y', main: true }]);
  });

  it('vaheseinad ja lahtised osad ei jaga katust (Lund-tüüpi terrass = üks maht)', () => {
    const p = planTemplate('terrace', 4000, 5950, T, C);
    expect(roofVolumes(p, planGeometry(p, T, C)).length).toBe(1);
  });

  it('L-maja: põhiosa (hari y) ja tiib (hari x, risti ühise seinaga)', () => {
    const p = planTemplate('lshape', 6000, 8000, T, C);
    const v = roofVolumes(p, planGeometry(p, T, C));
    expect(v.length).toBe(2);
    expect(v[0]).toMatchObject({ main: true, ridge: 'y', x0: J, x1: 3000, y0: J, y1: 8000 - J });
    expect(v[1]).toMatchObject({ main: false, ridge: 'x', x0: 3000, x1: 6000 - J, y0: J, y1: 4000 });
  });

  it('L-maja kalle sama mis ümbritseval ristkülikul (kitsamate osade hari madalam)', () => {
    const p = planTemplate('lshape', 6000, 8000, T, C);
    const ratio = pitchRatio(roofVolumes(p, planGeometry(p, T, C)), base);
    expect(ratio).toBeCloseTo((3200 - 2166) / (6000 - 2 * J - T), 9);
  });
});

describe('L-maja seinad ja katus', () => {
  const plan = planTemplate('lshape', 6000, 8000, T, C);
  const r = calculateHouse({ ...base, plan });
  const cut = (id: string) => r.cutList.find((w) => w.wall === id)!;
  const gableLens = (id: string) => cut(id).pieces.filter((p) => p.kind === 'gable').map((p) => p.length);

  it('tähised: numbrid eest taha, tähed vasakult paremale', () => {
    expect(plan.walls.map((w) => w.id).sort()).toEqual(['1', '2', '3', 'A', 'B', 'C']);
  });

  it('esisein 1 (põhiosa ots): viil põhiosa laiune, mitte terve maja laiune', () => {
    // põhiosa kesktelgede laius 3000 − 120 = 2880 -> palk 2880 + 40 + 200 = 3120
    expect(Math.max(...gableLens('1'))).toBe(3120);
  });

  it('tagasein 3: viil ainult põhiosa kohal, tiiva kohal üks räästa rida', () => {
    expect(Math.max(...gableLens('3'))).toBe(3120);
    const w3 = r.wallModel.find((w) => w.id === '3')!;
    const eave = w3.rows.filter((x) => x.kind === 'log' && x.x0 !== undefined);
    expect(eave.length).toBe(1);
    expect(eave[0]!.length).toBeGreaterThan(2500);
  });

  it('tiiva viil on külgseinal C (hari x-suunas), vaheseinal 2 viilu pole', () => {
    expect(gableLens('C').length).toBeGreaterThan(0);
    // tiiva laius (kesktelgedel) 4000 − 120 = 3880 -> palk 4120
    expect(Math.max(...gableLens('C'))).toBe(4120);
    expect(gableLens('2')).toEqual([]);
  });

  it('katuselauad ja pärlinid kahe osa kaupa + hoiatus orust', () => {
    const boards = r.bom.find((l) => l.key === 'katuseLauad')!;
    expect(boards.pieces!.length).toBe(2);
    expect(r.bom.find((l) => l.key === 'parlinid')!.pieces!.length).toBe(2);
    expect(r.warnings.some((w) => w.code === 'roof.valley')).toBe(true);
  });

  it('ristküliku plaan: katus sama mis ilma plaanita', () => {
    const a = calculateHouse(base);
    const b = calculateHouse({ ...base, plan: rectanglePlan(6000, 8000, T, C) });
    expect(b.roof).toEqual(a.roof);
    expect(b.purlins).toEqual(a.purlins);
  });
});

describe('samal joonel jätkuvad seinad (esisein kahes osas, vahesein nende vahel)', () => {
  // ekraanipildi maja: esisein 1a (A..vahesein) + 1b (vahesein..B), vahesein 2 ja B
  const W = 3110;
  const D = 3400;
  const xm = 1500;
  const ym = 1700;
  const raw: HousePlan = {
    nodes: [
      { id: 'n1', x: J, y: J }, { id: 'n2', x: W - J, y: J }, { id: 'n3', x: W - J, y: D - J }, { id: 'n4', x: J, y: D - J },
      { id: 'm1', x: xm, y: D - J }, { id: 'm2', x: xm, y: ym }, { id: 'm3', x: W - J, y: ym },
    ],
    walls: [
      { id: 'p', a: 'n4', b: 'm1' }, { id: 'q', a: 'm1', b: 'n3' }, { id: 'r', a: 'n1', b: 'n2' },
      { id: 's', a: 'n1', b: 'n4' }, { id: 't', a: 'n2', b: 'n3' }, { id: 'u', a: 'm2', b: 'm1' }, { id: 'v', a: 'm2', b: 'm3' },
    ],
  };
  const { plan, map } = renumberWalls(raw);
  const r = calculateHouse({ ...base, width: W, depth: D, plan });
  const len = (id: string) => planGeometry(plan, T, C).find((g) => g.id === id)!.length;

  it('nummerdus: esisein 1a ja 1b, vahesein 2, tagasein 3; tähed vasakult A, B, C', () => {
    expect(map).toMatchObject({ p: '1a', q: '1b', v: '2', r: '3', s: 'A', u: 'B', t: 'C' });
  });

  it('jätk vaheseina keskteljel: 1a + 1b = maja laius (ülejääki seina B kohal pole)', () => {
    expect(len('1a') + len('1b')).toBe(W);
    // täisrea palk: nurk + jätk = 2 sälku
    const p1a = r.cutList.find((w) => w.wall === '1a')!.pieces.find((p) => p.kind === 'log')!;
    expect(p1a).toMatchObject({ length: xm, notches: 2 });
  });

  it('esiviil jaguneb kahe seina vahel (kokku maja laius)', () => {
    const g1 = (id: string) => r.wallModel.find((w) => w.id === id)!.rows.filter((x) => x.kind === 'gable');
    const first = (id: string) => g1(id).find((x) => Math.abs(x.y0 - 2109) < 1)!.length;
    expect(first('1a') + first('1b')).toBeCloseTo(W, 6);
  });
});
