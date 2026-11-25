/** Muu puit: 3D tükkide arv tähise kaupa = lõikenimekirja kogus (Bente, Carina ühekalle, L-maja). */
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONSTANTS as C, calculateHouse, houseModel3d, planTemplate, type HouseInput } from '../src/index.js';
const houses: [string, HouseInput][] = [
  ['bente', { roofType: 'gable', lengthScenario: 'log', width: 2950, depth: 3800, sideWallHeight: 1824, frontBackWallHeight: 1767, roofHeight: 2223,
    log: { thickness: 28, height: 114 }, longBoards: [{ length: 4000, height: 114, count: 2 }], roof: {}, purlins: {}, floor: { boardWidth: 110 }, foundation: { joistWidth: 40, joistHeight: 70 } }],
  ['carina', { roofType: 'mono', lengthScenario: 'log', width: 3553, depth: 2943, sideWallHeight: 0, frontBackWallHeight: 2223, roofHeight: 1881,
    log: { thickness: 28, height: 114 }, longBoards: [{ length: 3753, height: 114, count: 2 }], roof: {}, purlins: {}, floor: { boardWidth: 110 }, foundation: { joistWidth: 40, joistHeight: 70 } }],
  ['L', { roofType: 'gable', lengthScenario: 'log', width: 8000, depth: 6000, sideWallHeight: 2166, frontBackWallHeight: 2109, roofHeight: 3200,
    log: { thickness: 40, height: 114 }, roof: {}, purlins: {}, floor: { boardWidth: 110 }, foundation: { joistWidth: 40, joistHeight: 70 }, plan: planTemplate('lshape', 8000, 6000, 40, C) }],
];
describe('3D muu puit = lõikenimekiri', () => {
  it.each(houses)('%s: iga tähise tükke 3D-s sama palju kui lõikenimekirjas, kõigil tähis', (_name, h) => {
    const r = calculateHouse(h);
    const m = houseModel3d(h, r, C);
    expect(r.materials.map((g) => g.key)).toEqual(
      expect.arrayContaining(['vundament', 'porandaLauad', 'parlinid', 'katuseLauad', 'toelaud38', 'esiraastalaud', 'papikinnituslaud', 'tuuleLiist']),
    );
    // suurem toelaud (18x95) räästas ainult viilkatusel (ühekaldel esiräästalaud, Revit Carina)
    expect(r.materials.some((g) => g.key === 'toelaud95')).toBe(h.roofType === 'gable');
    // oru lauad (põhiosa laudade jäägid) on ilma tähiseta
    expect(m.members.filter((x) => x.key !== 'katuseLauadOrg').every((x) => x.mark !== '')).toBe(true);
    for (const g of r.materials)
      for (const row of g.rows) expect([g.key, row.mark, m.members.filter((x) => x.key === g.key && x.mark === row.mark).length]).toEqual([g.key, row.mark, row.count]);
  });
});
