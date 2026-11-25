/**
 * Põrand ja vundament plaanist (WALL-GRAPH.md, etapp 4) vs Viktra Revit (Vanad joonised/andmed/*.json):
 * Boden II – põrand ja vundament ainult toas (veranda „ainult viil“ esiseinaga jääb välja),
 * Lund – tuba + terrass eraldi, vundament seina 2 all topeltpruss.
 */
import { describe, expect, it } from 'vitest';
import { calculateHouse, insideSide, planGeometry, planTemplate, rectanglePlan, type HouseInput } from '../src/index.js';
import { BODEN, LUND } from './graph-fixtures.js';

const C = { cornerOverhang: 100 };

describe('ristküliku plaan = sama mis ilma plaanita', () => {
  const base: HouseInput = {
    roofType: 'gable', lengthScenario: 'log', width: 3800, depth: 3800, sideWallHeight: 2052, frontBackWallHeight: 1995, roofHeight: 2565,
    log: { thickness: 40, height: 114 }, floor: { boardWidth: 110 },
  };
  it.each([
    ['AB', { joistWidth: 40, joistHeight: 70 }],
    ['12', { joistWidth: 40, joistHeight: 70, ring: true, distanceFromWall12: 30, distanceFromWallAB: 50 }],
  ] as const)('suund %s', (dir, foundation) => {
    const input: HouseInput = { ...base, floorDirection: dir, foundation };
    const a = calculateHouse(input);
    const b = calculateHouse({ ...input, plan: rectanglePlan(3800, 3800, 40, C) });
    const { bays, ...fb } = b.foundation!;
    expect(fb).toEqual(a.foundation);
    expect(bays).toHaveLength(1);
    expect(b.floor).toMatchObject({ boardCount: a.floor!.boardCount, boardLength: a.floor!.boardLength });
    expect(b.floor!.totalJm).toBeCloseTo(a.floor!.totalJm, 9);
    expect(b.bom.find((l) => l.key === 'vundament')).toEqual(a.bom.find((l) => l.key === 'vundament'));
    expect(b.walls.footprintArea).toBeCloseTo(a.walls.footprintArea, 9);
  });
});

describe('Boden II: veranda jääb põrandast ja vundamendist välja', () => {
  const r = calculateHouse({
    ...BODEN.input,
    floorDirection: 'AB',
    floor: { boardWidth: 110 },
    // Revit IFB 70x40 lapiti: laius 70
    foundation: { joistWidth: 70, joistHeight: 40, ring: true },
  });

  it('põrand: Revit FB1 32 × 2617 (ainult tuba, magamislava serv „ainult viil“ ei jaga)', () => {
    expect(r.floor!.parts).toHaveLength(1);
    expect(r.floor!.boardCount).toBe(32);
    expect(Math.abs(r.floor!.boardLength - 2617)).toBeLessThanOrEqual(5);
  });

  it('vundament: Revit 6 × 3450 + ring 2 × 2690', () => {
    expect(r.foundation).toMatchObject({ joistCount: 6, joistLength: 3450, ringPieces: { count: 2, length: 2690 } });
  });
});

describe('Lund: tuba ja terrass', () => {
  const r = calculateHouse({
    ...LUND.input,
    floorDirection: '12',
    floor: { boardWidth: 110 },
    foundation: { joistWidth: 70, joistHeight: 40, ring: true },
  });

  it('põrand: tuba Revit FB 34 × 3316, terrass eraldi (lahtine osa)', () => {
    const [room, terrace] = r.floor!.parts!;
    expect(room).toMatchObject({ open: false, along: 'y', boardCount: 34 });
    expect(Math.abs(room!.boardLength - 3316)).toBeLessThanOrEqual(5);
    // põrandalauad ainult toas
    expect(r.floor!.boardCount).toBe(34);
    expect(terrace!.open).toBe(true);
  });

  it('terrassilauad: Revit TB 28x120 – 30 tk, 2310 (terrassi sisemõõt), eraldi materjal', () => {
    const terrace = r.floor!.parts!.find((p) => p.open)!;
    expect(terrace).toMatchObject({ boardWidth: 120, boardCount: 30, boardLength: 2310 });
    const line = r.bom.find((l) => l.key === 'terrassiLauad')!;
    expect(line.pieces).toEqual([{ count: 30, length: 2310 }]);
    expect(line.quantity).toBeCloseTo((30 * 2310) / 1000, 9);
    expect(r.bom.find((l) => l.key === 'porandaLauad')!.pieces).toEqual([{ count: 34, length: 3315 }]);
  });

  it('vundament: Revit 12 × 3650 (7 toas + 5 terrassil, seina 2 all topelt), ring 3388 ja 2352', () => {
    const bays = r.foundation!.bays!;
    expect(bays.map((b) => b.joistCount)).toEqual([7, 5]);
    expect(r.foundation!.joistCount).toBe(12);
    expect(bays.every((b) => b.joistLength === 3650)).toBe(true);
    expect(Math.abs(bays[0]!.ringPieces!.length - 3388)).toBeLessThanOrEqual(20);
    // terrassi ring: Revit 2352 (otsapostide tõttu lühem), mudel lõigu välismõõdu järgi
    expect(Math.abs(bays[1]!.ringPieces!.length - 2352)).toBeLessThanOrEqual(30);
    // topeltpruss seina 2 all: toa viimane ja terrassi esimene pruss kõrvuti
    const roomLast = bays[0]!.joists.at(-1)!;
    const terrFirst = bays[1]!.joists[0]!;
    expect(terrFirst.y0 - roomLast.y1).toBeCloseTo(0, 6);
  });

  it('pindala ja ruumala sama mis ristkülikul (terrass on katuse all)', () => {
    expect(r.walls.footprintArea).toBeCloseTo((3800 * 5750) / 1e6, 9);
  });
});

