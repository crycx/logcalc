/**
 * Tuuleliistud Viktra paigaldusjoonise järgi (S-PDF „Windboard“ 190325): toas katuse kalde all oleval seinal,
 * 200 mm nurgast, 40 mm põrandast, 2200 lõigatud katuse alla (50 mm vahe). Kogused vs Revit.
 */
import { describe, expect, it } from 'vitest';
import { calculateHouse, type HouseInput } from '../src/index.js';
import { BODEN, LUND, NORA } from './graph-fixtures.js';

const base = { lengthScenario: 'log' as const, roof: {}, purlins: {}, floor: { boardWidth: 110 }, foundation: { joistWidth: 40, joistHeight: 70 } };
const ANNIKA: HouseInput = { ...base, roofType: 'mono', width: 2900, depth: 2000, sideWallHeight: 0, frontBackWallHeight: 2109, roofHeight: 1881, log: { thickness: 28, height: 114 }, longBoards: [{ length: 3100, height: 114, count: 2 }] };
const BENTE: HouseInput = { ...base, roofType: 'gable', width: 2950, depth: 3800, sideWallHeight: 1824, frontBackWallHeight: 1767, roofHeight: 2223, log: { thickness: 28, height: 114 }, longBoards: [{ length: 4000, height: 114, count: 2 }] };

describe('tuuleliistud (Windboard 18x40 × 2200)', () => {
  it.each([
    ['Annika (ühekalle: külgseinad A, B)', ANNIKA, 4, ['A', 'B']],
    ['Bente (viilud 1, 2)', BENTE, 4, ['1', '2']],
    ['Nora (keskviil ainult ülemised read – ei)', NORA.input, 4, ['1', '3']],
    ['Boden (tagaviil + toa esisein kalde all)', BODEN.input, 4, ['2', '4']],
    ['Lund (3 viiluseina)', LUND.input, 6, ['1', '2', '3']],
  ] as const)('%s: Revit-i kogus', (_n, input, count, walls) => {
    const r = calculateHouse(input);
    expect(r.windboards.length).toBe(count);
    expect([...new Set(r.windboards.map((w) => w.wall))].sort()).toEqual([...walls]);
    const line = r.bom.find((l) => l.key === 'tuuleLiist')!;
    expect(line).toMatchObject({ profile: '18x40', pieces: [{ count, length: 2200 }] });
  });

  it('Bente: 200 mm nurga sisepinnast, 40 mm põrandast (FB 17), lõigatud katuse alla', () => {
    const r = calculateHouse(BENTE);
    // seina 1 liited: A ja B kesktelg 114 ja 2836 (palgi otsast); sisepind ± 14; liistu keskkoht + 200 + 20
    expect(r.windboards.map((w) => Math.round(w.x)).sort((a, b) => a - b)).toEqual([348, 348, 2602, 2602]);
    for (const w of r.windboards) {
      expect(w.z0).toBe(57);
      expect(w.cutNeeded).toBe(true);
      expect(w.cut).toBeGreaterThan(1700);
      expect(w.cut).toBeLessThan(1850);
    }
    const tu = r.materials.find((g) => g.key === 'tuuleLiist')!;
    expect(tu.rows).toEqual([{ mark: 'TU-1', count: 4, length: 2200, cut: r.windboards[0]!.cut }]);
  });

  it('Annika: madalama (taga) ja kõrgema (ees) otsa liistud eri pikkusega', () => {
    const r = calculateHouse(ANNIKA);
    const cuts = [...new Set(r.windboards.map((w) => w.cut))].sort((a, b) => a - b);
    expect(cuts.length).toBe(2);
    expect(r.materials.find((g) => g.key === 'tuuleLiist')!.rows.map((x) => x.count)).toEqual([2, 2]);
  });

  it('Boden: seina 2 aken 350 mm nurgast -> hoiatus (Revit: lisaks lühikesed 550)', () => {
    const r = calculateHouse(BODEN.input);
    expect(r.warnings.some((w) => w.code === 'windboard.opening')).toBe(true);
  });
});

describe('räästalauad vs Revit (D17)', () => {
  const CARINA: HouseInput = { ...base, roofType: 'mono', width: 3553, depth: 2943, sideWallHeight: 0, frontBackWallHeight: 2223, roofHeight: 1881, log: { thickness: 28, height: 114 }, longBoards: [{ length: 3753, height: 114, count: 2 }] };
  const line = (r: ReturnType<typeof calculateHouse>, key: string) => r.bom.find((l) => l.key === key);

  it('EE profiil: 28 mm palk 18x40 (Bente, Annika, Carina), 40 mm palk 18x95 (Lund, Nora, Boden)', () => {
    for (const h of [BENTE, ANNIKA, CARINA]) expect(line(calculateHouse(h), 'papikinnituslaud')!.profile).toBe('18x40');
    for (const h of [LUND.input, NORA.input, BODEN.input]) expect(line(calculateHouse({ ...h, roof: {} }), 'papikinnituslaud')!.profile).toBe('18x95');
  });

  it('Carina (ühekalle): RF viiluservades 2 + räästas 2 × (3753 + 36), suuremat toelauda pole, RR 38x38 2 × 3753', () => {
    const r = calculateHouse(CARINA);
    const rf = line(r, 'esiraastalaud')!;
    expect(rf.pieces).toEqual(expect.arrayContaining([{ count: 2, length: 3789 }]));
    expect(rf.pieces!.reduce((s, p) => s + p.count, 0)).toBe(4);
    expect(line(r, 'toelaud95')).toBeUndefined();
    expect(line(r, 'toelaud38')!.pieces).toEqual([{ count: 2, length: 3753 }]);
  });

  it('viilkatus (Bente): RF ja EE 4 tk, toelauad 18x95 ja 38x38 2 × 4000 (Revit)', () => {
    const r = calculateHouse(BENTE);
    expect(line(r, 'esiraastalaud')!.pieces).toEqual([{ count: 4, length: expect.any(Number) }]);
    expect(line(r, 'toelaud95')!.pieces).toEqual([{ count: 2, length: 4000 }]);
    expect(line(r, 'toelaud38')!.pieces).toEqual([{ count: 2, length: 4000 }]);
  });
});

