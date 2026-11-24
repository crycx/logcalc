/**
 * Seinamudel ja lõikenimekiri.
 *
 * Maja = seinad (praegu ristkülik: 1 ja 2 laiuse suunas, A ja B sügavuse suunas). Igal seinal:
 * palgiread alt üles, ülemised read võivad olla pikemad (varikatus/räästas), viilu- või kolmnurga
 * palgid, uksed ja aknad asukohaga (kaugus palgi otsast, alumine serv).
 *
 * Lõikenimekiri tehakse rida haaval: ava lõikab iga rea, mille kõrgusesse see ulatub. Seina otsas olev
 * tükk (nurgaliite sälk) ja avade vaheline tükk on eri detailid ka sama pikkuse korral – nagu Revitis.
 *
 * Kontroll: test/wall-model.test.ts võrdleb Viktra Revit-joonistega (Placas, Brantevik, Carina, Annika, Bente).
 */
import { courses as splitCourses, type TriangleGeometry } from './geometry.js';
import { planGeometry, rectanglePlan, type HousePlan, type PlanWall, type WallGeometry } from './plan.js';
import { gableEnds, pitchRatio, roofVolumes, volumeSpan, type RoofGableEnd, type RoofVolume } from './roof-volumes.js';
import type { Dimensions, EngineConstants, HouseInput, Opening } from './types.js';

/** Seina tähis: ristkülikul '1', '2', 'A', 'B'; plaanil suvaline (nt 'C', '3'). */
export type WallId = string;

export interface PlacedOpening {
  kind: 'door' | 'window';
  wall: WallId;
  /** kaugus seina palgi otsast ava vasaku servani (mm) */
  offset: number;
  width: number;
  /** alumine serv seina alusest (mm) */
  sill: number;
  height: number;
  name?: string;
  /** true, kui asukoht on arvutatud (kasutaja ei andnud) */
  autoPlaced: boolean;
}

export interface WallRow {
  /** rea alumine ja ülemine serv seina alusest (mm) */
  y0: number;
  y1: number;
  /** palgi pikkus selles reas (pikem ülemine palk võib olla pikem kui sein) */
  length: number;
  kind: 'half' | 'log' | 'top' | 'gable';
  /** rea palgi algus seina koordinaatides; puudub = pikendus võrdselt mõlemas otsas */
  x0?: number;
}

export interface WallJoint {
  x: number;
  wall?: WallId;
  ranges?: [number, number][];
}

/** Tühi ala seinas (seina koordinaatides): uks, aken, lahtine osa, piirde vahe, viilu alune jne. */
export interface WallVoid {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  kind: 'door' | 'window' | 'open';
}

export interface WallSpec {
  id: WallId;
  /** tavalise palgi pikkus (koos nurgaülejääkidega) */
  length: number;
  rows: WallRow[];
  openings: PlacedOpening[];
  /**
   * Liited: ristuvate seinte kesktelgede asukohad seina koordinaatides (seal on palgil sälk).
   * `ranges` = kõrgused, kus ristuval seinal liite kohal palk on (puudub = kogu kõrgus);
   * nt keskviilu (ainult ülemine rida) liide sälgub külgseinal ainult ülemistes ridades.
   */
  joints: WallJoint[];
  /** muud tühjad alad (lahtine osa, piire, viilu alune) */
  voids?: WallVoid[];
  /** sein jätkub samal joonel teise seinana: algus/lõpp on jätk ristuva seina keskteljel (sälk) */
  buttStart?: boolean;
  buttEnd?: boolean;
}

export interface CutPiece {
  /** nt "1BL-1", "ALG-2", "1TL-1"; viilu-/kolmnurga palgil lõpus "*" */
  mark: string;
  profile: string;
  count: number;
  length: number;
  kind: WallRow['kind'];
  /** liidete (sälkude) arv tükis: 0 (avade vahel), 1 (seina otsas / post, ümberpööratav), 2 (terve rida), 3+ (läbib vaheseinu) */
  notches: number;
}

