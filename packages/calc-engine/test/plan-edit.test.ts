/** Plaanieditori toimingud ja mallid (WALL-GRAPH.md, etapp 3). */
import { describe, expect, it } from 'vitest';
import {
  addWall,
  calculateHouse,
  deleteWall,
  moveWall,
  nextWallId,
  PLAN_TEMPLATES,
  planGeometry,
  planTemplate,
  rectanglePlan,
  reverseWall,
  setWallSpan,
  updateWall,
  wallSpan,
  type HouseInput,
} from '../src/index.js';

const C = { cornerOverhang: 100 };
const T = 40;
const J = 120;
const len = (plan: ReturnType<typeof rectanglePlan>, id: string) => planGeometry(plan, T, C).find((g) => g.id === id)!.length;

describe('plaani toimingud', () => {
  const rect = rectanglePlan(4000, 6000, T, C);

  it('seina B nihutamine muudab seinte 1 ja 2 pikkust', () => {
    const p = moveWall(rect, 'B', 500);
    expect(len(p, '1')).toBe(4500);
    expect(len(p, '2')).toBe(4500);
    expect(len(p, 'A')).toBe(6000);
  });

  it('seina pikkuse muutmine liigutab b-otsa ristuvat seina', () => {
    const p = setWallSpan(rect, '1', 3000);
    expect(wallSpan(p, '1')).toBe(3000);
    expect(len(p, '2')).toBe(3000 + 2 * J);
  });

  it('vaba otsaga seina pikkuse muutmine liigutab ainult otsa', () => {
    const { plan, id } = addWall(rect, { x: 2000, y: J }, { x: 2000, y: 3000 });
    expect(id).toBe('C');
    const p = setWallSpan(plan, id, 4000);
    expect(wallSpan(p, id)).toBe(4000);
    expect(len(p, '1')).toBe(4000);
  });

  it('seina lisamine kasutab olemasolevaid sõlmi ja annab tähise', () => {
    const { plan, id } = addWall(rect, { x: J, y: 3000 }, { x: 4000 - J, y: 3010 });
    expect(id).toBe('3');
    expect(planGeometry(plan, T, C).find((g) => g.id === '3')!.dir).toBe('x');
    // täisnurk: lõpu y = alguse y
    const w = plan.walls.find((x) => x.id === '3')!;
    const b = plan.nodes.find((n) => n.id === w.b)!;
    expect(b.y).toBe(3000);
    expect(() => addWall(plan, { x: J, y: 3000 }, { x: 4000 - J, y: 3000 })).toThrow(/juba olemas/);
  });

  it('vahesein liigub koos T-liite sõlmedega', () => {
    const { plan } = addWall(rect, { x: J, y: 3000 }, { x: 4000 - J, y: 3000 });
    const p = moveWall(plan, '3', -500);
    const g = planGeometry(p, T, C).find((x) => x.id === 'A')!;
    expect(g.joints.map((k) => [k.wall, Math.round(k.x)])).toContainEqual(['3', 2500]);
  });

  it('kustutamine eemaldab üleliigsed sõlmed', () => {
    const { plan } = addWall(rect, { x: 2000, y: J }, { x: 2000, y: 3000 });
    const p = deleteWall(plan, 'C');
    // mõlemad C sõlmed (T-sõlm seinal 2 ja vaba ots) kasutas ainult C
    expect(p.nodes.length).toBe(rect.nodes.length);
    expect(p.walls.length).toBe(4);
  });

  it('ümbernimetamine, tüüp ja suuna pööramine', () => {
    expect(() => updateWall(rect, 'A', { id: 'B' })).toThrow(/kasutusel/);
    const p = updateWall(rect, 'A', { id: 'X', topOnly: 2 });
    expect(p.walls.find((w) => w.id === 'X')).toMatchObject({ topOnly: 2 });
    const q = updateWall(p, 'X', { topOnly: undefined });
    expect('topOnly' in q.walls.find((w) => w.id === 'X')!).toBe(false);
    const r = reverseWall(rect, '1');
    expect(r.walls.find((w) => w.id === '1')).toMatchObject({ a: 'n3', b: 'n4' });
  });

  it('järgmine tähis: x-seinal number, y-seinal täht', () => {
    expect(nextWallId(rect, 'x')).toBe('3');
    expect(nextWallId(rect, 'y')).toBe('C');
  });
});

describe('mallid', () => {
  const base: HouseInput = {
    roofType: 'gable', lengthScenario: 'log', width: 4000, depth: 5950,
    sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 2678, log: { thickness: T, height: 114 },
  };

  it.each(PLAN_TEMPLATES.map((t) => t.kind))('%s: kehtiv plaan, lõikenimekiri ilma veata', (kind) => {
    const plan = planTemplate(kind, 4000, 5950, T, C);
    const r = calculateHouse({ ...base, plan });
    expect(r.cutList.length).toBe(plan.walls.length);
    expect(r.cutList.every((w) => w.totalJm > 0)).toBe(true);
  });

  it('terrass annab Lundiga sama seina 1 ja A/B ehituse', () => {
    const r = calculateHouse({ ...base, plan: planTemplate('terrace', 4000, 5950, T, C) });
    const A = r.cutList.find((w) => w.wall === 'A')!;
    // ruumi palgid 3600, piirde ja postid 300, läbivad 5950
    expect(A.pieces.map((p) => p.length).sort((a, b) => a - b)).toEqual([300, 300, 3600, 5950]);
  });
});
