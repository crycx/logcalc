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

  it('L-maja (kitsam tiib): põhiosa (hari y) ja tiib (hari x, risti ühise seinaga)', () => {
    const p = planTemplate('lshape', 8000, 6000, T, C);
    const v = roofVolumes(p, planGeometry(p, T, C));
    expect(v.length).toBe(2);
    expect(v[0]).toMatchObject({ main: true, ridge: 'y', x0: J, x1: 4000, y0: J, y1: 6000 - J });
    expect(v[1]).toMatchObject({ main: false, ridge: 'x', x0: 4000, x1: 8000 - J, y0: J, y1: 3000 });
  });

  it('L-maja (laiem tiib): laiem osa läbib nurga (kõrgem hari), kitsam liitub oruga', () => {
    // 6000 × 8000: vasak osa 2880 lai, tagumine 3880 lai -> tagumine osa üle kogu laiuse
    const p = planTemplate('lshape', 6000, 8000, T, C);
    const v = roofVolumes(p, planGeometry(p, T, C));
    expect(v.length).toBe(2);
    expect(v[0]).toMatchObject({ main: true, ridge: 'y', x0: J, x1: 3000, y0: 4000, y1: 8000 - J });
    expect(v[1]).toMatchObject({ main: false, ridge: 'x', x0: J, x1: 6000 - J, y0: J, y1: 4000 });
  });

  it('L-maja kalle sama mis ümbritseval ristkülikul (kitsamate osade hari madalam)', () => {
    const p = planTemplate('lshape', 6000, 8000, T, C);
    const ratio = pitchRatio(roofVolumes(p, planGeometry(p, T, C)), base);
    expect(ratio).toBeCloseTo((3200 - 2166) / (6000 - 2 * J - T), 9);
  });
});

