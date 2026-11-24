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
  it('AB: automaatne prusside arv, vahe < 600; pruss 5 mm otstest lühem', () => {
    const f = calculateHouse({ ...gable, foundation: { joistWidth: 100, joistHeight: 150 } }).foundation!;
    // ala: 3000-200-100 = 2700 -> 6 prussi, vahe 540
    expect(f.joistCount).toBe(6);
    expect(f.spacing).toBeCloseTo(540, 9);
    expect(f.joistLength).toBe(3790);
    expect(f.totalJm).toBeCloseTo(6 * 3.79, 9);
  });

  it('max vahe käsitsi (vana v2 väärtus 500 -> 7 prussi)', () => {
    const f = calculateHouse({ ...gable, foundation: { joistWidth: 100, joistHeight: 150, maxSpacing: 500 } }).foundation!;
    expect(f.joistCount).toBe(7);
    expect(f.spacing).toBeCloseTo(450, 9);
  });

  it('AB + ring: prussid lühemad 2 x prussi laiuse võrra + 2 ristprussi', () => {
    const f = calculateHouse({ ...gable, foundation: { joistWidth: 100, joistHeight: 150, ring: true } }).foundation!;
    expect(f.joistLength).toBe(3590);
    expect(f.ringPieces).toEqual({ count: 2, length: 2790 });
    expect(f.totalJm).toBeCloseTo(6 * 3.59 + 2 * 2.79, 9);
  });

  it('suund 12', () => {
    const f = calculateHouse({ ...gable, floorDirection: '12', foundation: { joistWidth: 100, joistHeight: 150 } }).foundation!;
    expect(f.joistCount).toBe(8); // 3700/7 = 528,6
    expect(f.spacing).toBeCloseTo(3700 / 7, 9);
    expect(f.joistLength).toBe(2790);
  });

  it('käsitsi prusside arv', () => {
    const f = calculateHouse({ ...gable, foundation: { joistWidth: 100, joistHeight: 150, count: 5 } }).foundation!;
    expect(f.joistCount).toBe(5);
    expect(f.spacing).toBeCloseTo(675, 9);
  });
});

describe('põrand', () => {
  it('AB: laudade arv (20 mm vahe seinast kummalgi pool) ja pikkus', () => {
    const fl = calculateHouse({ ...gable, floor: { boardWidth: 95 } }).floor!;
    expect(fl.boardCount).toBe(39); // ceil((3712-40)/95)
    expect(fl.boardLength).toBe(2707); // 3000-200-88-5
    expect(fl.totalJm).toBeCloseTo(39 * 2.707, 9);
  });
});

describe('katus', () => {
  it('viilkatus, arvutatud laua pikkus vaikimisi üleulatusega 200', () => {
    const r = calculateHouse({ ...gable, roof: {} }).roof!;
    const base = 2712 + 2 * (200 + 44);
    const h = (base * 1000) / 2712;
    expect(r.boardLengthIsComputed).toBe(true);
    // sentimeetri täpsus, ümardatud üles -> tegelik üleulatus >= 200 (K14)
    expect(r.boardLength).toBe(Math.ceil(Math.hypot(base / 2, h) / 10) * 10);
    expect(r.boardLength % 10).toBe(0);
    expect(r.computedOverhang!).toBeGreaterThanOrEqual(200);
    expect(r.computedOverhang!).toBeLessThan(210);
    expect(r.angle).toBeCloseTo((Math.atan(1000 / 1356) * 180) / Math.PI, 9);
    expect(r.boardCount).toBe(2 * Math.floor(4000 / 110)); // 72
    expect(r.boardsJm).toBeCloseTo((r.boardCount * r.boardLength) / 1000, 9);
    expect(r.edgeBoards.fascia.count).toBe(4);
    expect(r.edgeBoards.fascia.pieceLength % 10).toBe(0);
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

  it('ühekalle: 2 räästalauda, laudu alla(L/110)', () => {
    const r = calculateHouse({ ...mono, roof: {} }).roof!;
    expect(r.edgeBoards.fascia.count).toBe(2);
    expect(r.roofLength).toBe(3700);
    expect(r.boardCount).toBe(Math.floor(3700 / 110)); // 33
  });

  it('pikemad lauad määravad katuse pikkuse', () => {
    const r = calculateHouse({ ...gable, longBoards: [{ length: 4600, height: 145, count: 2 }], roof: {} }).roof!;
    expect(r.roofLength).toBe(4600);
  });
});

describe('pärlinid', () => {
  const run = 1356; // horisontaalne ulatus (sisemine laius / 2)

  it('viilkatus automaatselt: horisontaalne vahe < 900, 1 poole kohta + tipupärlin', () => {
    const p = calculateHouse({ ...gable, purlins: {} }).purlins!;
    expect(p.perSide).toBe(1);
    expect(p.spacing).toBeCloseTo(run / 2, 9);
    expect(p.pieces).toBe(3);
    expect(p.totalJm).toBeCloseTo(12, 9);
  });

  it('ainult tipupärlin', () => {
    const p = calculateHouse({ ...gable, purlins: { ridgeOnly: true } }).purlins!;
    expect(p.pieces).toBe(1);
    expect(p.totalJm).toBeCloseTo(4, 9);
  });

  it('käsitsi arv', () => {
    const p = calculateHouse({ ...gable, purlins: { count: 3 } }).purlins!;
    expect(p.pieces).toBe(7);
    expect(p.spacing).toBeCloseTo(run / 4, 9);
  });

  it('ühekalle: tipupärlinit pole, pikkus = laius (K4)', () => {
    const p = calculateHouse({ ...mono, purlins: {} }).purlins!;
    expect(p.hasRidge).toBe(false);
    expect(p.pieces).toBe(p.perSide);
    expect(p.spacing!).toBeLessThan(900);
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

describe('uksed ja aknad materjalide nimekirjas (K7)', () => {
  it('tükiread, kataloogi nimi ja hind tk kohta', () => {
    const r = calculateHouse({
      ...gable,
      doors: [{ width: 1440, height: 1824, count: 1, name: 'Topeltuks D2', unitPrice: 450 }],
      windows: [{ width: 765, height: 990, count: 2 }],
    });
    const door = r.bom.find((l) => l.key === 'door:0')!;
    expect(door).toMatchObject({ label: 'Uks Topeltuks D2', quantity: 1, unit: 'tk', unitPrice: 450, total: 450 });
    const win = r.bom.find((l) => l.key === 'window:0')!;
    expect(win).toMatchObject({ label: 'Aken 765 × 990', quantity: 2, unit: 'tk' });
    expect(win.total).toBeUndefined();
    expect(r.totalPrice).toBe(450);
  });
});

describe('katuse ridade järjekord (K9)', () => {
  it('toelauad enne esiräästa- ja papikinnituslauda', () => {
    const keys = calculateHouse({ ...gable, roof: {} }).bom.map((l) => l.key);
    expect(keys.indexOf('toelaud38')).toBeLessThan(keys.indexOf('esiraastalaud'));
    expect(keys.indexOf('toelaud95')).toBeLessThan(keys.indexOf('papikinnituslaud'));
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
