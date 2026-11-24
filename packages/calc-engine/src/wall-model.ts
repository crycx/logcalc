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
import type { Dimensions, EngineConstants, HouseInput, Opening } from './types.js';

export type WallId = '1' | '2' | 'A' | 'B';

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
}

export interface WallSpec {
  id: WallId;
  /** tavalise palgi pikkus (koos nurgaülejääkidega) */
  length: number;
  rows: WallRow[];
  openings: PlacedOpening[];
}

export interface CutPiece {
  /** nt "1BL-1", "ALG-2", "1TL-1"; viilu-/kolmnurga palgil lõpus "*" */
  mark: string;
  profile: string;
  count: number;
  length: number;
  kind: WallRow['kind'];
  /** nurgaliite sälkude arv otstes: 0 (avade vahel), 1 (seina otsas, ümberpööratav), 2 (terve rida) */
  notches: 0 | 1 | 2;
}

export interface WallCutList {
  wall: WallId;
  pieces: CutPiece[];
  totalJm: number;
}

const EPS = 0.5; // mm

/** Ava asukoht: kasutaja antud või vaikimisi (sein 1, ühtlaselt; aken ülaservaga ukse ülaservas). */
export function placeOpenings(input: HouseInput, dims: Dimensions, c: EngineConstants): PlacedOpening[] {
  const p = input.log.height;
  const all: { o: Opening; kind: 'door' | 'window' }[] = [];
  for (const o of input.doors ?? []) for (let i = 0; i < Math.max(0, Math.floor(o.count)); i++) all.push({ o, kind: 'door' });
  for (const o of input.windows ?? []) for (let i = 0; i < Math.max(0, Math.floor(o.count)); i++) all.push({ o, kind: 'window' });

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

/** Ristkülikukujulise maja seinad. */
export function buildWalls(
  input: HouseInput,
  dims: Dimensions,
  tri: TriangleGeometry,
  c: EngineConstants,
): WallSpec[] {
  const p = input.log.height;
  const gable = input.roofType === 'gable';
  const W = dims.width;
  const D = dims.depth;
  const openings = placeOpenings(input, dims, c);

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
      // külgsein: floor(h/p) − (murdosa ? 1 : 0)  (QUESTIONS.md K2)
      const cs = splitCourses(height, p);
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
      rows.push({ y0: y, y1: y + p, length: b.length, kind: 'log' });
      y += p;
    }
    // kõige ülemine pikem palk = TL
    const top = rows[rows.length - 1];
    if (top && top.kind === 'log' && top.length > wallLength + EPS) top.kind = 'top';
  };

  const triangleRows = (baseY: number): WallRow[] =>
    tri.courses.map((cr) => ({ y0: baseY + (cr.index - 1) * p, y1: baseY + cr.index * p, length: cr.length, kind: 'gable' as const }));

  const walls: WallSpec[] = [];
  if (gable) {
    const fb = (id: WallId): WallSpec => {
      const rows = rectRows(W, input.frontBackWallHeight, true, false);
      rows.push(...triangleRows(input.frontBackWallHeight));
      return { id, length: W, rows, openings: openings.filter((o) => o.wall === id) };
    };
    const side = (id: WallId): WallSpec => {
      const rows = rectRows(D, input.sideWallHeight, false, true);
      extendTop(rows, D);
      return { id, length: D, rows, openings: openings.filter((o) => o.wall === id) };
    };
    walls.push(fb('1'), fb('2'), side('A'), side('B'));
  } else {
    const fb = (id: WallId, h: number): WallSpec => {
      const rows = rectRows(W, h, true, false);
      extendTop(rows, W);
      return { id, length: W, rows, openings: openings.filter((o) => o.wall === id) };
    };
    const side = (id: WallId): WallSpec => {
      const n = Math.floor((input.roofHeight - p / 2) / p + 1e-9);
      const rows: WallRow[] = Array.from({ length: n }, (_, i) => ({ y0: i * p, y1: (i + 1) * p, length: D, kind: 'log' as const }));
      rows.push(...triangleRows(n * p));
      return { id, length: D, rows, openings: openings.filter((o) => o.wall === id) };
    };
    walls.push(fb('1', input.frontBackWallHeight), fb('2', input.roofHeight), side('A'), side('B'));
  }
  return walls;
}

/** Ühe seina lõikenimekiri. */
export function wallCutList(wall: WallSpec, log: { thickness: number; height: number }): WallCutList {
  const t = Math.round(log.thickness);
  const p = log.height;
  const groups = new Map<string, Omit<CutPiece, 'mark'>>();

  for (const row of wall.rows) {
    // ava lõikab rea, kui see ulatub rea kõrgusesse (ka osaliselt)
    const cuts = wall.openings
      .filter((o) => o.sill < row.y1 - EPS && o.sill + o.height > row.y0 + EPS)
      .map((o) => [o.offset, o.offset + o.width] as const)
      .sort((a, b) => a[0] - b[0]);
    // pikem ülemine palk: avad paiknevad tavalise palgi koordinaatides, pikendus on otstes
    const ext = (row.length - wall.length) / 2;
    let segs: [number, number][] = [[-Math.max(ext, 0), wall.length + Math.max(ext, 0)]];
    if (row.kind !== 'gable') {
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
    const height = row.kind === 'half' ? Math.round(p / 2) : Math.round(p);
    const profile = `${t}x${height}`;
    const L = row.kind === 'gable' ? row.length : null;
    for (const [s, e] of segs) {
      const length = Math.round(L ?? e - s);
      const notchStart = row.kind === 'gable' ? false : s <= EPS - Math.max(ext, 0);
      const notchEnd = row.kind === 'gable' ? false : e >= wall.length + Math.max(ext, 0) - EPS;
      // ühe sälguga tükk on ümberpööratav -> algus- ja lõpuotsa tükid on sama detail (nagu Revitis)
      const notches = (Number(notchStart) + Number(notchEnd)) as 0 | 1 | 2;
      const key = `${row.kind}|${profile}|${length}|${notches}`;
      const g = groups.get(key);
      if (g) g.count++;
      else groups.set(key, { profile, count: 1, length, kind: row.kind, notches });
    }
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
  return { wall: wall.id, pieces, totalJm };
}
