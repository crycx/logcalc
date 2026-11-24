import { describe, expect, it } from 'vitest';
import { CalcInputError, calculateHouse, type HouseInput } from '../src/index.js';

const gable: HouseInput = {
  roofType: 'gable',
  lengthScenario: 'log',
  width: 3000,
  depth: 4000,
  sideWallHeight: 2000,
  frontBackWallHeight: 2070,
  roofHeight: 3000,
  log: { thickness: 44, height: 145 },
};

const mono: HouseInput = {
  roofType: 'mono',
  lengthScenario: 'outer',
  width: 3500,
  depth: 2800,
  sideWallHeight: 0,
  frontBackWallHeight: 2400,
  roofHeight: 2000,
  log: { thickness: 44, height: 145 },
};

describe('vundament', () => {
  it('AB: automaatne prusside arv, vahe < 500', () => {
    const f = calculateHouse({ ...gable, foundation: { joistWidth: 100, joistHeight: 150 } }).foundation!;
    // ala: 3000-200-100 = 2700 -> 7 prussi, vahe 450
    expect(f.joistCount).toBe(7);
    expect(f.spacing).toBeCloseTo(450, 9);
    expect(f.joistLength).toBe(3800);
    expect(f.totalJm).toBeCloseTo(26.6, 9);
  });

  it('AB + ring: prussid lühemad 2 x prussi laiuse võrra + 2 ristprussi', () => {
    const f = calculateHouse({ ...gable, foundation: { joistWidth: 100, joistHeight: 150, ring: true } }).foundation!;
    expect(f.joistLength).toBe(3600);
    expect(f.ringPieces).toEqual({ count: 2, length: 2800 });
    expect(f.totalJm).toBeCloseTo(7 * 3.6 + 5.6, 9);
  });

  it('suund 12', () => {
    const f = calculateHouse({ ...gable, floorDirection: '12', foundation: { joistWidth: 100, joistHeight: 150 } }).foundation!;
    expect(f.joistCount).toBe(9); // 3700/8 = 462,5
    expect(f.spacing).toBeCloseTo(462.5, 9);
    expect(f.joistLength).toBe(2800);
  });

  it('käsitsi prusside arv', () => {
    const f = calculateHouse({ ...gable, foundation: { joistWidth: 100, joistHeight: 150, count: 5 } }).foundation!;
    expect(f.joistCount).toBe(5);
    expect(f.spacing).toBeCloseTo(675, 9);
  });
});

describe('põrand', () => {
  it('AB: laudade arv ja pikkus', () => {
    const fl = calculateHouse({ ...gable, floor: { boardWidth: 95 } }).floor!;
    expect(fl.boardCount).toBe(41); // ceil(3712/95)+1
    expect(fl.boardLength).toBe(2707); // 3000-200-88-5
    expect(fl.totalJm).toBeCloseTo(41 * 2.707, 9);
  });
});

describe('katus', () => {
  it('viilkatus, arvutatud laua pikkus vaikimisi üleulatusega 200', () => {
    const r = calculateHouse({ ...gable, roof: {} }).roof!;
    const base = 2712 + 2 * (200 + 44);
    const h = (base * 1000) / 2712;
    expect(r.boardLengthIsComputed).toBe(true);
    expect(r.boardLength).toBeCloseTo(Math.hypot(base / 2, h), 9);
    expect(r.angle).toBeCloseTo((Math.atan(1000 / 1356) * 180) / Math.PI, 9);
    expect(r.boardCount).toBe(2 + 2 * Math.round(4000 / 110));
    expect(r.boardsJm).toBeCloseTo((r.boardCount * r.boardLength) / 1000, 9);
    expect(r.edgeBoards.fascia.count).toBe(4);
    expect(r.edgeBoards.fascia.pieceLength % 5).toBe(0);
    expect(r.edgeBoards.supportSmall.totalJm).toBeCloseTo(8, 9);
  });

  it('antud laua pikkusest arvutatakse üleulatus', () => {
    const r = calculateHouse({ ...gable, roof: { boardLength: 2000 } }).roof!;
    expect(r.boardLength).toBe(2000);
    expect(r.computedOverhang).toBeCloseTo((2000 * 2712) / Math.hypot(1356, 1000) / 2 - 1400, 9);
  });

  it('nurk ei sõltu sellest, kas laua pikkus anti (v2-s sõltus)', () => {
    const a = calculateHouse({ ...gable, roof: {} }).roof!.angle;
    const b = calculateHouse({ ...gable, roof: { boardLength: 2000 } }).roof!.angle;
    expect(a).toBeCloseTo(b, 12);
  });

  it('ühekalle: 2 räästalauda, laudade arv pool viilkatuse omast', () => {
    const r = calculateHouse({ ...mono, roof: {} }).roof!;
    expect(r.edgeBoards.fascia.count).toBe(2);
    expect(r.roofLength).toBe(3700);
    expect(r.boardCount).toBe(2 + 2 * Math.round(3700 / 220));
  });

  it('pikemad lauad määravad katuse pikkuse', () => {
    const r = calculateHouse({ ...gable, longBoards: [{ length: 4600, height: 145, count: 2 }], roof: {} }).roof!;
    expect(r.roofLength).toBe(4600);
  });
});

