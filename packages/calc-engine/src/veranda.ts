/**
 * Veranda postid ja käsipuud (Revit Kolding 40: Roof 1, Details 5).
 *
 * - Post (CM): veranda nurgas piirde peal, postijalg 45 (reguleeritav). Iga nurgas kohtuva seina kohta üks 40x70
 *   tükk, mis ulatub selle seina palgi alla 40 mm vajumisvaruga: Kolding CM1 1233 (esiseina LG4 all), CM2 1176
 *   (külgseina LG9 all) – 2 × 40 = 80 lai, 70 sügav.
 * - Käsipuu (Handrail): piirde peal lapiti 40x143 (otsad faasitud 20 × 20); piirde vabast otsast (mitte palgi otsast)
 *   45 mm üle; posti kohalt katkestatud (Kolding esisein 1040 + 105, külg 1945).
 */
import type { HousePlan, WallGeometry } from './plan.js';
import type { WallSpec } from './wall-model.js';
import { wallPieces } from './wall-model.js';

export const VERANDA = {
  /** posti tükk: paksus = palgi paksus, laius 70 */
  postWidth: 70,
  /** reguleeritav postijalg */
  foot: 45,
  /** vajumisvaru posti ja palgi vahel */
  settle: 40,
  /** käsipuu ristlõige (laius lapiti, paksus) */
  handrailWidth: 143,
  handrailThickness: 40,
  /** käsipuu ulatub piirde vabast otsast üle */
  handrailOver: 45,
  /** posti nihe nurgasõlmest piirde poole (Revit Kolding: post 105…185 palgi otsast, sõlm 120) */
  postShift: 25,
} as const;

export interface VerandaPost {
  /** nurgasõlm plaanil */
  node: string;
  x: number;
  y: number;
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

export interface VerandaResult {
  posts: VerandaPost[];
  handrails: VerandaHandrail[];
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
  /** piirde pealispind: lahtise osa alumine serv piirde kohal (+ kate) */
  const railTop = (spec: WallSpec, x0: number, x1: number) => {
    const vs = (spec.voids ?? []).filter((v) => v.kind === 'open' && !v.stepEnd && !v.railing && v.y0 > 1 && v.x0 < x1 - 1 && v.x1 > x0 + 1);
    if (!vs.length) return null;
    const v = vs.reduce((a, b) => (b.y0 < a.y0 ? b : a));
    return v.y0 + (v.cap ?? 0);
  };
  const posts: VerandaPost[] = [];
  const handrails: VerandaHandrail[] = [];
  const postAt = new Map<string, number[]>(); // sein -> postide kohad (seina koordinaat)

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
        const z0 = rt + V.foot;
        // nurgas kohtuvad seinad: iga seina palk sõlme kohal pärast z0 -> tüki pikkus
        const pieces: VerandaPost['pieces'] = [];
        for (const og of geo) {
          const atNode = (n: { x: number; y: number }) => Math.abs(n.x - cand.n.x) < 0.5 && Math.abs(n.y - cand.n.y) < 0.5;
          const lo = og.dir === 'x' ? Math.min(og.a.x, og.b.x) : Math.min(og.a.y, og.b.y);
          const hi = og.dir === 'x' ? Math.max(og.a.x, og.b.x) : Math.max(og.a.y, og.b.y);
          const along = og.dir === 'x' ? cand.n.x : cand.n.y;
          const line = og.dir === 'x' ? Math.abs(og.a.y - cand.n.y) < 0.5 : Math.abs(og.a.x - cand.n.x) < 0.5;
          const crosses = atNode(og.a) || atNode(og.b) || (line && along > lo - 0.5 && along < hi + 0.5);
          if (!crosses) continue;
          const os = specById.get(og.id);
          if (!os) continue;
          const X = toWall(og, cand.n.x, cand.n.y);
          const above = wallPieces(os, { maxLogLength })
            .filter((p) => p.x0 < X && p.x1 > X && p.y0 > z0 + 1)
            .map((p) => p.y0);
          if (!above.length) continue;
          const len = Math.min(...above) - z0 - V.settle;
          if (len > 100) pieces.push({ wall: og.id, length: Math.round(len), u: { x: (og.b.x - og.a.x) / og.span, y: (og.b.y - og.a.y) / og.span } });
        }
        if (!pieces.length) continue;
        // post nurgast veidi piirde poole
        const ux = (g.b.x - g.a.x) / g.span;
        const uy = (g.b.y - g.a.y) / g.span;
        const into = end === 'start' ? 1 : -1;
        posts.push({ node: nodeId, x: cand.n.x + ux * V.postShift * into, y: cand.n.y + uy * V.postShift * into, z0, pieces });
        postAt.set(w.id, [...(postAt.get(w.id) ?? []), cand.X + V.postShift * into]);
      }
    }
  }
  // käsipuud
  for (const w of plan.walls) {
    const g = gById.get(w.id);
    const spec = specById.get(w.id);
    if (!g || !spec) continue;
    for (const r of w.railings ?? []) {
      if (!r.handrail) continue;
      const z = railTop(spec, r.x0, r.x1);
      if (z === null) continue;
      // vaba ots (mitte palgi otsas) 45 üle
      let a = r.x0 > 1 ? r.x0 - V.handrailOver : r.x0;
      let b = r.x1 < spec.length - 1 ? r.x1 + V.handrailOver : r.x1;
      a = Math.max(a, -1e9);
      b = Math.min(b, 1e9);
      // posti kohalt katkestatud (post on selle seina piirdel)
      let segs: [number, number][] = [[a, b]];
      for (const px of postAt.get(w.id) ?? []) {
        const p0 = px - t;
        const p1 = px + t;
        segs = segs.flatMap(([s, e]): [number, number][] => (p1 <= s || p0 >= e ? [[s, e]] : [...(p0 - s > 1 ? [[s, p0] as [number, number]] : []), ...(e - p1 > 1 ? [[p1, e] as [number, number]] : [])]));
      }
      for (const [s, e] of segs) handrails.push({ wall: w.id, x0: s, x1: e, z });
    }
  }
  return { posts, handrails };
}