describe('L-maja', () => {
  const base: HouseInput = {
    roofType: 'gable', lengthScenario: 'log', width: 6000, depth: 8000, sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 3200,
    log: { thickness: 40, height: 114 }, floorDirection: 'AB', floor: { boardWidth: 110 }, foundation: { joistWidth: 40, joistHeight: 70 },
  };
  const plan = planTemplate('lshape', 6000, 8000, 40, C);
  const r = calculateHouse({ ...base, plan });
  const rect = calculateHouse(base);

  it('pindala: L-kuju (puuduv nurk maha), 6 tuuleliistu', () => {
    // välispinnad: 5800 × 7800 miinus puuduv nurk 2880 × 3880 (sisenurga välispind 20 kesktelgedest väljas)
    expect(r.walls.footprintArea).toBeCloseTo((5800 * 7800 - 2880 * 3880) / 1e6, 6);
    expect(r.bom.find((l) => l.key === 'tuuleLiist')!.pieces![0]!.count).toBe(6);
  });

  it('põrand: üks ruum kahes ristkülikus, laudu vähem kui ümbritseval ristkülikul', () => {
    expect(r.floor!.parts!.length).toBe(2);
    expect(new Set(r.floor!.parts!.map((p) => p.room))).toEqual(new Set([0]));
    expect(r.floor!.totalJm).toBeLessThan(rect.floor!.totalJm * 0.8);
  });

  it('vundament: kaks lõiku (põhiosa täispikk, tiib lühem)', () => {
    const bays = r.foundation!.bays!;
    expect(bays.length).toBe(2);
    expect(bays[0]!.joistLength).toBeGreaterThan(bays[1]!.joistLength);
  });
});

describe('ava lahtises osas (terrassi sissepääs) – hoiatus', () => {
  const base: HouseInput = {
    roofType: 'gable', lengthScenario: 'log', width: 4000, depth: 5950, sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 2678,
    log: { thickness: 40, height: 114 }, plan: planTemplate('terrace', 4000, 5950, 40, C),
  };
  it('uks terrassi raamil (sein 1) -> hoiatus; toa esiseinal (sein 2) -> ei', () => {
    const on1 = calculateHouse({ ...base, doors: [{ width: 1440, height: 1995, count: 1, wall: '1' }] });
    expect(on1.warnings.some((w) => w.code === 'opening.inOpen')).toBe(true);
    const on2 = calculateHouse({ ...base, doors: [{ width: 1440, height: 1995, count: 1, wall: '2' }] });
    expect(on2.warnings.some((w) => w.code === 'opening.inOpen')).toBe(false);
  });
});

describe('uks: tiivad ja avanemise pool', () => {
  const plan = planTemplate('terrace', 4000, 5950, 40, C);
  const base: HouseInput = {
    roofType: 'gable', lengthScenario: 'log', width: 4000, depth: 5950, sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 2678,
    log: { thickness: 40, height: 114 }, plan,
  };
  it('laius >= 1200 -> topelt, muidu ühepoolne; antud väärtus jääb', () => {
    const r = calculateHouse({
      ...base,
      doors: [
        { width: 1440, height: 1995, count: 1, wall: '2' },
        { width: 900, height: 1995, count: 1, wall: '3' },
        { width: 1440, height: 1995, count: 1, wall: 'A', leaves: 1, swing: 'out', hinge: 'end' },
      ],
    });
    expect(r.placedOpenings.map((o) => [o.leaves, o.swing, o.hinge])).toEqual([
      [2, 'in', 'start'],
      [1, 'in', 'start'],
      [1, 'out', 'end'],
    ]);
  });
  it('sisemine pool: toa esisein (2) ja tagasein (3) -> tuppa, terrassi raam (1) -> terrassile', () => {
    const geo = planGeometry(plan, 40, C);
    const side = insideSide(plan, geo);
    const y = (id: string) => geo.find((g) => g.id === id)!.a.y;
    const mid = (id: string) => geo.find((g) => g.id === id)!.length / 2;
    // tuba on seinte 3 (taga) ja 2 vahel, terrass 2 ja 1 vahel
    expect(y('3')).toBeLessThan(y('2'));
    expect(side('2', mid('2'))).toBe(-1);
    expect(side('3', mid('3'))).toBe(1);
    expect(side('1', mid('1'))).toBe(-1);
  });
});

describe('Kolding vundament (Revit Foundation)', () => {
  it('IFB 70x40, ääreprussidega, vahe ≤ 620: 11 × 3450 (toas 7, terrassil 4)', async () => {
    const { KOLDING } = await import('./graph-fixtures.js');
    const r = calculateHouse({ ...KOLDING.input, floorDirection: '12', foundation: { joistWidth: 70, joistHeight: 40, ring: true, maxSpacing: 620 } });
    const bays = r.foundation!.bays!;
    expect(bays.map((b) => b.joistCount)).toEqual([7, 4]);
    expect(r.foundation!.joistCount).toBe(11);
    expect(r.foundation!.joistLength).toBe(3450);
    // toas kesktelgede vahe Revit 517 + 70 = 587
    expect(Math.abs(bays[0]!.spacing - 587)).toBeLessThanOrEqual(5);
  });
});