describe('pärlinid', () => {
  const hyp = Math.hypot(1356, 1000);

  it('viilkatus automaatselt: vahe < 700, 2 poolt + tipupärlin', () => {
    const p = calculateHouse({ ...gable, purlins: {} }).purlins!;
    expect(p.perSide).toBe(2);
    expect(p.spacing).toBeCloseTo(hyp / 3, 9);
    expect(p.pieces).toBe(5);
    expect(p.totalJm).toBeCloseTo(20, 9);
  });

  it('ainult tipupärlin', () => {
    const p = calculateHouse({ ...gable, purlins: { ridgeOnly: true } }).purlins!;
    expect(p.pieces).toBe(1);
    expect(p.totalJm).toBeCloseTo(4, 9);
  });

  it('käsitsi arv', () => {
    const p = calculateHouse({ ...gable, purlins: { count: 3 } }).purlins!;
    expect(p.pieces).toBe(7);
    expect(p.spacing).toBeCloseTo(hyp / 4, 9);
  });

  it('ühekalle: tipupärlinit pole, pikkus = laius (K4)', () => {
    const p = calculateHouse({ ...mono, purlins: {} }).purlins!;
    expect(p.hasRidge).toBe(false);
    expect(p.pieces).toBe(p.perSide);
    expect(p.spacing!).toBeLessThan(700);
    expect(p.length).toBe(3700);
  });
});

describe('hinnad ja BOM', () => {
  it('summeerib read hinnakirja järgi', () => {
    const r = calculateHouse(
      { ...gable, foundation: { joistWidth: 100, joistHeight: 150 }, floor: { boardWidth: 95 }, roof: {}, purlins: {} },
      { prices: { seinaLauad: 1.33, vundament: 0.97, porandaLauad: 0.69, katuseLauad: 0.69, parlinid: 1.85 } },
    );
    const keys = r.bom.map((l) => l.key);
    expect(keys).toContain('seinaLauad');
    expect(keys).toContain('vundament');
    const wall = r.bom.find((l) => l.key === 'seinaLauad')!;
    expect(wall.total).toBeCloseTo(r.walls.netJm * 1.33, 9);
    const expected = r.bom.reduce((s, l) => s + (l.total ?? 0), 0);
    expect(r.totalPrice).toBeCloseTo(expected, 9);
  });

  it('ilma hinnata read on BOM-is, aga summa 0', () => {
    const r = calculateHouse({ ...gable, roof: {} });
    expect(r.bom.length).toBeGreaterThan(0);
    expect(r.totalPrice).toBe(0);
  });
});

describe('valideerimine', () => {
  it('viskab vea, kui palgi kõrgus puudub', () => {
    expect(() => calculateHouse({ ...gable, log: { thickness: 44, height: 0 } })).toThrow(CalcInputError);
  });

  it('hoiatab, kui hari pole küljeseinast kõrgem', () => {
    const r = calculateHouse({ ...gable, roofHeight: 1900 });
    expect(r.warnings.map((w) => w.code)).toContain('roof.noGable');
  });
});
