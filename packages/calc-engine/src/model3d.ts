/**
 * 3D mudel samast seinamudelist (WALL-GRAPH.md, etapp 5): iga palgitükk oma kohal, avad, katusepinnad.
 * Puhas andmestruktuur (ei sõltu joonistusteegist) – alus 3D vaatele ja hiljem CNC/BTL ekspordile.
 *
 * Koordinaadid mm: x = laius (vasakult paremale), y = sügavus (tagant ette, esisein suurim y), z = üles.
 * Sein: palgi algus `origin` (kesktelg), suund `u`; seina koordinaat X kulgeb mööda `u`, Z üles,
 * palk on keskteljel paksusega `thickness`.
 */
import { planBounds, planGeometry, rectanglePlan, type HousePlan, type WallGeometry } from './plan.js';
import { pitchRatio, roofVolumes, volumeSpan, type RoofVolume } from './roof-volumes.js';
import type { CalcResult, EngineConstants, HouseInput } from './types.js';
import { wallPieces, type PlacedPiece } from './wall-model.js';

const EPS = 0.5;

export type Vec3 = [number, number, number];

export interface Wall3D {
  id: string;
  dir: 'x' | 'y';
  /** palgi alguspunkt plaanil (kesktelg) */
  origin: { x: number; y: number };
  /** ühikvektor piki seina */
  u: { x: number; y: number };
  thickness: number;
  length: number;
  /** palgitükid seina koordinaatides (x = piki seina, y = kõrgus) */
  pieces: PlacedPiece[];
  /** uksed ja aknad seina koordinaatides */
  openings: { x0: number; x1: number; z0: number; z1: number; kind: 'door' | 'window' }[];
  /**
   * Katuse alumine pind seina kohal (X, Z) murdjoonena, kui sein on viilu/kalde all – viilupalgid lõigatakse
   * selle järgi (palgi ülemine nurk katusepinnani). null = sein lõpeb räästa kõrgusel.
   */
  roofLine: [number, number][] | null;
  /**
   * Räästasein: katuse alumine pind risti seinaga – kõrgus z = z0 + k × s, kus s on kaugus kesktelljest
   * normaali n = (−u.y, u.x) suunas (−t/2 … t/2). Katus toetub ülemise palgi siseservale; palgid, mis
   * ulatuvad katusepinnast kõrgemale, lõigatakse kaldu (ülemise palgi faas). null = pole räästasein.
   */
  roofCross: { z0: number; k: number } | null;
}

export interface RoofPlane3D {
  /** 4 nurka: räästas (2), hari/ülemine serv (2), katuse alumine pind */
  pts: [Vec3, Vec3, Vec3, Vec3];
  /** katuseosa (0 = põhiosa) */
  part: number;
}

export interface HouseModel3D {
  walls: Wall3D[];
  roofs: RoofPlane3D[];
  bounds: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number };
}