export interface WallCutList {
  wall: WallId;
  pieces: CutPiece[];
  totalJm: number;
  /** tükid, mis on pikemad kui max palk ja mida ei saanud vaheseina kohalt jätkata */
  overLength: number;
}

const EPS = 0.5; // mm

/** Ava asukoht: kasutaja antud või vaikimisi (sein 1, ühtlaselt; aken ülaservaga ukse ülaservas). */
export function placeOpenings(input: HouseInput, dims: Dimensions, c: EngineConstants): PlacedOpening[] {
  const p = input.log.height;
  // asukohaga rida: esimene koopia antud kohta, ülejäänud koopiad automaatselt (et ei kattuks)
  const all: { o: Opening; kind: 'door' | 'window' }[] = [];
  const expand = (o: Opening, kind: 'door' | 'window') => {
    for (let i = 0; i < Math.max(0, Math.floor(o.count)); i++) {
      all.push({ o: i === 0 || o.offset === undefined ? o : { ...o, offset: undefined }, kind });
    }
  };
  for (const o of input.doors ?? []) expand(o, 'door');
  for (const o of input.windows ?? []) expand(o, 'window');

  const wallLen = (w: WallId) => (w === '1' || w === '2' ? dims.width : dims.depth);
  const wallTop = (w: WallId) =>
    w === '1' ? input.frontBackWallHeight : w === '2' ? (input.roofType === 'gable' ? input.frontBackWallHeight : input.roofHeight) : input.sideWallHeight || input.roofHeight - p / 2;

  // vaikimisi asukohad iga seina kaupa: ühtlaselt sisemiste nurkade vahel
  const auto = new Map<WallId, { o: Opening; kind: 'door' | 'window' }[]>();
  for (const a of all) {
    if (a.o.offset !== undefined) continue;
    const w = a.o.wall ?? '1';
    auto.set(w, [...(auto.get(w) ?? []), a]);
  }
  const autoX = new Map<{ o: Opening; kind: 'door' | 'window' }, number>();
  for (const [w, list] of auto) {
    const inner0 = c.cornerOverhang + input.log.thickness;
    const innerW = wallLen(w) - 2 * inner0;
    const gap = Math.max((innerW - list.reduce((s, a) => s + a.o.width, 0)) / (list.length + 1), 0);
    let x = inner0 + gap;
    for (const a of list) {
      autoX.set(a, x);
      x += a.o.width + gap;
    }
  }

  return all.map((a) => {
    const wall = a.o.wall ?? '1';
    const doorTop = Math.max(0, ...all.filter((d) => d.kind === 'door' && (d.o.wall ?? '1') === wall).map((d) => d.o.height));
    const top = Math.min(wallTop(wall), doorTop || wallTop(wall));
    const sill = a.o.sill ?? (a.kind === 'door' ? 0 : Math.max(0, top - a.o.height));
    return {
      kind: a.kind,
      wall,
      offset: a.o.offset ?? autoX.get(a) ?? 0,
      width: a.o.width,
      sill,
      height: a.o.height,
      ...(a.o.name ? { name: a.o.name } : {}),
      autoPlaced: a.o.offset === undefined,
    };
  });
}

/**
 * Maja seinad plaanist (vaikimisi ristkülik). Pikkus ja liited tulevad graafist, read seina suunast:
 * x-suunas (laiuse) seinad algavad poole palgiga ja kannavad viilu, y-suunas seinad on räästaseinad.
 */
