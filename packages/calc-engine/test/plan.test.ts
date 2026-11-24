/**
 * Põhiplaan graafina (WALL-GRAPH.md, etapp 1): geomeetria (pikkus, otste pikendus, liited) ja
 * lõikenimekiri liidetest (sälkude arv). Ristkülik läbi graafi = sama mis enne (wall-model.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { calculateHouse, planGeometry, rectanglePlan, PlanError, type HouseInput, type HousePlan } from '../src/index.js';

const C = { cornerOverhang: 100 };
const T = 40;
const J = 100 + T / 2; // kesktelg palgi otsast

const geoById = (plan: HousePlan) => new Map(planGeometry(plan, T, C).map((g) => [g.id, g]));

const base: HouseInput = {
  roofType: 'gable', lengthScenario: 'log', width: 4000, depth: 5950,
  sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 2794, log: { thickness: T, height: 114 },
};

describe('planGeometry', () => {
  it('ristkülik: palgi pikkus = laius/sügavus, liited nurkades', () => {
    const g = geoById(rectanglePlan(4000, 5950, T, C));
    expect(g.get('1')).toMatchObject({ dir: 'x', length: 4000, startExt: J, endExt: J });
    expect(g.get('A')).toMatchObject({ dir: 'y', length: 5950 });
    expect(g.get('1')!.joints).toEqual([{ x: J, wall: 'A' }, { x: 4000 - J, wall: 'B' }]);
    expect(g.get('A')!.joints.map((k) => k.wall)).toEqual(['2', '1']);
  });

  it('X-liide (Lund: sein 2 läbib A ja B): vahesein ulatub üle, A/B saavad keskele liite', () => {
    const plan = rectanglePlan(4000, 5950, T, C);
    // sein 2 Lundis: 3360 + 20 tagaseina välispinnast -> kesktelg y = 100 + 20 + 3380 = 3500 (lähemalt)
    plan.nodes.push({ id: 'm1', x: J, y: 3500 }, { id: 'm2', x: 4000 - J, y: 3500 });
    plan.walls.push({ id: 'M', a: 'm1', b: 'm2' });
    const g = geoById(plan);
    expect(g.get('M')).toMatchObject({ length: 4000, startExt: J, endExt: J });
    expect(g.get('A')!.joints.map((k) => [Math.round(k.x), k.wall])).toEqual([[J, '2'], [3500, 'M'], [5950 - J, '1']]);
  });

  it('T-liide: vahesein ühest seinast keskele, teine ots vaba', () => {
    const plan = rectanglePlan(4000, 6000, T, C);
    plan.nodes.push({ id: 't1', x: 2000, y: J }, { id: 't2', x: 2000, y: 3000 });
    plan.walls.push({ id: 'C', a: 't1', b: 't2' });
    const g = geoById(plan);
    // algab tagaseina juures (läbib selle ülejäägiga), lõpeb vabalt
    expect(g.get('C')).toMatchObject({ dir: 'y', startExt: J, endExt: 0, length: 3000 - J + J });
    expect(g.get('2')!.joints.map((k) => k.wall)).toEqual(['A', 'C', 'B']);
    expect(g.get('1')!.joints.map((k) => k.wall)).toEqual(['A', 'B']);
  });

  it('L-kuju: 6 seina, sisenurgas tavaline nurgaliide', () => {
    //  n1 ─── n2
    //  │       │
    //  │   n4 ─n3
    //  │   │
    //  n6 ─n5
    const plan: HousePlan = {
      nodes: [
        { id: 'n1', x: 0, y: 0 }, { id: 'n2', x: 6000, y: 0 }, { id: 'n3', x: 6000, y: 3000 },
        { id: 'n4', x: 3000, y: 3000 }, { id: 'n5', x: 3000, y: 7000 }, { id: 'n6', x: 0, y: 7000 },
      ],
      walls: [
        { id: '2', a: 'n1', b: 'n2' }, { id: 'B', a: 'n2', b: 'n3' }, { id: '3', a: 'n4', b: 'n3' },
        { id: 'C', a: 'n4', b: 'n5' }, { id: '1', a: 'n6', b: 'n5' }, { id: 'A', a: 'n1', b: 'n6' },
      ],
    };
    const g = geoById(plan);
    for (const w of plan.walls) {
      const x = g.get(w.id)!;
      expect(x.startExt).toBe(J);
      expect(x.endExt).toBe(J);
      expect(x.joints).toHaveLength(2);
    }
    expect(g.get('2')!.length).toBe(6000 + 2 * J);
    expect(g.get('C')!.length).toBe(4000 + 2 * J);
  });

  it('vigane plaan: diagonaal või puuduv sõlm', () => {
    expect(() => planGeometry({ nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 100, y: 100 }], walls: [{ id: 'X', a: 'a', b: 'b' }] }, T, C)).toThrow(PlanError);
    expect(() => planGeometry({ nodes: [{ id: 'a', x: 0, y: 0 }], walls: [{ id: 'X', a: 'a', b: 'zzz' }] }, T, C)).toThrow(/sõlm zzz/);
  });
});

describe('lõikenimekiri plaanist', () => {
  it('plaan = ristkülik annab sama tulemuse kui ilma plaanita', () => {
    const a = calculateHouse(base);
    const b = calculateHouse({ ...base, plan: rectanglePlan(4000, 5950, T, C) });
    expect(b.cutList).toEqual(a.cutList);
  });

  it('X-liide: A/B läbivad palgid saavad 3 sälku, vaheseina palgid 2', () => {
    const plan = rectanglePlan(4000, 5950, T, C);
    plan.nodes.push({ id: 'm1', x: J, y: 3500 }, { id: 'm2', x: 4000 - J, y: 3500 });
    plan.walls.push({ id: 'M', a: 'm1', b: 'm2' });
    const r = calculateHouse({ ...base, plan });
    const A = r.cutList.find((w) => w.wall === 'A')!;
    expect(A.pieces.filter((p) => p.kind !== 'gable').every((p) => p.notches === 3)).toBe(true);
    const M = r.cutList.find((w) => w.wall === 'M')!;
    expect(M.pieces.find((p) => p.kind === 'log')).toMatchObject({ length: 4000, notches: 2 });
  });

  it('vaheseina uks: tükid ukse kõrval saavad 1 sälgu', () => {
    const plan = rectanglePlan(4000, 6000, T, C);
    plan.nodes.push({ id: 't1', x: 2000, y: J }, { id: 't2', x: 2000, y: 6000 - J });
    plan.walls.push({ id: 'C', a: 't1', b: 't2' });
    const r = calculateHouse({ ...base, depth: 6000, plan, doors: [{ width: 900, height: 1824, count: 1, wall: 'C', offset: 2500 }] });
    const C2 = r.cutList.find((w) => w.wall === 'C')!;
    // sein C: 6000 pikk, uks 2500..3400 -> 2500 ja 2600 tükid, kumbki 1 sälk
    expect(C2.pieces.filter((p) => p.notches === 1).map((p) => p.length).sort()).toEqual([2500, 2600]);
    // tagasein 2 läbib vaheseina: 3 sälku
    expect(r.cutList.find((w) => w.wall === '2')!.pieces.find((p) => p.kind === 'half')!.notches).toBe(3);
  });
});
