/**
 * Päris majad, mille materjalikulu on teada.
 * Allikas: Dropbox/kalkull/Abimaterjal/
 *  - "Lamekatus Testitud Nende majade peal.xlsx" (Revit-eelarved ja v2 ekraanipildid)
 *  - "<maja>/Andmed jooniselt.txt" (sisendid jooniselt)
 */
import { describe, expect, it } from 'vitest';
import { calculateHouse, type HouseInput } from '../src/index.js';

describe('Placas I 40 – võrdlus Revit-eelarvega (leht "Placas 1 tulemused")', () => {
  // Placas 1/Andmed jooniselt.txt
  const placas: HouseInput = {
    roofType: 'gable',
    lengthScenario: 'log',
    width: 4500,
    depth: 3000,
    sideWallHeight: 2052,
    frontBackWallHeight: 1995,
    roofHeight: 2565,
    log: { thickness: 40, height: 114 },
    doors: [{ width: 1440, height: 1995, count: 1 }],
    windows: [{ width: 520, height: 1938, count: 2 }],
    longBoards: [
      { length: 3900, height: 114, count: 2 },
      { length: 3500, height: 114, count: 2 },
      { length: 3200, height: 114, count: 2 },
    ],
  };
  const r = calculateHouse(placas);

  it('külgseinad: Revit 40x114 = 111,20 m (36 tk)', () => {
    expect(r.walls.breakdown.sides).toBeCloseTo(111.2, 2);
  });

  it('viilud: Revit 27,74 m (10 tk)', () => {
    expect(r.walls.gableCourses).toHaveLength(5); // 5 tk viilu kohta x 2 = 10
    expect(Math.abs(r.walls.gableJm - 27.74)).toBeLessThan(0.05);
  });

  it('esi/tagaseinad koos avadega: Revit 40x114 110,84 + 40x57 7,56 = 118,40 m', () => {
    const fbNet = r.walls.breakdown.frontBack! - r.openings.doorsJm - r.openings.windowsJm;
    expect(fbNet).toBeCloseTo(118.4, 2);
    // pool palki (40x57): 2 x 4,5 m miinus ukse laius 1,44 m
    expect(r.walls.breakdown.frontBackPartial! - 1.44).toBeCloseTo(7.56, 2);
  });

  it('terve maja: Revit 257,34 m', () => {
    expect(Math.abs(r.walls.netJm - 257.34)).toBeLessThan(0.05);
  });
});

describe('Bente IV 28 – võrdlus v2 tulemusega (leht "Bente IV 190306")', () => {
  const bente: HouseInput = {
    roofType: 'gable',
    lengthScenario: 'log',
    width: 2950,
    depth: 3800,
    sideWallHeight: 1824,
    frontBackWallHeight: 1767,
    roofHeight: 2223,
    log: { thickness: 28, height: 114 },
    longBoards: [{ length: 4000, height: 115, count: 2 }],
    doors: [{ width: 1440, height: 1824, count: 1 }],
    floorDirection: '12',
    foundation: { joistWidth: 40, joistHeight: 70 },
    roof: {},
    purlins: { count: 1 },
  };
  const r = calculateHouse(bente);

  it('seinamaterjal ilma avadeta 239,14 jm, avadega 216,10 jm', () => {
    expect(r.walls.totalJm).toBeCloseTo(239.14, 2);
    expect(r.walls.netJm).toBeCloseTo(216.1, 2);
  });

  it('uks: 23,04 jm', () => {
    expect(r.openings.doorsJm).toBeCloseTo(23.04, 9);
  });

  it('vundament: 9 tk (2750 mm), vahe 445 mm, 24,75 jm', () => {
    const f = r.foundation!;
    expect(f.joistCount).toBe(9);
    expect(f.joistLength).toBe(2750);
    expect(f.spacing).toBeCloseTo(445, 9);
    expect(f.totalJm).toBeCloseTo(24.75, 9);
  });

  it('katuselaudu 74 tk, nurk ~16°', () => {
    expect(r.roof!.boardCount).toBe(74);
    expect(Math.round(r.roof!.angle)).toBeGreaterThanOrEqual(16);
    expect(Math.round(r.roof!.angle)).toBeLessThanOrEqual(17);
  });

  it('pärlinid: 2 + tipupärlin, vahe 702,4 mm, 12,0 jm', () => {
    const p = r.purlins!;
    expect(p.pieces).toBe(3);
    expect(p.spacing!).toBeCloseTo(702.4, 1);
    expect(p.totalJm).toBeCloseTo(12, 9);
  });

  it('vaikimisi pindala 9,9 m2', () => {
    expect(r.walls.footprintArea).toBeCloseTo(9.9, 2);
  });
});

describe('Brantevik II 40 – jooniselt (Brantevik II/andmed jooniselt.txt)', () => {
  const b: HouseInput = {
    roofType: 'gable',
    lengthScenario: 'log',
    width: 3800,
    depth: 3800,
    sideWallHeight: 2058,
    frontBackWallHeight: 1995,
    roofHeight: 2565,
    log: { thickness: 40, height: 114 },
    floor: { boardWidth: 95, distanceFromWall: 5 },
    foundation: { joistWidth: 40, joistHeight: 70 },
  };
  const r = calculateHouse(b);

  it('põrandalaua pikkus 3515 mm (5 mm seinast)', () => {
    expect(r.floor!.boardLength).toBe(3515);
  });

  it('vundamendi prussi pikkus 3600 mm (seinast seinani)', () => {
    expect(r.foundation!.joistLength).toBe(3600);
  });

  it('vundament: vaikimisi max vahe 500 -> 9 prussi; joonise 7 prussi saab max vahega 600', () => {
    expect(r.foundation!.joistCount).toBe(9);
    const r600 = calculateHouse({ ...b, foundation: { ...b.foundation!, maxSpacing: 600 } });
    expect(r600.foundation!.joistCount).toBe(7);
    expect(r600.foundation!.spacing).toBeCloseTo(3560 / 6, 9);
  });
});