export function buildWalls(
  input: HouseInput,
  dims: Dimensions,
  tri: TriangleGeometry,
  c: EngineConstants,
  openings: PlacedOpening[] = placeOpenings(input, dims, c),
  plan: HousePlan = rectanglePlan(dims.width, dims.depth, input.log.thickness, c),
): WallSpec[] {
  const p = input.log.height;
  const gable = input.roofType === 'gable';
  /** read: (pool palki +) täisread, kuni kõrguseni; mittetäpse kõrguse puhul nagu mootoris */
  const rectRows = (length: number, height: number, halfStart: boolean, sideRule: boolean): WallRow[] => {
    const rows: WallRow[] = [];
    let y = 0;
    if (halfStart) {
      rows.push({ y0: 0, y1: p / 2, length, kind: 'half' });
      y = p / 2;
    }
    let n: number;
    if (sideRule) {
      // külgsein: floor(h/p) − (murdosa ? 1 : 0)  (QUESTIONS.md K2); poole palgiga algus arvestatud
      const cs = splitCourses(height - y, p);
      n = cs.full - (cs.frac > 0 ? 1 : 0);
    } else {
      // esi/tagasein: read kuni kõrguseni, osaline rida = terve rida (D1)
      n = Math.ceil((height - y) / p - 1e-9);
    }
    for (let i = 0; i < n; i++) rows.push({ y0: y + i * p, y1: y + (i + 1) * p, length, kind: 'log' });
    return rows;
  };

  // pikemad lauad: viilkatusel külgseintele, ühekaldelisel esi-/tagaseinale; üks kummalegi seinale
  const lowLimit = c.longBoardThreshold;
  const extendTop = (rows: WallRow[], wallLength: number) => {
    const boards = (input.longBoards ?? [])
      .flatMap((b) => Array.from({ length: Math.max(0, Math.floor(b.count / 2)) }, () => b))
      .sort((a, b) => a.length - b.length);
    const low = boards.filter((b) => b.height <= lowLimit);
    const tall = boards.filter((b) => b.height > lowLimit);
    // madalad asendavad ülemised read (pikim kõige peal)
    const logRows = rows.filter((r) => r.kind === 'log');
    const start = Math.max(0, logRows.length - low.length);
    low.forEach((b, i) => {
      const r = logRows[start + i];
      if (r) r.length = Math.max(b.length, wallLength);
    });
    // kõrged lisanduvad ridadena peale
    let y = rows.length ? rows[rows.length - 1]!.y1 : 0;
    for (const b of tall) {
      rows.push({ y0: y, y1: y + b.height, length: b.length, kind: 'log' });
      y += b.height;
    }
    // kõige ülemine pikem palk = TL
    const top = rows[rows.length - 1];
    if (top && top.kind === 'log' && top.length > wallLength + EPS) top.kind = 'top';
  };

  const triangleRows = (baseY: number): WallRow[] =>
    tri.courses.map((cr) => ({ y0: baseY + (cr.index - 1) * p, y1: baseY + cr.index * p, length: cr.length, kind: 'gable' as const }));

  /** kindla kõrgusega sein (post, piire): täisread, ülemine pool palki kui jääk on ≥ ½ palki */
  const heightRows = (length: number, height: number, halfStart: boolean): WallRow[] => {
    const rows: WallRow[] = [];
    let y = 0;
    if (halfStart) {
      rows.push({ y0: 0, y1: p / 2, length, kind: 'half' });
      y = p / 2;
    }
    while (y + p <= height + 1) {
      rows.push({ y0: y, y1: y + p, length, kind: 'log' });
      y += p;
    }
    if (height - y >= p / 2 - 1) rows.push({ y0: y, y1: y + p / 2, length, kind: 'top' });
    return rows;
  };

  const geo = planGeometry(plan, input.log.thickness, c);
  const planWalls = new Map<WallId, PlanWall>(plan.walls.map((w) => [w.id, w]));
  // välisseinad: x-suunas esimene/viimane, y-suunas vasak/parem
  const xWalls = geo.filter((g) => g.dir === 'x');
  const yWalls = geo.filter((g) => g.dir === 'y');
  const yBack = Math.min(...xWalls.map((g) => g.a.y));
  const yFront = Math.max(...xWalls.map((g) => g.a.y));
  const xLeft = Math.min(...yWalls.map((g) => g.a.x));
  const xRight = Math.max(...yWalls.map((g) => g.a.x));
  const near = (a: number, b: number) => Math.abs(a - b) < EPS;
  // ühekalle: kõrgem esisein (suurim y), madalam tagasein (väikseim y); vahepealsed seinad lineaarselt
  const monoHeight = (y: number) =>
    yFront - yBack < EPS ? input.frontBackWallHeight : input.roofHeight + ((y - yBack) / (yFront - yBack)) * (input.frontBackWallHeight - input.roofHeight);
  // viiluta x-suunas vahesein ulatub külgseinte täisridade peale + ½ palki (Boden 2: 19 rida + ½ = 2223)
  // poole palgiga algavad x-suunas seinad (Nora, Lund, Boden) või y-suunas (Gable Sauna 3)
  const halfX = (plan.halfStart ?? 'x') === 'x';
  const sideBase = halfX ? 0 : p / 2;
  const sideCs = splitCourses(input.sideWallHeight - sideBase, p);
  const sideTop = sideBase + (sideCs.full - (sideCs.frac > 0 ? 1 : 0)) * p;

  // viilkatus: katusemahud (põhiosa + tiivad), viilud mahtude otstes, kalle põhiosa järgi
  const vols: RoofVolume[] = gable ? roofVolumes(plan, geo) : [];
  const ends: RoofGableEnd[] = gableEnds(vols);
  const ratio = pitchRatio(vols, input);
  const t = input.log.thickness;

  /** plaani koordinaat -> seina koordinaat (palgi algusest) */
  const toWall = (g: WallGeometry, pos: number) => {
    const a = g.dir === 'x' ? g.a.x : g.a.y;
    const b = g.dir === 'x' ? g.b.x : g.b.y;
    return (pos - a) * (Math.sign(b - a) || 1) + g.startExt;
  };
  /** seina palkide ulatus plaani koordinaatides (piki seina) */
  const wallRange = (g: WallGeometry): [number, number] => {
    const p0 = g.dir === 'x' ? g.a.x : g.a.y;
    const p1 = g.dir === 'x' ? g.b.x : g.b.y;
    const sg = Math.sign(p1 - p0) || 1;
    const lo = p0 - sg * g.startExt;
    const hi = p1 + sg * g.endExt;
    return [Math.min(lo, hi), Math.max(lo, hi)];
  };
  /** viiluotsad, mis on selle seina joonel (või selgesõnaline viil vaheseinal: mahu laiune) */
  const endsFor = (g: WallGeometry, w: PlanWall): RoofGableEnd[] => {
    if (!gable || w.gable === false) return [];
    const at = g.dir === 'x' ? g.a.y : g.a.x;
    const [lo, hi] = wallRange(g);
    const own = ends.filter((e) => e.dir === g.dir && Math.abs(e.at - at) < EPS && Math.min(e.to, hi) - Math.max(e.from, lo) > EPS);
    if (own.length || w.gable !== true) return own;
    // vahesein viiluga (Lund 2, Nora 2): maht, mille sees sein on
    const k = vols.findIndex((v) =>
      g.dir === 'x'
        ? v.ridge === 'y' && at > v.y0 - EPS && at < v.y1 + EPS && Math.min(v.x1, hi) - Math.max(v.x0, lo) > EPS
        : v.ridge === 'x' && at > v.x0 - EPS && at < v.x1 + EPS && Math.min(v.y1, hi) - Math.max(v.y0, lo) > EPS,
    );
    if (k < 0) return [];
    const v = vols[k]!;
    return [g.dir === 'x' ? { volume: k, dir: 'x', at, from: v.x0, to: v.x1 } : { volume: k, dir: 'y', at, from: v.y0, to: v.y1 }];
  };
  /**
   * Mahu viilupalgid seinal (nagu triangleGeometry, laius mahu järgi): 1. rida = mahu palgi pikkus,
   * ülejäänud sisemise kolmnurga järgi; lõigatud seina palkide ulatusega (samal joonel jätkuv sein saab ülejäänu).
   * Tagastab read ja 1. rea ulatuse (räästa osa arvutamiseks).
   */
  const gableRowsFor = (g: WallGeometry, e: RoofGableEnd, baseY: number): { rows: WallRow[]; span: [number, number] } => {
    const v = vols[e.volume]!;
    const across = volumeSpan(v).across;
    const innerW = across - t;
    const innerH = innerW * ratio;
    const center = (e.from + e.to) / 2;
    const full = across + t + 2 * c.cornerOverhang;
    if (innerW <= 0 || innerH <= 0) return { rows: [], span: [center, center] };
    const n = Math.max(0, Math.ceil((input.sideWallHeight + innerH - baseY) / p - 1e-9));
    const [lo, hi] = wallRange(g);
    const rows: WallRow[] = [];
    for (let i = 1; i <= n; i++) {
      const dist = (n + 1 - i) * p;
      const len = i === 1 ? full : Math.min(full, (innerW * dist) / innerH);
      const a = Math.max(lo, center - len / 2);
      const b = Math.min(hi, center + len / 2);
      if (b - a <= EPS) continue;
      const s0 = toWall(g, a);
      const s1 = toWall(g, b);
      rows.push({ y0: baseY + (i - 1) * p, y1: baseY + i * p, length: Math.abs(s1 - s0), x0: Math.min(s0, s1), kind: 'gable' });
    }
    return { rows, span: [center - full / 2, center + full / 2] };
  };

  const specs = geo.map((g): WallSpec => {
    const w = planWalls.get(g.id)!;
    const L = g.length;
    const outerX = g.dir === 'x' && (near(g.a.y, yBack) || near(g.a.y, yFront));
    const outerY = g.dir === 'y' && (near(g.a.x, xLeft) || near(g.a.x, xRight));
    const fullSpan = g.startExt > 0 && g.endExt > 0;
    let rows: WallRow[];
    if (w.height !== undefined) {
      rows = heightRows(L, w.height, (g.dir === 'x') === halfX);
    } else if (gable && g.dir === 'x') {
      const myEnds = endsFor(g, w);
      if (myEnds.length) {
        rows = rectRows(L, input.frontBackWallHeight, halfX, false);
        const baseY = rows.length ? rows[rows.length - 1]!.y1 : 0;
        const spans: [number, number][] = [];
        for (const e of myEnds) {
          const r = gableRowsFor(g, e, baseY);
          rows.push(...r.rows);
          spans.push(r.span);
        }
        // seina osa, mis ei ole viilu all (L-maja: teise mahu räästas): üks rida räästa kõrguseni
        const [lo, hi] = wallRange(g);
        let free: [number, number][] = [[lo, hi]];
        for (const [a, b] of spans) {
          free = free.flatMap(([s0, e0]): [number, number][] =>
            b <= s0 + EPS || a >= e0 - EPS ? [[s0, e0]] : [...(a - s0 > EPS ? [[s0, a] as [number, number]] : []), ...(e0 - b > EPS ? [[b, e0] as [number, number]] : [])],
          );
        }
        for (const [a, b] of free) {
          if (b - a < t + EPS) continue;
          const s0 = toWall(g, a);
          const s1 = toWall(g, b);
          rows.push({ y0: baseY, y1: baseY + p, length: Math.abs(s1 - s0), x0: Math.min(s0, s1), kind: 'log' });
        }
      } else {
        rows = rectRows(L, sideTop + p / 2, halfX, false);
      }
    } else if (gable) {
      rows = rectRows(L, input.sideWallHeight, !halfX, true);
      const myEnds = endsFor(g, w);
      if (myEnds.length) {
        // tiiva viil külgsuunas seinal (hari x-suunas)
        const baseY = rows.length ? rows[rows.length - 1]!.y1 : 0;
        for (const e of myEnds) rows.push(...gableRowsFor(g, e, baseY).rows);
      } else if (outerY && (plan.ridge ?? 'y') === 'y') {
        extendTop(rows, L);
      }
    } else if (g.dir === 'x') {
      rows = rectRows(L, monoHeight(g.a.y), true, false);
      if (outerX) extendTop(rows, L);
    } else {
      const n = Math.floor((input.roofHeight - p / 2) / p + 1e-9);
      rows = Array.from({ length: n }, (_, i) => ({ y0: i * p, y1: (i + 1) * p, length: L, kind: 'log' as const }));
      if (w.gable ?? outerY) rows.push(...triangleRows(n * p));
    }

    // tühjad alad seina tüübist: ainult ülemised read, lahtised osad, piirde vahed
    const rect = rows.filter((r) => r.kind !== 'gable');
    const n = rect.length;
    const voids: WallVoid[] = [];
    const FAR = 1e7;
    if (w.topOnly !== undefined && w.topOnly < n) {
      voids.push({ x0: -FAR, x1: FAR, y0: 0, y1: rect[n - Math.max(w.topOnly, 0)]!.y0, kind: 'open' });
    }
    for (const o of w.open ?? []) {
      const b = Math.max(o.bottomRows ?? 0, 0);
      const t = Math.max(o.topRows ?? 0, 0);
      const y0 = b < n ? rect[b]!.y0 : Infinity;
      const y1 = n - t - 1 >= 0 ? rect[n - t - 1]!.y1 : -Infinity;
      if (y1 > y0 + EPS) voids.push({ x0: o.x0, x1: o.x1, y0, y1, kind: 'open' });
    }
    for (const r of w.railings ?? []) {
      const len = r.spacerLength ?? 300;
      const solid = r.spacers.map((x) => [x, x + len] as const).sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < Math.min(r.rows, n); i += 2) {
        let x = r.x0;
        for (const [a, b] of [...solid, [r.x1, r.x1] as const]) {
          if (a - x > EPS) voids.push({ x0: x, x1: Math.min(a, r.x1), y0: rect[i]!.y0, y1: rect[i]!.y1, kind: 'open' });
          x = Math.max(x, b);
        }
      }
    }
    return {
      id: g.id,
      length: L,
      rows,
      openings: openings.filter((o) => o.wall === g.id),
      joints: [],
      voids,
      ...(g.buttStart ? { buttStart: true } : {}),
      ...(g.buttEnd ? { buttEnd: true } : {}),
    };
  });

  // liited: ristuva seina palgid liite kohal (kõrgusvahemikud) -> sälk ainult neis ridades
  const specById = new Map(specs.map((x) => [x.id, x]));
  geo.forEach((g, i) => {
    specs[i]!.joints = g.joints.map((k) => {
      const other = specById.get(k.wall);
      const otherX = geo.find((o) => o.id === k.wall)?.joints.find((q) => q.wall === g.id)?.x;
      return other && otherX !== undefined ? { x: k.x, wall: k.wall, ranges: solidRanges(other, otherX) } : { x: k.x, wall: k.wall };
    });
  });
  return specs;
}

