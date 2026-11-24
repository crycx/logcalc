import { describe, expect, it } from 'vitest';
import { calculateHouse, type HouseInput } from '../src/index.js';
import { fixedPartial, legacyPartial, legacyWalls, type LegacyInput } from './legacy-v2.js';

/** Teisendab uue sisendi vana v2 sisendiks (ainult 'log' ja 'outer' stsenaarium on identsed). */
function toLegacy(h: HouseInput): LegacyInput {
  return {
    viilKatus: h.roofType === 'gable',
    misPikkus: h.lengthScenario === 'inner' ? 'sise' : h.lengthScenario === 'outer' ? 'valis' : 'palk',
    cab_width: h.width,
    cab_depth: h.depth,
    heightSide: h.sideWallHeight,
    heightFb: h.frontBackWallHeight,
    roofHeight: h.roofHeight,
    palgiPaksus: h.log.thickness,
    palgiKorgus: h.log.height,
    pikemadLauad: h.longBoards?.map((b) => ({ pikkus: b.length, korgus: b.height, kogus: b.count })),
    uksed: h.doors?.map((d) => ({ ukselaius: d.width, uksekorgus: d.height, kogus: d.count })),
    aknad: h.windows?.map((w) => ({ laius: w.width, korgus: w.height, kogus: w.count })),
  };
}

const gableBase: HouseInput = {
  roofType: 'gable',
  lengthScenario: 'log',
  width: 3000,
  depth: 4000,
  sideWallHeight: 2000,
  frontBackWallHeight: 2070,
  roofHeight: 3000,
  log: { thickness: 44, height: 145 },
};

const monoBase: HouseInput = {
  roofType: 'mono',
  lengthScenario: 'outer',
  width: 3500,
  depth: 2800,
  sideWallHeight: 0,
  frontBackWallHeight: 2400,
  roofHeight: 2000,
  log: { thickness: 44, height: 145 },
};

/** Juhtumid: erinevad kõrgused, sh täpne jagumine (v2 andis lõpmatuse). */
const cases: [string, HouseInput][] = [
  ['viil, tavaline', gableBase],
  ['viil, esisein jagub täpselt (2030/145=14)', { ...gableBase, frontBackWallHeight: 2030 }],
  ['viil, küljesein jagub täpselt', { ...gableBase, sideWallHeight: 2030 }],
  [
    'viil, pikemad lauad + uksed + aknad',
    {
      ...gableBase,
      lengthScenario: 'outer',
      longBoards: [
        { length: 4600, height: 145, count: 2 },
        { length: 4600, height: 90, count: 2 },
      ],
      doors: [{ width: 900, height: 1900, count: 1 }],
      windows: [{ width: 600, height: 800, count: 2 }],
    },
  ],
  ['ühekalle, tavaline', monoBase],
  ['ühekalle, tagasein jagub täpselt (2030)', { ...monoBase, roofHeight: 2030 }],
  [
    'ühekalle, madalad pikemad lauad',
    { ...monoBase, longBoards: [{ length: 4100, height: 100, count: 2 }], doors: [{ width: 800, height: 1800, count: 1 }] },
  ],
];

describe('seinad: võrdlus vana v2 valemiga', () => {
  it.each(cases)('%s – ühtib v2-ga, kui osalise rea viga (D1) on parandatud', (_name, input) => {
    const legacy = legacyWalls(toLegacy(input), fixedPartial);
    const r = calculateHouse(input);
    expect(r.dimensions.width).toBe(legacy.width);
    expect(r.dimensions.depth).toBe(legacy.depth);
    expect(r.walls.totalJm).toBeCloseTo(legacy.jooksevMeeter, 9);
    expect(r.walls.netJm).toBeCloseTo(legacy.jooksevMeeterUksedAknad, 9);
    expect(r.walls.gableJm).toBeCloseTo(legacy.gableJooksevMeeter, 9);
    expect(r.walls.windStripsJm).toBeCloseTo(legacy.tuuleliistud, 9);
    expect(r.walls.gableCourses.map((c) => c.length)).toEqual(legacy.pikkused.map((x) => expect.closeTo(x, 9)));
  });
});

