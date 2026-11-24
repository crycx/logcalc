/**
 * Plaani muutmine (plaanieditor): puhtad funktsioonid, mis tagastavad uue plaani.
 * Kõik seinad jäävad täisnurkseks: seina nihutatakse risti oma suunaga, koos sellel asuvate sõlmedega
 * (otsad ja T-liidete sõlmed), nii et sellega ühendatud seinad pikenevad/lühenevad.
 */
import type { HousePlan, PlanNode, PlanWall } from './plan.js';
import type { WallId } from './wall-model.js';

const EPS = 0.5;

export interface WallLine {
  dir: 'x' | 'y';
  /** joone koordinaat (x-suunas seinal y, y-suunas seinal x) */
  at: number;
  /** algus ja lõpp piki seina (väiksem ja suurem) */
  from: number;
  to: number;
  a: PlanNode;
  b: PlanNode;
}

export function wallLine(plan: HousePlan, id: WallId): WallLine {
  const w = plan.walls.find((x) => x.id === id);
  if (!w) throw new Error(`Seina ${id} ei ole.`);
  const a = plan.nodes.find((n) => n.id === w.a)!;
  const b = plan.nodes.find((n) => n.id === w.b)!;
  const dir: 'x' | 'y' = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? 'x' : 'y';
  return dir === 'x'
    ? { dir, at: a.y, from: Math.min(a.x, b.x), to: Math.max(a.x, b.x), a, b }
    : { dir, at: a.x, from: Math.min(a.y, b.y), to: Math.max(a.y, b.y), a, b };
}

/** Sõlmed seina lõigul (otsad + vahepealsed, nt T-liited) */
function nodesOnWall(plan: HousePlan, id: WallId): Set<string> {
  const l = wallLine(plan, id);
  const out = new Set<string>();
  for (const n of plan.nodes) {
    const at = l.dir === 'x' ? n.y : n.x;
    const along = l.dir === 'x' ? n.x : n.y;
    if (Math.abs(at - l.at) < EPS && along >= l.from - EPS && along <= l.to + EPS) out.add(n.id);
  }
  return out;
}

function moveNodes(plan: HousePlan, ids: Set<string>, dx: number, dy: number): HousePlan {
  return { ...plan, nodes: plan.nodes.map((n) => (ids.has(n.id) ? { ...n, x: round(n.x + dx), y: round(n.y + dy) } : n)) };
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Nihuta seina risti tema suunaga (x-suunas seina y võrra, y-suunas x võrra). */
export function moveWall(plan: HousePlan, id: WallId, delta: number): HousePlan {
  if (Math.abs(delta) < 1e-9) return plan;
  const l = wallLine(plan, id);
  const ids = nodesOnWall(plan, id);
  return l.dir === 'x' ? moveNodes(plan, ids, 0, delta) : moveNodes(plan, ids, delta, 0);
}

/** Seina kesktelgede vahe (sõlmest a sõlmeni b). */
export function wallSpan(plan: HousePlan, id: WallId): number {
  const l = wallLine(plan, id);
  return l.to - l.from;
}

/**
 * Muuda seina pikkust (kesktelgede vahe): b-ots liigub. Kui b otsas on ristuv sein, nihutatakse see
 * tervikuna (koos oma sõlmedega), muidu ainult b sõlm (vaba ots).
 */
export function setWallSpan(plan: HousePlan, id: WallId, span: number): HousePlan {
  const l = wallLine(plan, id);
  const w = plan.walls.find((x) => x.id === id)!;
  const b = l.b;
  const a = l.a;
  const sign = l.dir === 'x' ? Math.sign(b.x - a.x) || 1 : Math.sign(b.y - a.y) || 1;
  const delta = (span - (l.to - l.from)) * sign;
  if (Math.abs(delta) < 1e-9) return plan;
  // ristuvad seinad, mille lõigul on b
  const ids = new Set<string>([w.b]);
  for (const o of plan.walls) {
    if (o.id === id) continue;
    const ol = wallLine(plan, o.id);
    if (ol.dir === l.dir) continue;
    const at = ol.dir === 'x' ? b.y : b.x;
    const along = ol.dir === 'x' ? b.x : b.y;
    if (Math.abs(at - ol.at) < EPS && along >= ol.from - EPS && along <= ol.to + EPS) {
      for (const n of nodesOnWall(plan, o.id)) ids.add(n);
    }
  }
  return l.dir === 'x' ? moveNodes(plan, ids, delta, 0) : moveNodes(plan, ids, 0, delta);
}

/** Järgmine vaba tähis: x-suunas number (1, 2, 3, ...), y-suunas täht (A, B, C, ...). */
export function nextWallId(plan: HousePlan, dir: 'x' | 'y'): WallId {
  const used = new Set(plan.walls.map((w) => w.id));
  if (dir === 'x') {
    for (let i = 1; ; i++) if (!used.has(String(i))) return String(i);
  }
  for (let i = 0; i < 26 * 27; i++) {
    const id = i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));
    if (!used.has(id)) return id;
  }
  return `S${plan.walls.length + 1}`;
}

/** Leia sõlm punktis (± tol) või loo uus. */
function nodeAt(plan: HousePlan, p: { x: number; y: number }, tol = EPS): { plan: HousePlan; id: string } {
  const hit = plan.nodes.find((n) => Math.abs(n.x - p.x) <= tol && Math.abs(n.y - p.y) <= tol);
  if (hit) return { plan, id: hit.id };
  let k = plan.nodes.length + 1;
  const ids = new Set(plan.nodes.map((n) => n.id));
  while (ids.has(`n${k}`)) k++;
  const id = `n${k}`;
  return { plan: { ...plan, nodes: [...plan.nodes, { id, x: round(p.x), y: round(p.y) }] }, id };
}