/** Seina palkide kõrgusvahemikud kohas x (rea tükid, mida tühjad alad ei lõika) */
function solidRanges(wall: WallSpec, x: number): [number, number][] {
  const voids = [
    ...wall.openings.map((o) => ({ x0: o.offset, x1: o.offset + o.width, y0: o.sill, y1: o.sill + o.height })),
    ...(wall.voids ?? []),
  ];
  const out: [number, number][] = [];
  for (const r of wall.rows) {
    // viilu-/kolmnurgapalgid toetuvad nurgaliitele (ühekalde külgseinal ka lühemad) -> alati olemas
    if (r.kind === 'gable') {
      out.push([r.y0, r.y1]);
      continue;
    }
    const x0 = r.x0 ?? -(r.length - wall.length) / 2;
    if (x < x0 - EPS || x > x0 + r.length + EPS) continue;
    const cut = voids.some((v) => v.x0 < x + EPS && v.x1 > x - EPS && v.y0 < r.y1 - EPS && v.y1 > r.y0 + EPS);
    if (!cut) out.push([r.y0, r.y1]);
  }
  return out;
}

/** Paigutatud palgitükk seina vaates (seina koordinaatides, mm) */
export interface PlacedPiece {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  kind: WallRow['kind'];
  notches: number;
  /** tükk algab/lõpeb jätkukohas (pikk sein, vaheseina kesktelg) */
  spliceStart: boolean;
  spliceEnd: boolean;
}

