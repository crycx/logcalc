/**
 * Veranda postid, käsipuud ja U-profiilid (Revit Kolding 40: Floor Plan, Roof 1, Details 5).
 *
 * - Post (CM): veranda nurgas, reguleeritava postijala (45) peal, mis seisab ristuva seina käsipuul. Iga nurgas
 *   kohtuva seina kohta üks 40x70 tükk otse selle seina palgi alla: ristuva seina tükk sõlmes (selle seina joonel),
 *   piirde seina tükk kõrval palgi otsa pool (kokku 80 piki piirde seina, 70 risti). Kolding CM1 1233 (esiseina LG4
 *   all), CM2 1176 (külgseina LG9 all).
 * - Käsipuu (Handrail): piirde peal lapiti 40x143 (otsad faasitud 20 × 20). Nurgas jookseb ristuva seina käsipuu läbi
 *   (Kolding A/B 1945: seinast kuni 45 üle palgi otsa); posti seina käsipuu katkeb selle kohal – väljapoole jääb
 *   lühike tükk (Kolding 105), sissepoole pikk (1040). Otsad ulatuvad palgi otsast / vabast otsast üle, seina vastu
 *   tasa.
 * - U-profiil 40x76 (625): piirde vabas otsas (ava kõrval) palgiotsad U sees püsti.
 */
import type { HousePlan, WallGeometry } from './plan.js';
import type { WallSpec } from './wall-model.js';
import { wallPieces } from './wall-model.js';

export const VERANDA = {
  /** posti tükk: paksus = palgi paksus, laius 70 */
  postWidth: 70,
  /** reguleeritav postijalg */
  foot: 45,
  /** vajumisvaru posti ja palgi vahel, kui käsipuud pole (käsipuuga seisab post käsipuul, jalg reguleeritav) */
  settle: 40,
  /** käsipuu ristlõige (laius lapiti, paksus) */
  handrailWidth: 143,
  handrailThickness: 40,
  /** läbiva käsipuu ots üle palgi otsa / vaba otsa (Kolding A 1945) */
  handrailOver: 45,
  /** nurgas katkestatud käsipuu otsad üle (Revit Kolding plaanilt ~54: lühike 105, pikk 1040) */
  handrailOverSplit: 54,
  /** U-profiil: laius risti seinaga, sügavus piki seina (seljaosa 18 + palgi ots 22 sees), pikkus */
  uWidth: 76,
  uDepth: 40,
  uBack: 18,
  uLength: 625,
} as const;

export interface VerandaPost {
  /** nurgasõlm plaanil */
  node: string;
  /** sõlme koht plaanil */
  x: number;
  y: number;
  /** piirde sein, mille otsas post on */
  wall: string;
  /** ühikvektor piki piirde seina palgi otsa poole (piirdest eemale) */
  out: { x: number; y: number };
  /** postijala pealispind (tükkide alumine ots) */
  z0: number;
  /** tükid: iga nurgas kohtuva seina kohta (selle seina palgi alla) */
  pieces: { wall: string; length: number; u: { x: number; y: number } }[];
}

export interface VerandaHandrail {
  wall: string;
  /** seina koordinaadid piki seina */
  x0: number;
  x1: number;
  /** alumine pind (piirde pealt) */
  z: number;
}

export interface VerandaUProfile {
  wall: string;
  /** palgiotsa koht seinal (seina koordinaat) */
  x: number;
  /** suund piki seina, kuhu poole on ava (+1 / −1): U selg sinnapoole */
  dir: 1 | -1;
  z0: number;
  z1: number;
}

export interface VerandaResult {
  posts: VerandaPost[];
  handrails: VerandaHandrail[];
  uProfiles: VerandaUProfile[];
}

