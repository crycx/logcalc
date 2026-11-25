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
import { buildMembers, type Member3D } from './members3d.js';
import { DETAIL, extCut, pieceDetails, type PieceDetail } from './details.js';

export type { Member3D };

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
  /** tükkide tähised lõikenimekirjast (pieces järjekorras), nt "1LG-3" */
  marks: string[];
  /** avad; uksel tiivad (1/2) ja hingede pool (seina alguse/lõpu pool) */
  openings: { x0: number; x1: number; z0: number; z1: number; kind: 'door' | 'window'; leaves?: 1 | 2; hinge?: 'start' | 'end' }[];
  /**
   * Katuse alumine pind seina kohal (X, Z) murdjoonena, kui sein on viilu/kalde all – viilupalgid lõigatakse
   * selle järgi (palgi ülemine nurk katusepinnani). null = sein lõpeb räästa kõrgusel.
   */
  roofLine: [number, number][] | null;
  /**
   * Räästa lõigud (seina koordinaatides x0..x1): katuse alumine pind risti seinaga – z = z0 + k × s, kus s on
   * kaugus kesktelljest normaali n = (−u.y, u.x) suunas (−t/2 … t/2). Katus toetub ülemise palgi siseservale;
   * palgid, mis ulatuvad kõrgemale, lõigatakse kaldu (faas). L-maja sein võib olla osaliselt räästas, osaliselt
   * viilusein – viilupalgid lõigatakse alati `roofLine` järgi.
   */
  roofCross: { x0: number; x1: number; z0: number; k: number }[];
  /** sein jätkub samal joonel teise seinana (otsas pole palgiotsa – sirge) */
  buttStart?: boolean;
  buttEnd?: boolean;
  /** sälgud seina tasandis (X, Z) – pärlinite/harja pilud viilupalkides (40 × 95, Revit Kolding Details 1) */
  notches: { kind: 'purlin'; pts: [number, number][] }[];
  /** tükkide detailid (sälgud, otsalõiked, pilud) – pieces järjekorras */
  details: PieceDetail[];
}

export interface RoofPlane3D {
  /** 4 nurka: räästas (2), hari/ülemine serv (2), katuse alumine pind */
  pts: [Vec3, Vec3, Vec3, Vec3];
  /** katuseosa (0 = põhiosa) */
  part: number;
  /** räästa servad: 0 = pts[0]–pts[1], 1 = pts[3]–pts[2] (ühekaldel mõlemad) */
  eaves: (0 | 1)[];
  /** vabad otsad piki räästast (pts[0] pool, pts[1] pool): viiluots – räästalauad (RF, EE); org/sein – ei */
  freeEnds: [boolean, boolean];
}

export interface HouseModel3D {
  walls: Wall3D[];
  roofs: RoofPlane3D[];
  /** muu puit (prussid, põranda-/katuselauad, pärlinid, räästa- ja toelauad, tuuleliistud) tähistega */
  members: Member3D[];
  bounds: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number };
}