/**
 * Seina palgitükid asukohtadega: iga rida miinus tühjad alad; liiga pikk palk jätkatakse vaheseina
 * kohal (read vaheliti); sälkude arv = liidete arv tükis. Kasutavad lõikenimekiri ja seinajoonis.
 */
export function wallPieces(wall: WallSpec, opts: { maxLogLength?: number } = {}): PlacedPiece[] {
  const max = opts.maxLogLength ?? Infinity;
  const out: PlacedPiece[] = [];
  const voids: WallVoid[] = [
    ...wall.openings.map((o): WallVoid => ({ x0: o.offset, x1: o.offset + o.width, y0: o.sill, y1: o.sill + o.height, kind: o.kind })),
    ...(wall.voids ?? []),
  ];
  // jätk ainult vaheseina kohal, mitte seina otsa nurgaliites
  const jMin = Math.min(...wall.joints.map((j) => j.x));
  const jMax = Math.max(...wall.joints.map((j) => j.x));
  let rowIndex = -1;
  for (const row of wall.rows) {
    if (row.kind !== 'gable') rowIndex++;
    // selle rea liited (ristuval seinal on samas kõrguses palk)
    const joints = wall.joints
      .filter((j) => !j.ranges || j.ranges.some(([a, b]) => a < row.y1 - EPS && b > row.y0 + EPS))
      .map((j) => j.x);
    // pikem ülemine palk: avad paiknevad tavalise palgi koordinaatides, pikendus otstes (või x0 järgi)
    const x0 = row.x0 ?? -(row.length - wall.length) / 2;
    let segs: [number, number][] = [[x0, x0 + row.length]];
    if (row.kind !== 'gable') {
      // tühi ala lõikab rea, kui see ulatub rea kõrgusesse (ka osaliselt)
      const cuts = voids
        .filter((v) => v.y0 < row.y1 - EPS && v.y1 > row.y0 + EPS)
        .map((v) => [v.x0, v.x1] as const)
        .sort((a, b) => a[0] - b[0]);
      for (const [a, b] of cuts) {
        segs = segs.flatMap(([s, e]): [number, number][] => {
          if (b <= s + EPS || a >= e - EPS) return [[s, e]];
          return [
            ...(a - s > EPS ? [[s, a] as [number, number]] : []),
            ...(e - b > EPS ? [[b, e] as [number, number]] : []),
          ];
        });
      }
    }
    for (const [s0, e0] of segs) {
      // liiga pikk palk -> jätk liite (vaheseina) kohal; read vaheliti eri liidetes
      const parts =
        row.kind === 'gable'
          ? [{ s: s0, e: e0, cutS: false, cutE: false }]
          : splitLong(s0, e0, joints.filter((x) => x > jMin + EPS && x < jMax - EPS), max, rowIndex);
      for (const part of parts) {
        // ühe sälguga tükk on ümberpööratav -> algus- ja lõpuotsa tükid on sama detail (nagu Revitis)
        // jätk samal joonel jätkuva seinaga (otsapidi ristuva seina keskteljel) = sälk
        const buttS = !!wall.buttStart && part.s <= EPS;
        const buttE = !!wall.buttEnd && part.e >= wall.length - EPS;
        const notches =
          row.kind === 'gable'
            ? 0
            : joints.filter((x) => x > part.s + EPS && x < part.e - EPS).length + Number(part.cutS || buttS) + Number(part.cutE || buttE);
        out.push({ x0: part.s, x1: part.e, y0: row.y0, y1: row.y1, kind: row.kind, notches, spliceStart: part.cutS, spliceEnd: part.cutE });
      }
    }
  }
  return out;
}

