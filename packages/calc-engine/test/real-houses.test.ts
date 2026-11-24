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

  it('vaikimisi pindala 9,9 m2', () => {
    expect(r.walls.footprintArea).toBeCloseTo(9.9, 2);
  });
});

describe('Annika I 28 (ühekalle) – võrdlus Revit lõikenimekirjaga (Vanad joonised/Annika_I_28_270x180_4000002_S_220208.pdf)', () => {
  // Sein 1 (esi, uksega): 1BL 28x57 2×730, 1LG 28x114 34×730, 1TL 28x114 1×3100
  // Sein 2 (taga):        2BL 28x57 1×2900, 2LG 15×2900, 2TL 1×3100
  // Sein A ja B:          LG-4 16×2000, LG-3 2000, LG-2 1429, LG-1 543 (kolmnurk)
  const annika: HouseInput = {
    roofType: 'mono',
    lengthScenario: 'log',
    width: 2900,
    depth: 2000,
    sideWallHeight: 0,
    frontBackWallHeight: 2109, // 18,5 rida
    roofHeight: 1881, // 16,5 rida
    log: { thickness: 28, height: 114 },
    longBoards: [{ length: 3100, height: 114, count: 2 }], // TL ülemised palgid
    doors: [{ width: 1440, height: 1995, count: 1 }], // ava: ½ + 17 rida
  };
  const r = calculateHouse(annika);

  it('sein 1 (esisein uksega): Revit 1,46 + 24,82 + 3,10 = 29,38 m', () => {
    expect(r.walls.breakdown.front! - r.openings.doorsJm).toBeCloseTo(29.38, 2);
  });

  it('sein 2 (tagasein): Revit 2,90 + 43,50 + 3,10 = 49,50 m', () => {
    expect(r.walls.breakdown.back).toBeCloseTo(49.5, 2);
  });

  it('seinad A+B: Revit 2 × 16 × 2000 = 64,00 m', () => {
    expect(r.walls.breakdown.sides).toBeCloseTo(64, 9);
  });

  it('kolmnurga palgid täpselt nagu Revitis: 2000, 1429, 543 (K6)', () => {
    expect(r.walls.gableCourses.map((c) => Math.round(c.length))).toEqual([2000, 1429, 543]);
  });

  it('kokku: Revit 150,82 m (ka testimärkmetes "Seinalauad õiged – 150,82")', () => {
    expect(r.walls.netJm).toBeCloseTo(150.82, 2);
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

  it('vundamendi prussi pikkus 3590 mm (Revit: 5 mm vahe otstes; joonise märkus "3600 seinast seinani")', () => {
    expect(r.foundation!.joistLength).toBe(3590);
  });

  it('vundament: vaikimisi max vahe 600 -> 7 prussi nagu joonisel; vana 500 -> 9', () => {
    expect(r.foundation!.joistCount).toBe(7);
    expect(r.foundation!.spacing).toBeCloseTo(3560 / 6, 9);
    const r500 = calculateHouse({ ...b, foundation: { ...b.foundation!, maxSpacing: 500 } });
    expect(r500.foundation!.joistCount).toBe(9);
  });
});