export function houseModel3d(input: HouseInput, result: CalcResult, c: EngineConstants): HouseModel3D {
  const t = input.log.thickness;
  const plan: HousePlan = input.plan ?? rectanglePlan(result.dimensions.width, result.dimensions.depth, t, c);
  const geo = planGeometry(plan, t, c);
  const byId = new Map(geo.map((g) => [g.id, g]));

  const walls: Wall3D[] = [];
  for (const spec of result.wallModel) {
    const g = byId.get(spec.id);
    if (!g) continue;
    const ux = (g.b.x - g.a.x) / g.span;
    const uy = (g.b.y - g.a.y) / g.span;
    walls.push({
      id: spec.id,
      dir: g.dir,
      origin: { x: g.a.x - ux * g.startExt, y: g.a.y - uy * g.startExt },
      u: { x: ux, y: uy },
      thickness: t,
      length: spec.length,
      pieces: wallPieces(spec, { maxLogLength: c.maxLogLength }),
      openings: spec.openings.map((o) => ({ x0: o.offset, x1: o.offset + o.width, z0: o.sill, z1: o.sill + o.height, kind: o.kind })),
      roofLine: null,
      roofCross: null,
    });
  }

  // palkide ulatus (pikemad ülemised palgid ulatuvad üle otsa – varikatus)
  const pb = planBounds(geo);
  let bx0 = pb.x0;
  let bx1 = pb.x1;
  let by0 = pb.y0;
  let by1 = pb.y1;
  let zTop = 0;
  for (const w of walls) {
    for (const p of w.pieces) {
      for (const X of [p.x0, p.x1]) {
        const x = w.origin.x + w.u.x * X;
        const y = w.origin.y + w.u.y * X;
        bx0 = Math.min(bx0, x);
        bx1 = Math.max(bx1, x);
        by0 = Math.min(by0, y);
        by1 = Math.max(by1, y);
      }
      zTop = Math.max(zTop, p.y1);
    }
  }

  /** mahu räästaseinte palkide ulatus harja suunas (pikemad ülemised palgid – varikatus) */
  const eaveExtent = (v: RoofVolume): [number, number] | null => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const w of walls) {
      const g = byId.get(w.id)!;
      if (g.dir !== v.ridge) continue;
      const line = g.dir === 'x' ? g.a.y : g.a.x;
      const edges = v.ridge === 'y' ? [v.x0, v.x1] : [v.y0, v.y1];
      if (!edges.some((e) => Math.abs(e - line) < EPS)) continue;
      for (const p of w.pieces) {
        for (const X of [p.x0, p.x1]) {
          const pos = v.ridge === 'y' ? w.origin.y + w.u.y * X : w.origin.x + w.u.x * X;
          lo = Math.min(lo, pos);
          hi = Math.max(hi, pos);
        }
      }
    }
    return lo < hi ? [lo, hi] : null;
  };

  const ov = result.roof?.computedOverhang ?? input.roof?.overhang ?? c.defaultRoofOverhang;
  const roofs: RoofPlane3D[] = [];
  /** katuse alumise pinna kõrgus plaani punktis (null = katust pole) */
  let roofZ: (x: number, y: number) => number | null = () => null;

  if (input.roofType === 'gable') {
    const vols = roofVolumes(plan, geo);
    const ratio = pitchRatio(vols, input);
    const slope = 2 * ratio; // tõus / horisontaal (ratio = kõrgus / sisemine laius)
    // katuse alumine pind toetub räästaseinte ülemise palgi siseservale (välisserv lõigatakse kaldu – faas);
    // kõigil mahtudel sama räästa kõrgus, et orud klapiksid
    let eaveTop = input.sideWallHeight;
    for (const w of walls) {
      const g = byId.get(w.id)!;
      const line = g.dir === 'x' ? g.a.y : g.a.x;
      const isEave = vols.some((v) => v.ridge === g.dir && (v.ridge === 'y' ? [v.x0, v.x1] : [v.y0, v.y1]).some((e) => Math.abs(e - line) < EPS));
      if (!isEave) continue;
      for (const p of w.pieces) if (p.kind !== 'gable') eaveTop = Math.max(eaveTop, p.y1);
    }
    const zOf = (d: number) => eaveTop + slope * (d - t / 2);
    // räästaseinte ristlõike katusejoon (ülemise palgi faas)
    for (const w of walls) {
      const g = byId.get(w.id)!;
      const line = g.dir === 'x' ? g.a.y : g.a.x;
      for (const v of vols) {
        if (v.ridge !== g.dir) continue;
        const [e0, e1] = v.ridge === 'y' ? [v.x0, v.x1] : [v.y0, v.y1];
        const into = Math.abs(e0 - line) < EPS ? 1 : Math.abs(e1 - line) < EPS ? -1 : 0;
        if (!into) continue;
        // normaali komponent katuse tõusu teljel (ridge y -> tõus x-suunas)
        const nAxis = v.ridge === 'y' ? -w.u.y : w.u.x;
        w.roofCross = { z0: zOf(0), k: slope * nAxis * into };
        break;
      }
    }
    vols.forEach((v, k) => {
      const across = volumeSpan(v).across;
      const ridgeD = across / 2;
      const [lo, hi] = alongExtent(vols, k, t, c, eaveExtent(v));
      const z = zOf;
      const dEave = -(t / 2 + ov);
      // kaks katusepoolt: d mõõdetakse räästaseina kesktelljest harja poole
      const halves: [number, number][] = v.ridge === 'y' ? [[v.x0, 1], [v.x1, -1]] : [[v.y0, 1], [v.y1, -1]];
      for (const [edge, sgn] of halves) {
        const a = edge + sgn * dEave;
        const r = edge + sgn * ridgeD;
        const pts: [Vec3, Vec3, Vec3, Vec3] =
          v.ridge === 'y'
            ? [[a, lo, z(dEave)], [a, hi, z(dEave)], [r, hi, z(ridgeD)], [r, lo, z(ridgeD)]]
            : [[lo, a, z(dEave)], [hi, a, z(dEave)], [hi, r, z(ridgeD)], [lo, r, z(ridgeD)]];
        roofs.push({ pts, part: k });
      }
    });
    roofZ = (x, y) => {
      let best: number | null = null;
      for (const v of vols) {
        if (x < v.x0 - EPS || x > v.x1 + EPS || y < v.y0 - EPS || y > v.y1 + EPS) continue;
        const d = v.ridge === 'y' ? Math.min(x - v.x0, v.x1 - x) : Math.min(y - v.y0, v.y1 - y);
        const zz = zOf(d);
        if (best === null || zz > best) best = zz;
      }
      return best;
    };
  } else {
    // ühekalle: kõrgem esisein (suurim y) -> madalam tagasein, sama joon mis seinte ülemised palgid
    const xs = geo.filter((g) => g.dir === 'x').map((g) => g.a.y);
    const yBack = Math.min(...xs);
    const yFront = Math.max(...xs);
    const zAt = (y: number) =>
      yFront - yBack < EPS ? input.frontBackWallHeight : input.roofHeight + ((y - yBack) / (yFront - yBack)) * (input.frontBackWallHeight - input.roofHeight);
    const ya = yBack - t / 2 - ov;
    const yb = yFront + t / 2 + ov;
    roofs.push({ pts: [[bx0, yb, zAt(yb)], [bx1, yb, zAt(yb)], [bx1, ya, zAt(ya)], [bx0, ya, zAt(ya)]], part: 0 });
    roofZ = (_x, y) => zAt(y);
  }

  // katuse joon igal seinal (viilupalkide lõikamiseks): murdepunktid seina otstes, sõlmedes ja harjal
  for (const w of walls) {
    if (!w.pieces.some((p) => p.kind === 'gable')) continue;
    const xsW = new Set<number>([0, w.length]);
    const g = byId.get(w.id)!;
    const toW = (pos: number) => {
      const p0 = g.dir === 'x' ? w.origin.x : w.origin.y;
      const uu = g.dir === 'x' ? w.u.x : w.u.y;
      return (pos - p0) * uu;
    };
    for (const n of plan.nodes) xsW.add(toW(g.dir === 'x' ? n.x : n.y));
    if (input.roofType === 'gable') {
      for (const v of roofVolumes(plan, geo)) {
        if (v.ridge === g.dir) continue;
        xsW.add(toW(g.dir === 'x' ? (v.x0 + v.x1) / 2 : (v.y0 + v.y1) / 2));
      }
    }
    const line: [number, number][] = [];
    for (const X of [...xsW].filter((x) => x >= -EPS && x <= w.length + EPS).sort((a, b) => a - b)) {
      const z = roofZ(w.origin.x + w.u.x * X, w.origin.y + w.u.y * X);
      if (z !== null) line.push([X, z]);
    }
    // seina otsad väljaspool mahtu: lähima punkti kõrgus
    if (line.length) {
      if (line[0]![0] > EPS) line.unshift([0, line[0]![1]]);
      if (line[line.length - 1]![0] < w.length - EPS) line.push([w.length, line[line.length - 1]![1]]);
    }
    w.roofLine = line.length ? line : null;
  }

  const zMax = Math.max(zTop, ...roofs.flatMap((r) => r.pts.map((p) => p[2])));
  return { walls, roofs, bounds: { x0: bx0 - ov, y0: by0 - ov, z0: 0, x1: bx1 + ov, y1: by1 + ov, z1: zMax } };
}