describe('D1: osalise rea viga v2-s', () => {
  it('v2 andis täpse jagumise korral lõpmatuse, uus mootor lõpliku tulemuse', () => {
    const input = { ...gableBase, frontBackWallHeight: 2030 };
    expect(legacyWalls(toLegacy(input), legacyPartial).jooksevMeeter).toBe(Infinity);
    expect(Number.isFinite(calculateHouse(input).walls.totalJm)).toBe(true);
  });

  it('v2: 2000/145 lisas 2 seina peale 1,26 laiust 2 asemel', () => {
    const input = { ...gableBase, frontBackWallHeight: 2000 };
    const old = legacyWalls(toLegacy(input), legacyPartial).jooksevMeeter;
    const now = calculateHouse(input).walls.totalJm;
    const frac = 2000 / 145 - Math.floor(2000 / 145);
    expect(now - old).toBeCloseTo((2 - 1 / frac) * 3000 / 1000, 9);
  });

  it.each([
    ['viil 1995/114 = 17,5 rida', { ...gableBase, log: { thickness: 40, height: 114 }, frontBackWallHeight: 1995, sideWallHeight: 2052, roofHeight: 2565 }],
    ['ühekalle 2109/114 = 18,5 rida', { ...monoBase, log: { thickness: 28, height: 114 }, frontBackWallHeight: 2109, roofHeight: 1881 }],
  ] as [string, HouseInput][])('%s – X,5 rea korral on tulemus TÄPSELT sama mis muutmata v2-l', (_n, input) => {
    const old = legacyWalls(toLegacy(input), legacyPartial);
    const r = calculateHouse(input);
    expect(r.walls.totalJm).toBeCloseTo(old.jooksevMeeter, 9);
  });
});

describe('käsitsi kontrollitud väärtused', () => {
  it('viilkatus 3000x4000, esisein 2070, külg 2000, hari 3000, palk 145', () => {
    const r = calculateHouse(gableBase);
    // esi/taga: floor(2070/145)=14 -> 14*3*2=84 + osaline rida 2 seinale 2*3 = 90
    expect(r.walls.breakdown.frontBack).toBeCloseTo(90, 9);
    expect(r.walls.breakdown.frontBackPartial).toBeCloseTo(6, 9);
    // küljed: floor(2000/145)=13, murdosa -> 12 rida * 4 m * 2 = 96
    expect(r.walls.breakdown.sides).toBeCloseTo(96, 9);
    // viil: ceil((3000-2070)/145)=7 palki
    expect(r.walls.gableCourses).toHaveLength(7);
    expect(r.walls.gableCourses[0]!.length).toBe(3000);
    // 2. palk: sisemine laius 3000-2*(100+44)=2712; tipust 6*145=870; kolmnurga kõrgus 1000
    expect(r.walls.gableCourses[1]!.length).toBeCloseTo((2712 * 870) / 1000, 9);
    expect(r.walls.footprintArea).toBeCloseTo(2.8 * 3.8, 9);
  });

  it('stsenaarium: sise lisab 2 x (ülejääk + paksus) (D3)', () => {
    const r = calculateHouse({ ...gableBase, lengthScenario: 'inner', width: 2500, depth: 3500 });
    expect(r.dimensions).toEqual({ width: 2500 + 2 * 144, depth: 3500 + 2 * 144 });
  });

  it('uste ja akende jm: laius x ridade arv avas', () => {
    const r = calculateHouse({
      ...gableBase,
      doors: [{ width: 900, height: 1900, count: 2 }],
      windows: [{ width: 600, height: 700, count: 1 }],
    });
    expect(r.openings.doorsJm).toBeCloseTo((900 * 14 * 2) / 1000, 9); // ceil(1900/145)=14
    expect(r.openings.windowsJm).toBeCloseTo((600 * 5) / 1000, 9); // ceil(700/145)=5
    expect(r.openings.doorsArea).toBeCloseTo(0.9 * 1.9 * 2, 9);
  });

  it('korduv arvutus annab sama tulemuse (v2 kuhjas uste pindala)', () => {
    const input = { ...gableBase, doors: [{ width: 900, height: 1900, count: 1 }] };
    expect(calculateHouse(input)).toEqual(calculateHouse(input));
  });
});
