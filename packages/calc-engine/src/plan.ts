/**
 * Põhiplaan graafina (vt WALL-GRAPH.md).
 *
 * Sõlmed (x, y) mm = palgi KESKTELG. x kulgeb laiuse suunas (plaanil vasakult paremale),
 * y sügavuse suunas (plaanil ülevalt alla: tagasein 2 üleval, esisein 1 all).
 * Seinad on sirged lõigud sõlmede vahel, ainult täisnurgad (x- või y-suunas).
 * Sein võib kulgeda üle vahepealsete sõlmede (nt Lundi sein A läbib seina 2 sõlme) – liited leitakse
 * geomeetriast, mitte topoloogiast.
 */
import type { EngineConstants } from './types.js';
import type { WallId } from './wall-model.js';

export interface PlanNode {
  id: string;
  x: number;
  y: number;
}

export interface PlanWall {
  /** tähis (lõikenimekirja eesliide), nt '1', 'A', 'C' */
  id: WallId;
  /** algus- ja lõppsõlm; seina vaates kulgeb x sõlmest a sõlme b poole */
  a: string;
  b: string;
  /**
   * Ainult N ülemist rida (+ viil, kui sein kannab viilu): keskviil/tõmbepalk (Nora 2: 1),
   * veranda eesviil (Boden 1: 1), lae serv (Boden 3: 2).
   */
  topOnly?: number;
  /** Kas sein kannab viilu. Vaikimisi viilkatusel x-suunas välisseinad (esimene ja viimane). */
  gable?: boolean;
  /** Seina kõrgus (mm), kui erineb maja omast, nt piirde post (Lund AA: 741 = 6½ rida). */
  height?: number;
  /** Lahtised osad (terrass, veranda, sissepääs) seina koordinaatides (mm palgi algusest). */
  open?: OpenSection[];
  /** Piirded: alumised read, iga teine rida vahedega; vahepalgid kindlates kohtades. */
  railings?: Railing[];
}

/** Lahtine osa: kõik read x0..x1 vahel, välja arvatud alumised ja ülemised read. */
export interface OpenSection {
  x0: number;
  x1: number;
  /** alt alles jäävad read (nt piire) */
  bottomRows?: number;
  /** ülalt alles jäävad read (sillus, räästas) */
  topRows?: number;
}

/** Piire: `rows` alumist rida; paaritud read (2., 4., ...) on vahedega, vahepalgid algavad kohtades `spacers`. */
export interface Railing {
  x0: number;
  x1: number;
  rows: number;
  spacers: number[];
  /** vahepalgi pikkus (Viktra: 300) */
  spacerLength?: number;
}

export interface HousePlan {
  nodes: PlanNode[];
  walls: PlanWall[];
  /**
   * Mis suunas seinad algavad poole palgiga (BL): 'x' = laiuse suunas (Nora, Lund, Boden; vaikimisi),
   * 'y' = sügavuse suunas (Gable Sauna 3). Ristuvad seinad algavad täispalgiga.
   */
  halfStart?: 'x' | 'y';
}

/** Seina asend ja palgi geomeetria graafist */
export interface WallGeometry {
  id: WallId;
  /** 'x' = laiuse suunas (algab poole palgiga), 'y' = sügavuse suunas */
  dir: 'x' | 'y';
  a: PlanNode;
  b: PlanNode;
  /** sõlmede vahe (kesktelgede vahel) */
  span: number;
  /** palgi pikendus üle algus-/lõppsõlme (nurk/X-liide: ½ paksust + ülejääk; vaba ots: 0) */
  startExt: number;
  endExt: number;
  /** tavalise palgi pikkus = span + pikendused */
  length: number;
  /** liited seina koordinaatides (palgi algusest) ja ristuva seina tähis */
  joints: { x: number; wall: WallId }[];
}

const EPS = 0.5;