describe('L-maja seinad ja katus (8000 × 6000, kitsam tiib)', () => {
  const plan = planTemplate('lshape', 8000, 6000, T, C);
  const lb: HouseInput = { ...base, width: 8000, depth: 6000 };
  const r = calculateHouse({ ...lb, plan });
  const cut = (id: string) => r.cutList.find((w) => w.wall === id)!;
  const gableLens = (id: string) => cut(id).pieces.filter((p) => p.kind === 'gable').map((p) => p.length);

  it('tähised: numbrid eest taha, tähed vasakult paremale', () => {
    expect(plan.walls.map((w) => w.id).sort()).toEqual(['1', '2', '3', 'A', 'B', 'C']);
  });

  it('esisein 1 (põhiosa ots): viil põhiosa laiune, mitte terve maja laiune', () => {
    // põhiosa kesktelgede laius 4000 − 120 = 3880 -> palk 3880 + 40 + 200 = 4120
    expect(Math.max(...gableLens('1'))).toBe(4120);
  });

  it('tagasein 3: viil ainult põhiosa kohal, tiiva kohal üks räästa rida', () => {
    expect(Math.max(...gableLens('3'))).toBe(4120);
    const w3 = r.wallModel.find((w) => w.id === '3')!;
    const eave = w3.rows.filter((x) => x.kind === 'log' && x.x0 !== undefined);
    expect(eave.length).toBe(1);
    expect(eave[0]!.length).toBeGreaterThan(3500);
  });

  it('tiiva viil on külgseinal C (hari x-suunas), vaheseinal 2 viilu pole', () => {
    expect(gableLens('C').length).toBeGreaterThan(0);
    // tiiva laius (kesktelgedel) 3000 − 120 = 2880 -> palk 3120
    expect(Math.max(...gableLens('C'))).toBe(3120);
    expect(gableLens('2')).toEqual([]);
  });

  it('katuselauad ja pärlinid kahe osa kaupa', () => {
    const boards = r.bom.find((l) => l.key === 'katuseLauad')!;
    expect(boards.pieces!.length).toBe(2);
    expect(r.bom.find((l) => l.key === 'parlinid')!.pieces!.length).toBe(2);
    expect(r.warnings.some((w) => w.code === 'roof.valley')).toBe(false);
  });

  it('org: tiiva katus vabast viilust põhiosa räästa jooneni, servalauad ainult vabas otsas', () => {
    const roof = calculateHouse({ ...lb, plan, roof: { boardLength: 0, overhang: 300 } }).roof!;
    const ov = roof.computedOverhang!;
    const wing = roof.parts![0]!;
    // tiib x 4000..7880: vaba ots 7880 + 20 + 100, põhiosa räästas 4000 + 20 + üleulatus
    expect(wing.roofLength).toBeCloseTo(7880 + 120 - (4000 + 20 + ov), 6);
    expect(wing.boardCount).toBe(2 * Math.floor(wing.roofLength / 110));
    expect(wing.edgeBoards.fascia.count).toBe(2);
    expect(wing.edgeBoards.felt.count).toBe(2);
    expect(wing.edgeBoards.supportSmall.pieceLength).toBeCloseTo(wing.roofLength, 6);
    // põhiosa täislaudadega (oru lõikejäägid lähevad tiivale)
    expect(roof.roofLength).toBe(6000);
    expect(roof.edgeBoards.fascia.count).toBe(4);
    // tiiva hari ulatub põhiosa katusesse pool tiiva laiusest
    const pur = calculateHouse({ ...lb, plan, purlins: { count: 0, ridgeOnly: true } }).purlins!.parts![0]!;
    expect(pur.length).toBeCloseTo(3880 + 120 + 2880 / 2, 6);
  });

  it('laiem tiib (6000 × 8000): kitsam põhiosa lõpeb orus, laiem läbiv osa täispikk, viilud külgseintel', () => {
    const p2 = planTemplate('lshape', 6000, 8000, T, C);
    const r2 = calculateHouse({ ...base, plan: p2, roof: { boardLength: 0, overhang: 300 } });
    const g2 = (id: string) => r2.cutList.find((w) => w.wall === id)!.pieces.filter((x) => x.kind === 'gable').map((x) => x.length);
    expect(Math.max(...g2('1'))).toBe(3120);
    expect(Math.max(...g2('A'))).toBe(4120);
    expect(Math.max(...g2('C'))).toBe(4120);
    expect(g2('3')).toEqual([]);
    expect(g2('B')).toEqual([]);
    const roof = r2.roof!;
    // põhiosa y 4000..7880: vaba ots 7880 + 120, orus tagumise osa räästa jooneni 4000 − 20 − üleulatus
    const ovWide = roof.parts![0]!.computedOverhang!;
    expect(roof.roofLength).toBeCloseTo(7880 + 120 - (4000 + 20 + ovWide), 6);
    expect(roof.edgeBoards.fascia.count).toBe(2);
    expect(roof.parts![0]!.roofLength).toBe(6000);
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

describe('L-maja harjaga laiuse suunas: põhiosa viil sisenurga seinal (kasutaja maja 3110 × 3400)', () => {
  // vasak osa täissügav (põhiosa, hari x), parem-tagumine tiib; sisenurga sein B vasaku osa ees
  const t = 28;
  const j = 114;
  const xm = 1555;
  const ym = 1700;
  const plan: HousePlan = {
    ridge: 'x',
    nodes: [
      { id: 'a', x: j, y: j }, { id: 'b', x: 3110 - j, y: j }, { id: 'c', x: 3110 - j, y: ym },
      { id: 'd', x: xm, y: ym }, { id: 'e', x: xm, y: 3400 - j }, { id: 'f', x: j, y: 3400 - j },
    ],
    walls: [
      { id: '3', a: 'a', b: 'b' }, { id: 'C', a: 'b', b: 'c' }, { id: '2', a: 'd', b: 'c' },
      { id: 'B', a: 'd', b: 'e' }, { id: '1', a: 'f', b: 'e' }, { id: 'A', a: 'a', b: 'f' },
    ],
  };
  const r = calculateHouse({
    ...base, width: 3110, depth: 3400, sideWallHeight: 1824, frontBackWallHeight: 1767, roofHeight: 2223,
    log: { thickness: t, height: 114 }, plan,
  });
  const gable = (id: string) => r.wallModel.find((w) => w.id === id)!.rows.filter((x) => x.kind === 'gable');

  it('sein A: täis viil; sein B: pool viilu (harjani), teine pool on tiiva katuse all', () => {
    const a = gable('A');
    const b = gable('B');
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBe(a.length);
    // B kolmnurga pool: iga rida on lühem kui A vastav rida, aga üle poole sellest
    b.forEach((row, i) => {
      expect(row.length).toBeLessThan(a[i]!.length);
      expect(row.length).toBeGreaterThan(a[i]!.length / 2 - 120);
    });
  });

  it('tiiva viil seinal C, seinal 2 viilu pole', () => {
    expect(gable('C').length).toBeGreaterThan(0);
    expect(gable('2')).toEqual([]);
  });
});