/** Ühe seina lõikenimekiri: tükid (wallPieces) rühmitatud pikkuse, profiili ja sälkude järgi. */
export function wallCutList(
  wall: WallSpec,
  log: { thickness: number; height: number },
  opts: { maxLogLength?: number } = {},
): WallCutList {
  const t = Math.round(log.thickness);
  const max = opts.maxLogLength ?? Infinity;
  const groups = new Map<string, Omit<CutPiece, 'mark'>>();
  let overLength = 0;
  for (const piece of wallPieces(wall, opts)) {
    const length = Math.round(piece.x1 - piece.x0);
    if (length > max + EPS) overLength++;
    const profile = `${t}x${Math.round(piece.y1 - piece.y0)}`;
    const key = `${piece.kind}|${profile}|${length}|${piece.notches}`;
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { profile, count: 1, length, kind: piece.kind, notches: piece.notches });
  }

  // tähised nagu Revitis: BL (pool palki), LG (palgid pikkuse järgi), TL (ülemine pikem palk); viil "*"
  const order = (k: CutPiece['kind']) => (k === 'half' ? 0 : k === 'top' ? 2 : 1);
  const sorted = [...groups.values()].sort((a, b) => order(a.kind) - order(b.kind) || a.length - b.length || Number(a.kind === 'gable') - Number(b.kind === 'gable'));
  const counters = { BL: 0, LG: 0, TL: 0 };
  const pieces: CutPiece[] = sorted.map((g) => {
    const prefix = g.kind === 'half' ? 'BL' : g.kind === 'top' ? 'TL' : 'LG';
    counters[prefix]++;
    return { ...g, mark: `${wall.id}${prefix}-${counters[prefix]}${g.kind === 'gable' ? '*' : ''}` };
  });
  const totalJm = pieces.reduce((s, x) => s + (x.count * x.length) / 1000, 0);
  return { wall: wall.id, pieces, totalJm, overLength };
}