describe('tuuleliistud lahtise seina juures', () => {
  it('Kolding: veranda esiraam (sein 1) lahtine, nurgaposti pole -> liiste pole, kokku 4 (Revit)', async () => {
    const { KOLDING } = await import('./graph-fixtures.js');
    const r = calculateHouse(KOLDING.input);
    expect(r.windboards.length).toBe(4);
    expect(r.windboards.some((w) => w.wall === '1')).toBe(false);
  });
});

describe('veranda postid ja käsipuud (Revit Kolding Roof 1 / Details 5)', () => {
  it('CM1 2 × 1233, CM2 2 × 1176, postijalg 2 tk; käsipuud 2 × 1945, 2 × 1040, 2 × 105', async () => {
    const { KOLDING } = await import('./graph-fixtures.js');
    const r = calculateHouse(KOLDING.input);
    const line = (k: string) => r.bom.find((l) => l.key === k);
    expect(line('postid')!.pieces).toEqual(expect.arrayContaining([{ count: 2, length: 1233 }, { count: 2, length: 1176 }]));
    expect(line('postid')!.profile).toBe('40x70');
    expect(line('postijalg')!.quantity).toBe(2);
    // külgseina käsipuu 1945 täpselt; esiseina oma katkeb külgseina käsipuu kohal: Revit 105 + 1040 (meil ±3 mm)
    const hr = line('kasipuud')!.pieces!;
    expect(hr).toEqual(expect.arrayContaining([{ count: 2, length: 1945 }]));
    const near = (len: number) => hr.find((x) => x.count === 2 && Math.abs(x.length - len) <= 3);
    expect(near(105)).toBeTruthy();
    expect(near(1040)).toBeTruthy();
    expect(line('kasipuud')!.profile).toBe('40x143');
    expect(r.materials.find((g) => g.key === 'postid')!.rows.map((x) => x.mark)).toEqual(['CM-1', 'CM-2']);
  });

  it('post nurgasõlmes külgseina käsipuul (Revit Floor Plan): ristuva seina tükk sõlmes, esiseina tükk palgi otsa pool', async () => {
    const { KOLDING } = await import('./graph-fixtures.js');
    const r = calculateHouse(KOLDING.input);
    const n1a = KOLDING.input.plan!.nodes.find((n) => n.id === '1a')!;
    const p = r.veranda.posts.find((x) => x.node === '1a')!;
    expect([p.x, p.y]).toEqual([n1a.x, n1a.y]);
    expect(p.wall).toBe('1');
    expect(p.out).toEqual({ x: -1, y: 0 });
    // külgseina käsipuu jookseb sõlmest läbi (seinast kuni 45 üle palgi otsa)
    const a = r.veranda.handrails.filter((h) => h.wall === 'A');
    expect(a).toHaveLength(1);
    expect([a[0]!.x0, a[0]!.x1]).toEqual([3800, 5745]);
    // post seisab käsipuul: postijala all käsipuu pealispind
    expect(p.z0).toBe(677 + 40 + 45);
  });

  it('U-profiil 2 × 40x76 × 625 piirde vabades otstes (ukse kõrval)', async () => {
    const { KOLDING } = await import('./graph-fixtures.js');
    const r = calculateHouse(KOLDING.input);
    expect(r.veranda.uProfiles.map((u) => [u.wall, u.x, u.dir])).toEqual([
      ['1', 1180, 1],
      ['1', 2620, -1],
    ]);
    const l = r.bom.find((x) => x.key === 'uprofiil')!;
    expect(l.quantity).toBe(2);
    expect(l.profile).toBe('40x76');
    expect(l.pieces).toEqual([{ count: 2, length: 625 }]);
    expect(r.materials.find((g) => g.key === 'uprofiil')!.rows).toEqual([{ mark: 'UP-1', count: 2, length: 625 }]);
    expect(r.materials.find((g) => g.key === 'postijalg')!.rows).toEqual([{ mark: 'PJ-1', count: 2, length: 45 }]);
  });
});

describe('pikendatud otste pinu (Revit Kolding Wall A, Details 3)', () => {
  it('ALG9 otsad 65 + 45°, selle peal ATL1 otsad sirged', async () => {
    const { KOLDING } = await import('./graph-fixtures.js');
    const r = calculateHouse(KOLDING.input);
    const { houseModel3d, DEFAULT_CONSTANTS } = await import('../src/index.js');
    const m = houseModel3d(KOLDING.input, r, DEFAULT_CONSTANTS, { members: false });
    const a = m.walls.find((w) => w.id === 'A')!;
    const top = a.pieces.reduce((t, p) => (p.y1 > t.y1 ? p : t));
    const iTop = a.pieces.indexOf(top);
    const iLg9 = a.pieces.findIndex((p) => Math.abs(p.y1 - top.y0) < 1 && Math.abs(p.x0 - top.x0) < 1);
    expect(iLg9).toBeGreaterThanOrEqual(0);
    expect([a.details[iTop]!.start, a.details[iTop]!.end]).toEqual(['plain', 'plain']);
    expect([a.details[iLg9]!.start, a.details[iLg9]!.end]).toEqual(['ext', 'ext']);
  });
});
