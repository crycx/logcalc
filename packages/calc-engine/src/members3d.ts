/**
 * Muu puit 3D mudelis (WALL-GRAPH.md, etapp 5): vundamendi prussid ja ring, põranda- ja terrassilauad,
 * katuselauad, pärlinid, toe- ja räästalauad, tuuleliistud. Iga tükk = orienteeritud kast tähisega
 * (`materials.ts` – sama mis lõikenimekirjas), et lõikenimekirjast valitud tükki saaks esile tõsta.
 *
 * Asukohad: prussid ja põrand mootori plaanikastidest (plaanita majal ristküliku plaanist), katus
 * katusepindadest (`RoofPlane3D`), pärlinid horisontaalse vahega (Revit, D10), räästalauad vabades
 * viiluotstes, tuuleliistud toas viiluseinal (Viktra paigaldusjoonis). Profiilid (paksus) on kuvamiseks; kus sisendis pole, kasutatakse tüüpilisi.
 */
import { planFloor, planFoundation } from './floor-plan.js';
import { materialMark } from './materials.js';
import type { RoofPlane3D, Vec3, Wall3D } from './model3d.js';
import type { HousePlan, WallGeometry } from './plan.js';
import { planGrid, solidBelow } from './plan-regions.js';
import { WINDBOARD } from './windboards.js';
import type { CalcResult, EngineConstants, HouseInput, PlanBox, PurlinsResult, RoofResult } from './types.js';

export type MemberLayer = 'foundation' | 'floor' | 'roof' | 'trim' | 'cover';

export interface Member3D {
  /** materjali võti (hinnakiri), nt 'katuseLauad' */
  key: string;
  /** tähis lõikenimekirjast, nt "K-1" ('' kui pole) */
  mark: string;
  layer: MemberLayer;
  /** keskpunkt (x, y, z üles) */
  c: Vec3;
  /** pikkuse suund ja laiuse suund (ühikvektorid); paksus = u × v */
  u: Vec3;
  v: Vec3;
  /** pikkus, laius, paksus (mm) */
  size: Vec3;
}

/** kuvamiseks: katuse- ja põrandalaua paksus, tuuleliistu ristlõige, pärlin (kui sisendis pole) */
/** Revit: katuselaud RB 17x114 */
const ROOF_BOARD_T = 17;
/** katusepapp (Revit „Roofing sheet“ – kogust pole) */
const PAPER_T = 3;
/** katusepapp ulatub 5 cm üle katuse serva (RF-i / räästalaua välispinna) */
const PAPER_OVER = 50;
/** Revit: põrandalaud FB 17x114, terrassilaud 28x120 */
const FLOOR_BOARD_T = WINDBOARD.floorTop;
const TERRACE_BOARD_T = 28;
/** Revit: pärlin RFB / hari RFR 40x143 */
const PURLIN_DEFAULT: [number, number] = [40, 143];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => mul(a, 1 / (len(a) || 1));
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sum = (...v: Vec3[]): Vec3 => v.reduce(add, [0, 0, 0]);