/**
 * Lisa sein punktist punkti (täisnurkne: väiksem nihe nullitakse). Olemasolevad sõlmed võetakse kasutusele.
 * Tagastab uue plaani ja seina tähise.
 */
export function addWall(plan: HousePlan, from: { x: number; y: number }, to: { x: number; y: number }, extra: Partial<PlanWall> = {}): { plan: HousePlan; id: WallId } {
  const dir: 'x' | 'y' = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) ? 'x' : 'y';
  let end = dir === 'x' ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
  if (Math.abs(end.x - from.x) + Math.abs(end.y - from.y) < 1) throw new Error('Sein on liiga lühike.');
  // suund ühtne: x-sein vasakult paremale, y-sein tagant ette (uste/akende kaugus samast otsast)
  if ((dir === 'x' && end.x < from.x) || (dir === 'y' && end.y < from.y)) [from, end] = [end, from];
  let r = nodeAt(plan, from);
  const a = r.id;
  r = nodeAt(r.plan, end);
  const b = r.id;
  // sama sein juba olemas?
  if (r.plan.walls.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a))) throw new Error('Selline sein on juba olemas.');
  const id = extra.id ?? nextWallId(r.plan, dir);
  return { plan: { ...r.plan, walls: [...r.plan.walls, { ...extra, id, a, b }] }, id };
}

/** Kustuta sein; sõlmed, mida ükski sein ei kasuta, kaovad ka. */
export function deleteWall(plan: HousePlan, id: WallId): HousePlan {
  const walls = plan.walls.filter((w) => w.id !== id);
  const used = new Set(walls.flatMap((w) => [w.a, w.b]));
  return { ...plan, walls, nodes: plan.nodes.filter((n) => used.has(n.id)) };
}

/** Muuda seina omadusi (tüüp, lahtised osad, piirded, kõrgus, ...). `undefined` väärtus eemaldab välja. */
export function updateWall(plan: HousePlan, id: WallId, patch: Partial<Omit<PlanWall, 'a' | 'b'>>): HousePlan {
  if (patch.id !== undefined && patch.id !== id) {
    if (!patch.id.trim()) throw new Error('Tähis ei tohi olla tühi.');
    if (plan.walls.some((w) => w.id === patch.id)) throw new Error(`Tähis ${patch.id} on juba kasutusel.`);
  }
  return {
    ...plan,
    walls: plan.walls.map((w) => {
      if (w.id !== id) return w;
      const next: PlanWall = { ...w, ...patch } as PlanWall;
      for (const k of Object.keys(patch) as (keyof typeof patch)[]) if (patch[k] === undefined) delete next[k];
      return next;
    }),
  };
}

/** Pööra seina suund (a <-> b): seina vaates x hakkab teisest otsast. */
export function reverseWall(plan: HousePlan, id: WallId): HousePlan {
  return { ...plan, walls: plan.walls.map((w) => (w.id === id ? { ...w, a: w.b, b: w.a } : w)) };
}

/** Nihuta kogu plaan nii, et vasak-ülemine sõlm on (x0, y0) */
export function normalizePlan(plan: HousePlan, x0: number, y0: number): HousePlan {
  if (!plan.nodes.length) return plan;
  const minX = Math.min(...plan.nodes.map((n) => n.x));
  const minY = Math.min(...plan.nodes.map((n) => n.y));
  const dx = x0 - minX;
  const dy = y0 - minY;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return plan;
  return { ...plan, nodes: plan.nodes.map((n) => ({ ...n, x: round(n.x + dx), y: round(n.y + dy) })) };
}

/** Tähestiku tähis: 0 -> A, 25 -> Z, 26 -> AA */
function letter(i: number): string {
  return i < 26 ? String.fromCharCode(65 + i) : letter(Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));
}

/**
 * Seinte tähised tavapärases järjekorras: x-suunas seinad numbritega eest taha (1 = esisein, suurim y),
 * y-suunas seinad tähtedega vasakult paremale. Mitu seina samal joonel: 1a, 1b … / A1, A2 …
 * Tagastab uue plaani ja vana -> uus tähiste kaardi (uksed/aknad järgivad).
 */
export function renumberWalls(plan: HousePlan): { plan: HousePlan; map: Record<string, string> } {
  const lines = plan.walls.map((w) => ({ w, l: wallLine(plan, w.id) }));
  const groups = (dir: 'x' | 'y') => {
    const list = lines.filter((z) => z.l.dir === dir);
    const out: (typeof list)[] = [];
    for (const z of [...list].sort((a, b) => a.l.at - b.l.at)) {
      const g = out.find((q) => Math.abs(q[0]!.l.at - z.l.at) < EPS);
      if (g) g.push(z);
      else out.push([z]);
    }
    for (const g of out) g.sort((a, b) => a.l.from - b.l.from);
    return out;
  };
  const map: Record<string, string> = {};
  // numbrid eest (suurim y) taha
  groups('x')
    .reverse()
    .forEach((g, k) => g.forEach((z, i) => (map[z.w.id] = g.length > 1 ? `${k + 1}${String.fromCharCode(97 + i)}` : String(k + 1))));
  // tähed vasakult paremale
  groups('y').forEach((g, k) => g.forEach((z, i) => (map[z.w.id] = g.length > 1 ? `${letter(k)}${i + 1}` : letter(k))));
  return { plan: { ...plan, walls: plan.walls.map((w) => ({ ...w, id: map[w.id] ?? w.id })) }, map };
}