export function computeVeranda(plan: HousePlan, geo: WallGeometry[], wallModel: WallSpec[], t: number, maxLogLength: number): VerandaResult {
  const V = VERANDA;
  const gById = new Map(geo.map((g) => [g.id, g]));
  const specById = new Map(wallModel.map((s) => [s.id, s]));
  const toWall = (g: WallGeometry, px: number, py: number) => {
    const ux = (g.b.x - g.a.x) / g.span;
    const uy = (g.b.y - g.a.y) / g.span;
    return (px - g.a.x) * ux + (py - g.a.y) * uy + g.startExt;
  };
  const unit = (g: WallGeometry) => ({ x: (g.b.x - g.a.x) / g.span, y: (g.b.y - g.a.y) / g.span });
  /** piirde lahtine osa (selle alumine serv = piirde palkide pealt, + kate) */
  const railVoid = (spec: WallSpec, x0: number, x1: number) => {
    const vs = (spec.voids ?? []).filter((v) => v.kind === 'open' && !v.stepEnd && !v.railing && v.y0 > 1 && v.x0 < x1 - 1 && v.x1 > x0 + 1);
    return vs.length ? vs.reduce((a, b) => (b.y0 < a.y0 ? b : a)) : null;
  };
  const railTop = (spec: WallSpec, x0: number, x1: number) => {
    const v = railVoid(spec, x0, x1);
    return v ? v.y0 + (v.cap ?? 0) : null;
  };
  /** piirde ots: 'log' palgi otsas, 'wall' seina vastu (sein jätkub täiskõrgusena), 'free' ava kõrval */
  const endKind = (spec: WallSpec, x: number, dir: 1 | -1, z: number): 'log' | 'wall' | 'free' => {
    if (Math.abs(x) < 1 || Math.abs(x - spec.length) < 1) return 'log';
    const probe = x + dir * 2;
    const open = (spec.voids ?? []).some((v) => v.kind === 'open' && !v.railing && v.x0 < probe && v.x1 > probe && v.y0 < z + 10 && v.y1 > z + 10);
    return open ? 'free' : 'wall';
  };
  /** nurgasõlm, kus seinad g ja og kohtuvad (og läbib sõlme) */
  const crossesAt = (og: WallGeometry, n: { x: number; y: number }) => {
    const at = (p: { x: number; y: number }) => Math.abs(p.x - n.x) < 0.5 && Math.abs(p.y - n.y) < 0.5;
    const lo = og.dir === 'x' ? Math.min(og.a.x, og.b.x) : Math.min(og.a.y, og.b.y);
    const hi = og.dir === 'x' ? Math.max(og.a.x, og.b.x) : Math.max(og.a.y, og.b.y);
    const along = og.dir === 'x' ? n.x : n.y;
    const line = og.dir === 'x' ? Math.abs(og.a.y - n.y) < 0.5 : Math.abs(og.a.x - n.x) < 0.5;
    return at(og.a) || at(og.b) || (line && along > lo - 0.5 && along < hi + 0.5);
  };

  const posts: VerandaPost[] = [];
  const handrails: VerandaHandrail[] = [];
  const uProfiles: VerandaUProfile[] = [];
  /** käsipuu katkestused seina kaupa (seina koordinaatides) */
  const cuts = new Map<string, [number, number][]>();

  for (const w of plan.walls) {
    const g = gById.get(w.id);
    const spec = specById.get(w.id);
    if (!g || !spec) continue;
    for (const r of w.railings ?? []) {
      for (const end of r.post === 'both' ? (['start', 'end'] as const) : r.post ? [r.post] : []) {
        // lähim seina otsa sõlm piirde vastavas otsas
        const xr = end === 'start' ? r.x0 : r.x1;
        const cand = [g.a, g.b].map((n) => ({ n, X: toWall(g, n.x, n.y) })).sort((p, q) => Math.abs(p.X - xr) - Math.abs(q.X - xr))[0]!;
        const nodeId = plan.nodes.find((n) => Math.abs(n.x - cand.n.x) < 0.5 && Math.abs(n.y - cand.n.y) < 0.5)?.id ?? '';
        if (posts.some((p) => p.node === nodeId)) continue;
        const rt = railTop(spec, r.x0, r.x1);
        if (rt === null) continue;
        const onRail = !!r.handrail;
        const z0 = rt + (onRail ? V.handrailThickness : 0) + V.foot;
        const gap = onRail ? 0 : V.settle;
        // nurgas kohtuvad seinad: iga seina palk sõlme kohal pärast z0 -> tüki pikkus
        const pieces: VerandaPost['pieces'] = [];
        for (const og of geo) {
          if (!crossesAt(og, cand.n)) continue;
          const os = specById.get(og.id);
          if (!os) continue;
          const X = toWall(og, cand.n.x, cand.n.y);
          const above = wallPieces(os, { maxLogLength })
            .filter((p) => p.x0 < X && p.x1 > X && p.y0 > z0 + 1)
            .map((p) => p.y0);
          if (!above.length) continue;
          const len = Math.min(...above) - z0 - gap;
          if (len > 100) pieces.push({ wall: og.id, length: Math.round(len), u: unit(og) });
          // ristuv sein: selle käsipuu jookseb sõlmest läbi, piirde seina käsipuu katkeb selle laiuses
          if (og.id !== w.id && onRail) {
            const hasRail = plan.walls.find((x) => x.id === og.id)?.railings?.some((rr) => rr.handrail && rr.x0 < X + 1 && rr.x1 > X - 1);
            if (hasRail) cuts.set(w.id, [...(cuts.get(w.id) ?? []), [cand.X - V.handrailWidth / 2, cand.X + V.handrailWidth / 2]]);
          }
        }
        if (!pieces.length) continue;
        const u = unit(g);
        const into = end === 'start' ? 1 : -1;
        posts.push({ node: nodeId, x: cand.n.x, y: cand.n.y, wall: w.id, out: { x: -u.x * into + 0, y: -u.y * into + 0 }, z0, pieces });
        // käsipuuta: käsipuu (kui hiljem lisatakse) katkeb posti kohal (post 80 piki seina sõlmest palgi otsa poole)
        if (!onRail) cuts.set(w.id, [...(cuts.get(w.id) ?? []), into > 0 ? [cand.X - 1.5 * t, cand.X + 0.5 * t] : [cand.X - 0.5 * t, cand.X + 1.5 * t]]);
      }
    }
  }
  // käsipuud ja U-profiilid
  for (const w of plan.walls) {
    const spec = specById.get(w.id);
    if (!spec) continue;
    for (const r of w.railings ?? []) {
      const v = railVoid(spec, r.x0, r.x1);
      if (!v) continue;
      const z = v.y0 + (v.cap ?? 0);
      const k0 = endKind(spec, r.x0, -1, z);
      const k1 = endKind(spec, r.x1, 1, z);
      // U-profiil vabas otsas: palgiotsad (piirde palkide pealt v.y0) U sees
      for (const [k, x, dir] of [[k0, r.x0, -1], [k1, r.x1, 1]] as const) {
        if (k === 'free') uProfiles.push({ wall: w.id, x, dir, z0: Math.max(0, v.y0 - V.uLength), z1: v.y0 });
      }
      if (!r.handrail) continue;
      const myCuts = (cuts.get(w.id) ?? []).filter(([a, b]) => b > r.x0 - 100 && a < r.x1 + 100);
      const over = myCuts.length ? V.handrailOverSplit : V.handrailOver;
      const a = k0 === 'wall' ? r.x0 : r.x0 - over;
      const b = k1 === 'wall' ? r.x1 : r.x1 + over;
      let segs: [number, number][] = [[a, b]];
      for (const [p0, p1] of myCuts) {
        segs = segs.flatMap(([s, e]): [number, number][] => (p1 <= s || p0 >= e ? [[s, e]] : [...(p0 - s > 1 ? [[s, p0] as [number, number]] : []), ...(e - p1 > 1 ? [[p1, e] as [number, number]] : [])]));
      }
      for (const [s, e] of segs) handrails.push({ wall: w.id, x0: s, x1: e, z });
    }
  }
  return { posts, handrails, uProfiles };
}