/** "18x120" -> [18, 120] (paksus, laius) */
function profile(s: string | undefined, fallback: [number, number]): [number, number] {
  const m = /(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/.exec(s ?? '');
  if (!m) return fallback;
  const a = Number(m[1]!.replace(',', '.'));
  const b = Number(m[2]!.replace(',', '.'));
  return [Math.min(a, b), Math.max(a, b)];
}

export function buildMembers(
  input: HouseInput,
  result: CalcResult,
  c: EngineConstants,
  ctx: { plan: HousePlan; geo: WallGeometry[]; walls: Wall3D[]; roofs: RoofPlane3D[]; roofZ: (x: number, y: number) => number | null },
): Member3D[] {
  const out: Member3D[] = [];
  const mark = (key: string, length: number) => materialMark(result.materials, key, length);
  const t = input.log.thickness;
  const X: Vec3 = [1, 0, 0];
  const Y: Vec3 = [0, 1, 0];
  const Z: Vec3 = [0, 0, 1];

  /** plaanikast kõrgusvahemikus z0..z1: pikkus pikema külje suunas */
  const planBox = (b: PlanBox, z0: number, z1: number, key: string, layer: MemberLayer, nominal: number) => {
    const dx = b.x1 - b.x0;
    const dy = b.y1 - b.y0;
    const alongX = dx >= dy;
    out.push({
      key,
      mark: mark(key, nominal),
      layer,
      c: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (z0 + z1) / 2],
      u: alongX ? X : Y,
      v: alongX ? Y : X,
      size: [alongX ? dx : dy, alongX ? dy : dx, z1 - z0],
    });
  };

  // ---- vundament: prussid ja ring (plaanita majal ristküliku plaanist – sama tulemus)
  if (result.foundation && input.foundation) {
    const bays = result.foundation.bays ?? planFoundation(input, ctx.plan, ctx.geo, c, [], planGrid(ctx.plan, ctx.geo, solidBelow))?.bays ?? [];
    const jh = input.foundation.joistHeight;
    for (const b of bays) {
      for (const j of b.joists) planBox(j, -jh, 0, 'vundament', 'foundation', b.joistLength);
      for (const r of b.ring) planBox(r, -jh, 0, 'vundament', 'foundation', b.ringPieces?.length ?? Math.max(r.x1 - r.x0, r.y1 - r.y0));
    }
  }

  // ---- põrand ja terrass: lauad ruumide ristkülikutes
  if (result.floor && input.floor) {
    const parts = result.floor.parts ?? planFloor(input, ctx.plan, ctx.geo, c)?.parts ?? [];
    for (const p of parts) {
      const key = p.open ? 'terrassiLauad' : 'porandaLauad';
      const alongX = p.along === 'x';
      const across0 = alongX ? p.box.y0 : p.box.x0;
      const across1 = alongX ? p.box.y1 : p.box.x1;
      const mid = alongX ? (p.box.x0 + p.box.x1) / 2 : (p.box.y0 + p.box.y1) / 2;
      const n = Math.max(1, Math.round(p.boardCount));
      const pitch = (across1 - across0) / n;
      const bw = Math.max(1, Math.min(p.boardWidth, pitch) - (p.open ? 0 : 1));
      const m = mark(key, p.boardLength);
      const bt = p.open ? TERRACE_BOARD_T : FLOOR_BOARD_T;
      for (let i = 0; i < n; i++) {
        const a = across0 + pitch * (i + 0.5);
        out.push({
          key,
          mark: m,
          layer: 'floor',
          c: alongX ? [mid, a, bt / 2] : [a, mid, bt / 2],
          u: alongX ? X : Y,
          v: alongX ? Y : X,
          size: [p.boardLength, bw, bt],
        });
      }
    }
  }

  // ---- katus: katuselauad, pärlinid, toe- ja räästalauad katusepindade kaupa
  const gable = input.roofType === 'gable';
  const ov = result.roof?.computedOverhang ?? input.roof?.overhang ?? c.defaultRoofOverhang;
  const roofOf = (k: number): RoofResult | null => (k === 0 ? result.roof : (result.roof?.parts?.[k - 1] ?? null));
  const purlinsOf = (k: number): PurlinsResult | null => (k === 0 ? result.purlins : (result.purlins?.parts?.[k - 1] ?? null));
  const pf = input.roof?.profiles ?? {};
  // profiilid materjalide nimekirjast (sama mis lõikenimekirjas; EE sõltub palgi paksusest)
  const bomProfile = (key: string) => result.bom.find((l) => l.key === key)?.profile;
  const [ft, fw] = profile(pf.fasciaBoard ?? bomProfile('esiraastalaud'), [18, 120]);
  const [et, ew] = profile(pf.feltBoard ?? bomProfile('papikinnituslaud'), [18, 95]);
  const [st] = profile(pf.supportSmall ?? bomProfile('toelaud38'), [38, 38]);
  const [lt, lw] = profile(pf.supportLarge ?? bomProfile('toelaud95'), [18, 95]);
  const [pw, ph] = input.purlins?.width && input.purlins?.height ? [input.purlins.width, input.purlins.height] : PURLIN_DEFAULT;
  const ridgeDone = new Set<number>();

  for (const r of ctx.roofs) {
    const rr = roofOf(r.part);
    const pr = purlinsOf(r.part);
    const [p0, p1, , p3] = r.pts;
    const A = sub(p1, p0);
    const S = sub(p3, p0);
    const la = len(A);
    const ls = len(S);
    if (la < 1 || ls < 1) continue;
    const a = unit(A);
    const s = unit(S);
    let n = unit(cross(a, s));
    if (n[2] < 0) n = mul(n, -1);
    // horisontaalne komponent piki kallet (pärlinite horisontaalne vahe)
    const sh = Math.hypot(s[0], s[1]) || 1;
    const sHor = unit([s[0], s[1], 0]);
    const at = (along: number, slope: number, normal: number): Vec3 => sum(p0, mul(a, along), mul(s, slope), mul(n, normal));

    // ühe vaba otsaga osa (tiib orus): lauad vabast viiluotsast oru poole; mõlemad vabad – keskel
    const fromLo = r.freeEnds[0] && !r.freeEnds[1];
    const fromHi = !r.freeEnds[0] && r.freeEnds[1];
    const alongFromFree = (d: number) => (fromHi ? la - d : d);
    /**
     * Laua nähtav osa kaldpinnal [s0, s1] (räästast): orus on tiiva laua alumine osa põhikatuse all –
     * nähtav orujoonest harjani; null = kogu laud teise katuse all
     */
    const openSpan = (along: number): [number, number] | null => {
      const covered = (sl: number) => {
        const p = at(along, sl, 0);
        const z = ctx.roofZ(p[0], p[1]);
        return z !== null && z > p[2] + 3;
      };
      const edge = (from: number, to: number) => {
        // üleminek kaetust katmata (või vastupidi) – poolitamine
        let lo = from;
        let hi = to;
        const c0 = covered(from);
        for (let k = 0; k < 24; k++) {
          const mid = (lo + hi) / 2;
          if (covered(mid) === c0) lo = mid;
          else hi = mid;
        }
        return (lo + hi) / 2;
      };
      const bottom = covered(1);
      const top = covered(ls - 1);
      if (!bottom && !top) return [0, ls];
      if (bottom && top) return null;
      return bottom ? [edge(1, ls - 1), ls] : [0, edge(1, ls - 1)];
    };

    if (rr) {
      // katuselauad: räästast harjani, kõrvuti piki räästast; tiival vabast otsast 110 sammuga, orus lõigatud
      // teise katuse alla (oru lauad = põhiosa laudade jäägid, Revit – eraldi tähiseta)
      const nb = Math.max(1, Math.round(gable ? rr.boardCount / 2 : rr.boardCount));
      const oneSided = fromLo || fromHi;
      const pitch = oneSided ? c.roofBoardWidth : la / nb;
      const total = oneSided ? Math.max(nb, Math.floor(la / pitch + 1e-9)) : nb;
      const bw = Math.max(1, Math.min(c.roofBoardWidth, pitch) - 1);
      const m = mark('katuseLauad', rr.boardLength);
      for (let i = 0; i < total; i++) {
        const along = alongFromFree(pitch * (i + 0.5));
        const span = openSpan(along);
        if (!span || span[1] - span[0] < 30) continue;
        const L = span[1] - span[0];
        const own = i < nb;
        out.push({ key: own ? 'katuseLauad' : 'katuseLauadOrg', mark: own ? m : '', layer: 'roof', c: at(along, (span[0] + span[1]) / 2, ROOF_BOARD_T / 2), u: s, v: a, size: [L, bw, ROOF_BOARD_T] });
      }
      // vabad viiluotsad (Revit „Roof 2“ detail Facia): esiräästalaud RF püsti laudade otsas (ülemine serv laudadega
      // tasa, ulatub alla), papikinnituslaud EE katusepapi peal, välispind RF-iga tasa. Pikkus = laud + 38:
      // viilkatusel harjast räästa poole (katab räästa RR1 otsa), ühekaldel mõlemast otsast võrdselt
      const eb = rr.edgeBoards;
      const edgeAt = (L: number) => (r.eaves.length > 1 ? ls / 2 : ls - L / 2);
      r.freeEnds.forEach((free, e) => {
        if (!free) return;
        const out1 = e === 0 ? -1 : 1;
        const face = e === 0 ? 0 : la;
        if (eb.fascia.count > 0) {
          const L = eb.fascia.pieceLength;
          out.push({ key: 'esiraastalaud', mark: mark('esiraastalaud', L), layer: 'roof', c: at(face + (out1 * ft) / 2, edgeAt(L), ROOF_BOARD_T - fw / 2), u: s, v: n, size: [L, fw, ft] });
        }
        if (eb.felt.count > 0) {
          const L = eb.felt.pieceLength;
          const outer = face + out1 * (eb.fascia.count > 0 ? ft : 0);
          out.push({ key: 'papikinnituslaud', mark: mark('papikinnituslaud', L), layer: 'roof', c: at(outer - (out1 * ew) / 2, edgeAt(L), ROOF_BOARD_T + PAPER_T + et / 2), u: s, v: a, size: [L, ew, et] });
        }
      });
      // katusepapp laudade peal, katusega samas tasapinnas; ulatub üle RF-i ja räästalaua otsa PAPER_OVER võrra
      // (Revit „Roof 2“ detail Facia – alla ei keerata, EE kinnitab peal)
      {
        const eaveOut = eb.supportLarge.count > 0 ? lt : eb.fasciaEave?.count ? ft : 0;
        const ext0 = r.freeEnds[0] ? (eb.fascia.count > 0 ? ft : 0) + PAPER_OVER : 0;
        const ext1 = r.freeEnds[1] ? (eb.fascia.count > 0 ? ft : 0) + PAPER_OVER : 0;
        const e0 = r.eaves.includes(0) ? eaveOut + PAPER_OVER : 0;
        const e1 = r.eaves.includes(1) ? eaveOut + PAPER_OVER : 0;
        out.push({
          key: 'katusepapp',
          mark: '',
          layer: 'cover',
          c: at((la + ext1 - ext0) / 2, (ls + e1 - e0) / 2, ROOF_BOARD_T + PAPER_T / 2),
          u: s,
          v: a,
          size: [ls + e0 + e1, la + ext0 + ext1, PAPER_T],
        });
      }
      // räästas: toelaud laudade all ja suurem toelaud räästa otsas
      for (const e of r.eaves) {
        const edge = e === 0 ? 0 : ls;
        const inward = e === 0 ? 1 : -1;
        // tiival vabast otsast (oru poole kuni teise mahu räästani), muidu keskel
        const eaveAt = (L: number) => (fromLo ? L / 2 : fromHi ? la - L / 2 : la / 2);
        const eaveLen = (L: number) => (fromLo || fromHi ? Math.min(la, L) : la);
        if (eb.supportSmall.count > 0) {
          const L = eb.supportSmall.pieceLength;
          out.push({ key: 'toelaud38', mark: mark('toelaud38', L), layer: 'roof', c: at(eaveAt(eaveLen(L)), edge + (inward * st) / 2, -st / 2), u: a, v: s, size: [eaveLen(L), st, st] });
        }
        if (eb.supportLarge.count > 0) {
          const L = eb.supportLarge.pieceLength;
          out.push({ key: 'toelaud95', mark: mark('toelaud95', L), layer: 'roof', c: at(eaveAt(eaveLen(L)), edge - (inward * lt) / 2, ROOF_BOARD_T - lw / 2), u: a, v: n, size: [eaveLen(L), lw, lt] });
        }
        // ühekalle: esiräästalaud räästas (laudade otsas püsti)
        if (eb.fasciaEave && eb.fasciaEave.count > 0) {
          const L = eb.fasciaEave.pieceLength;
          out.push({ key: 'esiraastalaud', mark: mark('esiraastalaud', L), layer: 'roof', c: at(la / 2, edge - (inward * ft) / 2, ROOF_BOARD_T - fw / 2), u: a, v: n, size: [Math.max(la, L), fw, ft] });
        }
      }
    }

    if (pr && pr.pieces > 0) {
      // pärlinid piki räästast, ülemine serv katuse alumisel pinnal; vaba ots (viil) joondub katuse otsaga
      const L = pr.length;
      const startAlong = r.freeEnds[0] && !r.freeEnds[1] ? 0 : !r.freeEnds[0] && r.freeEnds[1] ? la - L : (la - L) / 2;
      const m = mark('parlinid', L);
      // pärlin kaldu (ülemine pind katuse alumisel pinnal, Revit „Roof“ / viilupalkide sälgud kaldu);
      // harjapärlin püsti
      const place = (slope: number, ridge = false) => {
        const top = at(startAlong + L / 2, slope, 0);
        if (ridge) out.push({ key: 'parlinid', mark: m, layer: 'roof', c: sub(top, mul(Z, ph / 2)), u: a, v: sHor, size: [L, pw, ph] });
        else out.push({ key: 'parlinid', mark: m, layer: 'roof', c: sub(top, mul(n, ph / 2)), u: a, v: s, size: [L, pw, ph] });
      };
      // räästa serv on seina kesktelljest (t/2 + üleulatus) väljas; pärlinid seina siseservast spacing kaupa
      const spacing = pr.spacing ?? 0;
      for (let i = 1; i <= pr.perSide && spacing > 0; i++) {
        const hor = t / 2 + ov + t / 2 + i * spacing;
        const slope = hor / sh;
        if (slope < ls - 1) place(slope);
      }
      if (gable && pr.hasRidge && !ridgeDone.has(r.part)) {
        ridgeDone.add(r.part);
        place(ls, true);
      }
    }
  }

  // ---- tuuleliistud: toas viiluseinal, 200 mm nurgast, 40 mm põrandast, lõigatud katuse alla (windboards.ts)
  const wById = new Map(ctx.walls.map((w) => [w.id, w]));
  for (const wb of result.windboards ?? []) {
    const w = wById.get(wb.wall);
    if (!w) continue;
    const u: Vec3 = [w.u.x, w.u.y, 0];
    // sisemine pool plaani teljel risti seinaga (x-seinal y, y-seinal x)
    const inward: Vec3 = w.dir === 'x' ? [0, wb.side, 0] : [wb.side, 0, 0];
    const base: Vec3 = [w.origin.x + w.u.x * wb.x, w.origin.y + w.u.y * wb.x, 0];
    out.push({
      key: 'tuuleLiist',
      mark: mark('tuuleLiist', wb.cut),
      layer: 'trim',
      c: sum(base, mul(inward, t / 2 + WINDBOARD.thickness / 2), mul(Z, (wb.z0 + wb.z1) / 2)),
      u: Z,
      v: u,
      size: [wb.cut, WINDBOARD.width, WINDBOARD.thickness],
    });
  }
  return out;
}