export function houseModel3d(input: HouseInput, result: CalcResult, c: EngineConstants, opts: { members?: boolean } = {}): HouseModel3D {
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
      marks: result.cutList.find((cl) => cl.wall === spec.id)?.pieceMarks ?? [],
      openings: spec.openings.map((o) => ({
        x0: o.offset,
        x1: o.offset + o.width,
        z0: o.sill,
        z1: o.sill + o.height,
        kind: o.kind,
        ...(o.kind === 'door' ? { leaves: o.leaves ?? 1, hinge: o.hinge ?? 'start' } : {}),
      })),
      roofLine: null,
      roofCross: [],
      notches: [],
      details: [],
      ...(spec.buttStart ? { buttStart: true } : {}),
      ...(spec.buttEnd ? { buttEnd: true } : {}),
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
    // katuse alumine pind maja kõrgustest: räästaseina siseservas küljeseina kõrgus, harjal Hari h
    // (Viktra: viilupalkide tipp = Hari h). Kõik palgid, mis ulatuvad kõrgemale, lõigatakse katuse järgi:
    // räästaseina ülemine palk kaldu (faas), viilupalgid ja viilu täisrea otsad katusejoone järgi.
    const zOf = (d: number) => input.sideWallHeight + slope * (d - t / 2);
    const outA = t / 2 + ov + EPS;
    const outL = t / 2 + c.cornerOverhang + EPS;
    // räästaseinte ristlõike katusejoon (ülemise palgi faas)
    for (const w of walls) {
      const g = byId.get(w.id)!;
      const line = g.dir === 'x' ? g.a.y : g.a.x;
      const p0 = g.dir === 'x' ? w.origin.x : w.origin.y;
      const uu = g.dir === 'x' ? w.u.x : w.u.y;
      for (const v of vols) {
        if (v.ridge !== g.dir) continue;
        const [e0, e1] = v.ridge === 'y' ? [v.x0, v.x1] : [v.y0, v.y1];
        const into = Math.abs(e0 - line) < EPS ? 1 : Math.abs(e1 - line) < EPS ? -1 : 0;
        if (!into) continue;
        // lõik piki seina: mahu ulatus harja suunas (+ nurga ülejääk)
        const [l0, l1] = v.ridge === 'y' ? [v.y0, v.y1] : [v.x0, v.x1];
        const a = (l0 - outL - p0) * uu;
        const b = (l1 + outL - p0) * uu;
        // normaali komponent katuse tõusu teljel (ridge y -> tõus x-suunas)
        const nAxis = v.ridge === 'y' ? -w.u.y : w.u.x;
        w.roofCross.push({ x0: Math.min(a, b), x1: Math.max(a, b), z0: zOf(0), k: slope * nAxis * into });
      }
    }
    vols.forEach((v, k) => {
      const across = volumeSpan(v).across;
      const ridgeD = across / 2;
      const [lo, hi, freeLo, freeHi] = alongExtent(vols, k, t, c, eaveExtent(v));
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
        // teine pool: pts järjekord peegeldub (lo/hi samad)
        roofs.push({ pts, part: k, eaves: [0], freeEnds: [freeLo, freeHi] });
      }
    });
    // katusepind ka räästa üleulatuse ja otste kohal (palgi otsad nurkades lõigatakse kalde järgi)
    roofZ = (x, y) => {
      let best: number | null = null;
      for (const v of vols) {
        const [a, a0, a1, l, l0, l1] = v.ridge === 'y' ? [x, v.x0, v.x1, y, v.y0, v.y1] : [y, v.y0, v.y1, x, v.x0, v.x1];
        if (l < l0 - outL || l > l1 + outL) continue;
        const d = Math.min(a - a0, a1 - a);
        if (d < -outA) continue;
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
    roofs.push({ pts: [[bx0, yb, zAt(yb)], [bx1, yb, zAt(yb)], [bx1, ya, zAt(ya)], [bx0, ya, zAt(ya)]], part: 0, eaves: [0, 1], freeEnds: [true, true] });
    roofZ = (_x, y) => zAt(y);
    // esi-/tagasein: katus kaldu üle seina paksuse
    const k = yFront - yBack < EPS ? 0 : (input.frontBackWallHeight - input.roofHeight) / (yFront - yBack);
    for (const w of walls) {
      const g = byId.get(w.id)!;
      if (g.dir === 'x') w.roofCross.push({ x0: -1e9, x1: 1e9, z0: zAt(g.a.y), k: k * w.u.x });
    }
  }

  // katuse joon piki seina (kõik seinad; räästa lõikudes kasutatakse ristlõiget): murdepunktid seina otstes,
  // sõlmedes, mahtude servades ja harjal
  const volsAll = input.roofType === 'gable' ? roofVolumes(plan, geo) : [];
  for (const w of walls) {
    const xsW = new Set<number>([0, w.length]);
    const g = byId.get(w.id)!;
    const toW = (pos: number) => {
      const p0 = g.dir === 'x' ? w.origin.x : w.origin.y;
      const uu = g.dir === 'x' ? w.u.x : w.u.y;
      return (pos - p0) * uu;
    };
    for (const n of plan.nodes) xsW.add(toW(g.dir === 'x' ? n.x : n.y));
    for (const v of volsAll) {
      const [a0, a1] = g.dir === 'x' ? [v.x0, v.x1] : [v.y0, v.y1];
      for (const pos of [a0, a1, (a0 + a1) / 2]) xsW.add(toW(pos));
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
  const members = opts.members === false ? [] : buildMembers(input, result, c, { plan, geo, walls, roofs, roofZ });
  // pärlinite pilud: pärlin läbib risti seina (viilusein) -> pilu seina tasandis (pärlini ülaosa, 143 − 48 = 95),
  // pärlinile alt sälk seina paksuses × 48
  for (const mb of members) {
    if (mb.key !== 'parlinid') continue;
    const [ux, uy] = [mb.u[0], mb.u[1]];
    let w3: Vec3 = [mb.u[1] * mb.v[2] - mb.u[2] * mb.v[1], mb.u[2] * mb.v[0] - mb.u[0] * mb.v[2], mb.u[0] * mb.v[1] - mb.u[1] * mb.v[0]];
    if (w3[2] < 0) w3 = [-w3[0], -w3[1], -w3[2]];
    const ph = mb.size[2];
    const slotDepth = Math.max(0, ph - DETAIL.purlinNotch);
    const ridge = Math.abs(w3[2] - 1) < 1e-6 && Math.abs(mb.v[2]) < 1e-6;
    const notches: { x: number; w: number; depth: number }[] = [];
    for (const w of walls) {
      // sein risti pärliniga ja pärlin ulatub üle seina joone
      if (Math.abs(w.u.x * ux + w.u.y * uy) > 0.01) continue;
      const n = { x: -w.u.y, y: w.u.x };
      const dist = (mb.c[0] - w.origin.x) * n.x + (mb.c[1] - w.origin.y) * n.y;
      const half = mb.size[0] / 2;
      const along = ux * n.x + uy * n.y; // ±1
      if (Math.abs(dist) > half + EPS || Math.abs(along) < 0.5) continue;
      const toW = (p: Vec3): [number, number] => [(p[0] - w.origin.x) * w.u.x + (p[1] - w.origin.y) * w.u.y, p[2]];
      // pilu: pärlini ülemisest pinnast (katuse alumine pind) slotDepth alla
      const corner = (sv: number, down: number): Vec3 => [
        mb.c[0] + (mb.v[0] * sv * mb.size[1]) / 2 + w3[0] * (ph / 2 - down),
        mb.c[1] + (mb.v[1] * sv * mb.size[1]) / 2 + w3[1] * (ph / 2 - down),
        mb.c[2] + (mb.v[2] * sv * mb.size[1]) / 2 + w3[2] * (ph / 2 - down),
      ];
      const pts = [corner(-1, slotDepth), corner(1, slotDepth), corner(1, 0), corner(-1, 0)].map(toW);
      if (pts.every(([x]) => x < -EPS || x > w.length + EPS)) continue;
      w.notches.push({ kind: 'purlin', pts });
      // pärlini sälk: seina keskjoone koht piki pärlinit (algusest)
      const at = mb.size[0] / 2 + ((w.origin.x - mb.c[0]) * n.x + (w.origin.y - mb.c[1]) * n.y) * along;
      notches.push({ x: at, w: w.thickness, depth: DETAIL.purlinNotch });
    }
    notches.sort((p, q) => p.x - q.x);
    mb.detail = { notches, cut: extCut(ph), ...(ridge ? { pointedSide: ph - 6 } : {}) };
  }
  // tükkide detailid (sälgud, otsalõiked, pilud, ukse vajumisvaru)
  const specById = new Map(result.wallModel.map((s) => [s.id, s]));
  for (const w of walls) {
    const spec = specById.get(w.id);
    if (spec) w.details = pieceDetails(spec, w.pieces, t, input.log.height, w.notches.map((n) => n.pts));
  }
  return { walls, roofs, members, bounds: { x0: bx0 - ov, y0: by0 - ov, z0: 0, x1: bx1 + ov, y1: by1 + ov, z1: zMax } };
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
): [number, number, boolean, boolean] {
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
      freeEnd[sgn < 0 ? 0 : 1] = true;
      const logEnd = at + sgn * (t / 2 + c.cornerOverhang);
      if (!free) return logEnd;
      return sgn < 0 ? Math.min(logEnd, free[0]) : Math.max(logEnd, free[1]);
    }
    const o = vols[host]!;
    const edgeDir = v.ridge === 'y' ? 'x' : 'y';
    // teise mahu räästas -> hari jõuab teise katusepinnani pool laiust edasi; viil -> seina välispind
    return o.ridge === edgeDir ? at + sgn * (across / 2) : at - sgn * (t / 2);
  };
  const freeEnd: [boolean, boolean] = [false, false];
  const a = ext(lo0, -1);
  const b = ext(hi0, 1);
  return [a, b, freeEnd[0], freeEnd[1]];
}

export type { WallGeometry };