/**
 * Mahu katuse ulatus harja suunas (plaani koordinaadid): vaba ots palgi otsani (põhiosal palkide ulatuseni –
 * pikemad ülemised palgid/varikatus), teise mahu räästa vastas hari kuni teise katusepinnani (org),
 * viilu vastas seina välispinnani.
 */
function alongExtent(
  vols: RoofVolume[],
  k: number,
  t: number,
  c: Pick<EngineConstants, 'cornerOverhang'>,
  free: [number, number] | null,
): [number, number] {
  const v = vols[k]!;
  const across = volumeSpan(v).across;
  const lo0 = v.ridge === 'y' ? v.y0 : v.x0;
  const hi0 = v.ridge === 'y' ? v.y1 : v.x1;
  const ext = (at: number, sgn: number): number => {
    const host = vols.findIndex((o, m) => {
      if (m === k) return false;
      if (v.ridge === 'y') return (Math.abs(o.y0 - at) < EPS || Math.abs(o.y1 - at) < EPS) && Math.min(o.x1, v.x1) - Math.max(o.x0, v.x0) > EPS;
      return (Math.abs(o.x0 - at) < EPS || Math.abs(o.x1 - at) < EPS) && Math.min(o.y1, v.y1) - Math.max(o.y0, v.y0) > EPS;
    });
    if (host < 0) {
      const logEnd = at + sgn * (t / 2 + c.cornerOverhang);
      if (!free) return logEnd;
      return sgn < 0 ? Math.min(logEnd, free[0]) : Math.max(logEnd, free[1]);
    }
    const o = vols[host]!;
    const edgeDir = v.ridge === 'y' ? 'x' : 'y';
    // teise mahu räästas -> hari jõuab teise katusepinnani pool laiust edasi; viil -> seina välispind
    return o.ridge === edgeDir ? at + sgn * (across / 2) : at - sgn * (t / 2);
  };
  return [ext(lo0, -1), ext(hi0, 1)];
}

export type { WallGeometry };