/**
 * Pikk palk tükkideks liidete kohalt (jätk ristuva seina kesktelje kohal, tükk saab seal sälgu).
 * Kui sobivaid liiteid on mitu, kasutavad paaris- ja paaritud read eri liiteid (jätkud vaheliti).
 */
function splitLong(s: number, e: number, joints: number[], max: number, rowIndex: number): { s: number; e: number; cutS: boolean; cutE: boolean }[] {
  const out: { s: number; e: number; cutS: boolean; cutE: boolean }[] = [];
  let start = s;
  let cutS = false;
  for (let guard = 0; guard < 50 && e - start > max + EPS; guard++) {
    const inner = joints.filter((x) => x > start + EPS && x < e - EPS && x - start <= max + EPS);
    if (!inner.length) break;
    // üks jätk piisab? eelista keskele lähimaid; muidu kaugeim võimalik
    const single = inner.filter((x) => e - x <= max + EPS);
    let pick: number;
    if (single.length) {
      const mid = (start + e) / 2;
      const byMid = [...single].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
      pick = byMid[rowIndex % 2 === 1 && byMid.length > 1 ? 1 : 0]!;
    } else {
      pick = inner[inner.length - 1 - (rowIndex % 2 === 1 && inner.length > 1 ? 1 : 0)]!;
    }
    out.push({ s: start, e: pick, cutS, cutE: true });
    start = pick;
    cutS = true;
  }
  out.push({ s: start, e, cutS, cutE: false });
  return out;
}