/** Ristkülik: 4 nurka palgi kesktelgedel; seinad 1 (ees, all), 2 (taga, üleval), A (vasak), B (parem). */
export function rectanglePlan(width: number, depth: number, thickness: number, c: Pick<EngineConstants, 'cornerOverhang'>): HousePlan {
  const j = c.cornerOverhang + thickness / 2;
  const nodes: PlanNode[] = [
    { id: 'n1', x: j, y: j },
    { id: 'n2', x: width - j, y: j },
    { id: 'n3', x: width - j, y: depth - j },
    { id: 'n4', x: j, y: depth - j },
  ];
  return {
    nodes,
    walls: [
      { id: '1', a: 'n4', b: 'n3' },
      { id: '2', a: 'n1', b: 'n2' },
      { id: 'A', a: 'n1', b: 'n4' },
      { id: 'B', a: 'n2', b: 'n3' },
    ],
  };
}

/** Kõigi seinte geomeetria: pikkus, otste pikendus, liited. */
export function planGeometry(plan: HousePlan, thickness: number, c: Pick<EngineConstants, 'cornerOverhang'>): WallGeometry[] {
  const byId = new Map(plan.nodes.map((n) => [n.id, n]));
  const node = (id: string): PlanNode => byId.get(id) ?? fail(`Plaanis puudub sõlm ${id}.`);
  const segs = plan.walls.map((w) => {
    const a = node(w.a);
    const b = node(w.b);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) > EPS && Math.abs(dy) > EPS) fail(`Sein ${w.id} ei ole täisnurkne (x- või y-suunas).`);
    const span = Math.hypot(dx, dy);
    if (span < EPS) fail(`Seina ${w.id} algus ja lõpp on samas kohas.`);
    return { w, a, b, dir: (Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y') as 'x' | 'y', span };
  });

  const ext = c.cornerOverhang + thickness / 2;
  return segs.map((s) => {
    const ux = (s.b.x - s.a.x) / s.span;
    const uy = (s.b.y - s.a.y) / s.span;
    // ristuvad seinad: lõikepunkt mõlema lõigu sees (otspunktid kaasa arvatud)
    const crossings: { at: number; wall: WallId }[] = [];
    for (const o of segs) {
      if (o === s || o.dir === s.dir) continue;
      const p = s.dir === 'x' ? { x: o.a.x, y: s.a.y } : { x: s.a.x, y: o.a.y };
      if (!onSegment(p, s.a, s.b) || !onSegment(p, o.a, o.b)) continue;
      crossings.push({ at: (p.x - s.a.x) * ux + (p.y - s.a.y) * uy, wall: o.w.id });
    }
    const startExt = crossings.some((k) => Math.abs(k.at) < EPS) ? ext : 0;
    const endExt = crossings.some((k) => Math.abs(k.at - s.span) < EPS) ? ext : 0;
    const joints = crossings.map((k) => ({ x: k.at + startExt, wall: k.wall })).sort((p, q) => p.x - q.x);
    return { id: s.w.id, dir: s.dir, a: s.a, b: s.b, span: s.span, startExt, endExt, length: s.span + startExt + endExt, joints };
  });
}

function onSegment(p: { x: number; y: number }, a: PlanNode, b: PlanNode): boolean {
  return p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS && p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS;
}

/** Plaani ümbritsev ristkülik palgi otste järgi (koos pikendustega) */
export function planBounds(geo: WallGeometry[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of geo) {
    const ux = (g.b.x - g.a.x) / g.span;
    const uy = (g.b.y - g.a.y) / g.span;
    const pts = [
      { x: g.a.x - ux * g.startExt, y: g.a.y - uy * g.startExt },
      { x: g.b.x + ux * g.endExt, y: g.b.y + uy * g.endExt },
    ];
    for (const p of pts) {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
  }
  return { x0, y0, x1, y1 };
}

function fail(msg: string): never {
  throw new PlanError(msg);
}

export class PlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanError';
  }
}
