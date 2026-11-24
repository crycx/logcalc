/**
 * Plaanimallid (plaanieditori „Alusta mallist“). Mõõdud = palgi pikkused (W laius, D sügavus),
 * sõlmed palgi kesktelgedel. Mallid järgivad Viktra Revit-maju (vt WALL-GRAPH.md).
 */
import { rectanglePlan, type HousePlan, type PlanWall } from './plan.js';
import type { EngineConstants } from './types.js';

export type PlanTemplateKind = 'rect' | 'partition' | 'garage' | 'porch' | 'terrace' | 'lshape';

export interface PlanTemplateInfo {
  kind: PlanTemplateKind;
  name: string;
  description: string;
}

export const PLAN_TEMPLATES: PlanTemplateInfo[] = [
  { kind: 'rect', name: 'Ristkülik', description: '4 seina: esisein 1, tagasein 2, küljed A ja B' },
  { kind: 'partition', name: 'Vaheseinaga', description: 'Kaks ruumi: vahesein C esi- ja tagaseina vahel (T-liited)' },
  { kind: 'garage', name: 'Garaaž / keskviil', description: 'Keskel ainult viil ja tõmbepalk (nagu Nora); garaažiuks lisa seinale 1' },
  { kind: 'porch', name: 'Lahtine veranda', description: 'Ees eesviil postideta, külgede ülemised 3 rida ulatuvad ette (nagu Boden)' },
  { kind: 'terrace', name: 'Terrass piirdega', description: 'Ees terrassi raam: piire, nurgapostid, sissepääs; ruumi esisein viiluga (nagu Lund)' },
  { kind: 'lshape', name: 'L-kuju', description: '6 seina, sisenurgaga (katus arvestab veel ümbritsevat ristkülikut)' },
];

export interface PlanTemplateOptions {
  /** veranda sügavus (seina 1 ja 2 kesktelgede vahe), vaikimisi 1000 */
  porchDepth?: number;
  /** terrassi sügavus (kesktelgede vahe), vaikimisi 2350 */
  terraceDepth?: number;
  /** terrassi sissepääsu laius, vaikimisi 1600 */
  entrance?: number;
  /** piirde ridade arv (koos poole palgiga), vaikimisi 7 */
  railingRows?: number;
}

export function planTemplate(
  kind: PlanTemplateKind,
  W: number,
  D: number,
  thickness: number,
  c: Pick<EngineConstants, 'cornerOverhang'>,
  o: PlanTemplateOptions = {},
): HousePlan {
  const j = c.cornerOverhang + thickness / 2; // kesktelg palgi otsast
  /** x-seinad antud y-del (tagant ette), A/B tagumisest eesmisse */
  const cross = (xs: { id: string; y: number; extra?: Partial<PlanWall> }[]): HousePlan => {
    const nodes: HousePlan['nodes'] = [];
    const walls: PlanWall[] = [];
    xs.forEach((w, i) => {
      nodes.push({ id: `n${2 * i + 1}`, x: j, y: w.y }, { id: `n${2 * i + 2}`, x: W - j, y: w.y });
      walls.push({ ...w.extra, id: w.id, a: `n${2 * i + 1}`, b: `n${2 * i + 2}` });
    });
    const last = xs.length - 1;
    walls.push({ id: 'A', a: 'n1', b: `n${2 * last + 1}` }, { id: 'B', a: 'n2', b: `n${2 * last + 2}` });
    return { nodes, walls };
  };
  const side = (plan: HousePlan, extra: Partial<PlanWall>): HousePlan => ({
    ...plan,
    walls: plan.walls.map((w) => (w.id === 'A' || w.id === 'B' ? { ...w, ...extra } : w)),
  });

  switch (kind) {
    case 'rect':
      return rectanglePlan(W, D, thickness, c);

    case 'partition': {
      const p = rectanglePlan(W, D, thickness, c);
      const x = Math.round(W / 2);
      return {
        nodes: [...p.nodes, { id: 'n5', x, y: j }, { id: 'n6', x, y: D - j }],
        walls: [...p.walls, { id: 'C', a: 'n5', b: 'n6' }],
      };
    }

    case 'garage':
      return cross([
        { id: '3', y: j },
        { id: '2', y: Math.round(D / 2), extra: { topOnly: 1, gable: true } },
        { id: '1', y: D - j },
      ]);

    case 'porch': {
      const P = o.porchDepth ?? 1000;
      const y2 = D - j - P;
      // külgseinte alumised read ainult ruumi kohal: seinast 2 + üleulatus kuni eesotsani
      return side(
        cross([
          { id: '3', y: j },
          { id: '2', y: y2 },
          { id: '1', y: D - j, extra: { topOnly: 1 } },
        ]),
        { open: [{ x0: y2 + j, x1: D, topRows: 3 }] },
      );
    }

    case 'terrace': {
      const T = o.terraceDepth ?? 2350;
      const rows = o.railingRows ?? 7;
      const e = Math.min(o.entrance ?? 1600, W - 2 * 600);
      const y2 = D - j - T;
      const post = 300;
      const e0 = Math.round((W - e) / 2);
      const e1 = e0 + e;
      const s0 = y2 + j; // külgseina terrassi osa algus (ruumi palk lõpeb 100 üle seina 2)
      const mid = Math.round((s0 + D - post) / 2 - post / 2);
      const plan = cross([
        { id: '3', y: j },
        { id: '2', y: y2, extra: { gable: true } },
        {
          id: '1',
          y: D - j,
          extra: {
            open: [
              { x0: post, x1: W - post, bottomRows: rows, topRows: 2 },
              { x0: e0, x1: e1, topRows: 2 },
            ],
            railings: [
              { x0: 0, x1: e0, rows, spacers: [0, e0 - post] },
              { x0: e1, x1: W, rows, spacers: [e1, W - post] },
            ],
          },
        },
      ]);
      return side(plan, {
        open: [{ x0: s0, x1: D - post, bottomRows: rows, topRows: 2 }],
        railings: [{ x0: s0, x1: D, rows, spacers: [mid, D - post] }],
      });
    }

    case 'lshape': {
      // parem-alumine nurk puudub: laius W, sügavus D, sisenurk poole peal
      const xm = Math.round(W / 2);
      const ym = Math.round(D / 2);
      return {
        nodes: [
          { id: 'n1', x: j, y: j },
          { id: 'n2', x: W - j, y: j },
          { id: 'n3', x: W - j, y: ym },
          { id: 'n4', x: xm, y: ym },
          { id: 'n5', x: xm, y: D - j },
          { id: 'n6', x: j, y: D - j },
        ],
        walls: [
          { id: '1', a: 'n6', b: 'n5' },
          { id: '2', a: 'n1', b: 'n2' },
          { id: '3', a: 'n4', b: 'n3' },
          { id: 'A', a: 'n1', b: 'n6' },
          { id: 'B', a: 'n2', b: 'n3' },
          { id: 'C', a: 'n4', b: 'n5' },
        ],
      };
    }
  }
}
