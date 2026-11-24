/**
 * Plaani alad (WALL-GRAPH.md, etapp 4): ruudustik sõlmede koordinaatidest, sisemine ala (üleujutus väljast),
 * ruumid (seintega eraldatud), ristkülikuteks jagamine. Kasutavad katus, põrand ja vundament.
 */
import type { HousePlan, PlanWall, WallGeometry } from './plan.js';

export const EPS = 0.5;

/** Kesktelgede ristkülik plaani koordinaatides */
export interface PlanRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Lahtrite ristkülik ruudustiku indeksites (kaasa arvatud) */
export interface CellRect {
  i0: number;
  j0: number;
  i1: number;
  j1: number;
}

export interface PlanGrid {
  xs: number[];
  ys: number[];
  nx: number;
  ny: number;
  /** x-suunas sein y-joonel j (0..ny) lahtri i kohal; filter piirab seinatüüpe */
  hWall(i: number, j: number, filter?: (w: PlanWall) => boolean): boolean;
  /** y-suunas sein x-joonel i (0..nx) lahtri j kohal */
  vWall(i: number, j: number, filter?: (w: PlanWall) => boolean): boolean;
  /** sisemine ala [i][j] */
  inside: boolean[][];
  rect(r: CellRect): PlanRect;
}

export function uniq(v: number[]): number[] {
  const s = [...v].sort((a, b) => a - b);
  return s.filter((x, i) => i === 0 || x - s[i - 1]! > EPS);
}

/**
 * blocks: millised seinad piiravad sisemist ala (vaikimisi kõik – katus; põrand/vundament: alt olemas seinad,
 * nii et „ainult viil“ esiseinaga veranda jääb välja).
 */
export function planGrid(plan: HousePlan, geo: WallGeometry[], blocks?: (w: PlanWall) => boolean): PlanGrid | null {
  if (!geo.length) return null;
  const xs = uniq(plan.nodes.map((n) => n.x));
  const ys = uniq(plan.nodes.map((n) => n.y));
  const nx = xs.length - 1;
  const ny = ys.length - 1;
  if (nx < 1 || ny < 1) return null;
  const byId = new Map(plan.walls.map((w) => [w.id, w]));

  const covers = (g: WallGeometry, lo: number, hi: number) => {
    const a = g.dir === 'x' ? Math.min(g.a.x, g.b.x) : Math.min(g.a.y, g.b.y);
    const b = g.dir === 'x' ? Math.max(g.a.x, g.b.x) : Math.max(g.a.y, g.b.y);
    return a <= lo + EPS && b >= hi - EPS;
  };
  const ok = (g: WallGeometry, f?: (w: PlanWall) => boolean) => !f || f(byId.get(g.id)!);
  const hWall = (i: number, j: number, f?: (w: PlanWall) => boolean) =>
    geo.some((g) => g.dir === 'x' && Math.abs(g.a.y - ys[j]!) < EPS && covers(g, xs[i]!, xs[i + 1]!) && ok(g, f));
  const vWall = (i: number, j: number, f?: (w: PlanWall) => boolean) =>
    geo.some((g) => g.dir === 'y' && Math.abs(g.a.x - xs[i]!) < EPS && covers(g, ys[j]!, ys[j + 1]!) && ok(g, f));

  // üleujutus väljast: lahtrid, kuhu pääseb ilma seina ületamata, on väljas
  const out = Array.from({ length: nx }, () => Array<boolean>(ny).fill(false));
  const queue: [number, number][] = [];
  const push = (i: number, j: number) => {
    if (!out[i]![j]) {
      out[i]![j] = true;
      queue.push([i, j]);
    }
  };
  const h = (i: number, j: number) => hWall(i, j, blocks);
  const v = (i: number, j: number) => vWall(i, j, blocks);
  for (let i = 0; i < nx; i++) {
    if (!h(i, 0)) push(i, 0);
    if (!h(i, ny)) push(i, ny - 1);
  }
  for (let j = 0; j < ny; j++) {
    if (!v(0, j)) push(0, j);
    if (!v(nx, j)) push(nx - 1, j);
  }
  while (queue.length) {
    const [i, j] = queue.shift()!;
    if (i > 0 && !v(i, j)) push(i - 1, j);
    if (i < nx - 1 && !v(i + 1, j)) push(i + 1, j);
    if (j > 0 && !h(i, j)) push(i, j - 1);
    if (j < ny - 1 && !h(i, j + 1)) push(i, j + 1);
  }
  const inside = out.map((col) => col.map((o) => !o));
  const rect = (r: CellRect): PlanRect => ({ x0: xs[r.i0]!, y0: ys[r.j0]!, x1: xs[r.i1 + 1]!, y1: ys[r.j1 + 1]! });
  return { xs, ys, nx, ny, hWall, vWall, inside, rect };
}

/** Ahne jaotus ristkülikuteks: suurim täielikult valitud ristkülik, siis järgmine ülejäänust */
export function greedyRects(grid: PlanGrid, cells: boolean[][]): CellRect[] {
  const { xs, ys, nx, ny } = grid;
  const rects: CellRect[] = [];
  const left = cells.map((col) => [...col]);
  for (let guard = 0; guard < 50; guard++) {
    let best: (CellRect & { area: number }) | null = null;
    for (let i0 = 0; i0 < nx; i0++)
      for (let j0 = 0; j0 < ny; j0++) {
        if (!left[i0]![j0]) continue;
        for (let i1 = i0; i1 < nx; i1++) {
          if (!left[i1]![j0]) break;
          for (let j1 = j0; j1 < ny; j1++) {
            let ok = true;
            for (let i = i0; i <= i1 && ok; i++) if (!left[i]![j1]) ok = false;
            if (!ok) break;
            const area = (xs[i1 + 1]! - xs[i0]!) * (ys[j1 + 1]! - ys[j0]!);
            if (!best || area > best.area + 1) best = { i0, j0, i1, j1, area };
          }
        }
      }
    if (!best) break;
    const { area: _a, ...r } = best;
    rects.push(r);
    for (let i = r.i0; i <= r.i1; i++) for (let j = r.j0; j <= r.j1; j++) left[i]![j] = false;
  }
  return rects;
}

/** Sein, mis eraldab põrandat: alt olemas (mitte „ainult viil“) */
export const solidBelow = (w: PlanWall) => w.topOnly === undefined;

export interface PlanRoom {
  /** lahtrid [i][j] */
  cells: boolean[][];
  /** ristkülikud (ahne jaotus) */
  rects: PlanRect[];
  /** pindala kesktelgede järgi, m² */
  area: number;
  /** lahtine osa (terrass/veranda): mõni piiriosa on lahtine, piire või ainult viil */
  open: boolean;
}

/**
 * Ruumid: sisemise ala lahtrid, mis on ühendatud ilma alt olemas seina ületamata
 * („ainult viil“ vahesein, nt garaaži keskviil, ruumi ei jaga).
 */
export function planRooms(plan: HousePlan, geo: WallGeometry[], grid = planGrid(plan, geo, solidBelow)): PlanRoom[] {
  if (!grid) return [];
  const { nx, ny, inside, hWall, vWall, xs, ys } = grid;
  const seen = Array.from({ length: nx }, () => Array<boolean>(ny).fill(false));
  const rooms: PlanRoom[] = [];
  const gById = new Map(geo.map((g) => [g.id, g]));
  for (let si = 0; si < nx; si++)
    for (let sj = 0; sj < ny; sj++) {
      if (!inside[si]![sj] || seen[si]![sj]) continue;
      const cells = Array.from({ length: nx }, () => Array<boolean>(ny).fill(false));
      const q: [number, number][] = [[si, sj]];
      seen[si]![sj] = true;
      cells[si]![sj] = true;
      const go = (i: number, j: number, blocked: boolean) => {
        if (blocked || !inside[i]![j] || seen[i]![j]) return;
        seen[i]![j] = true;
        cells[i]![j] = true;
        q.push([i, j]);
      };
      while (q.length) {
        const [i, j] = q.shift()!;
        if (i > 0) go(i - 1, j, vWall(i, j, solidBelow));
        if (i < nx - 1) go(i + 1, j, vWall(i + 1, j, solidBelow));
        if (j > 0) go(i, j - 1, hWall(i, j, solidBelow));
        if (j < ny - 1) go(i, j + 1, hWall(i, j + 1, solidBelow));
      }
      let area = 0;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if (cells[i]![j]) area += (xs[i + 1]! - xs[i]!) * (ys[j + 1]! - ys[j]!);
      // lahtine: piiri lahtri serval sein, mille vastav osa on lahtine / piire / ainult viil
      const openEdge = (dir: 'x' | 'y', at: number, lo: number, hi: number) =>
        plan.walls.some((w) => {
          const g = gById.get(w.id);
          if (!g || g.dir !== dir) return false;
          const line = dir === 'x' ? g.a.y : g.a.x;
          if (Math.abs(line - at) > EPS) return false;
          const p0 = dir === 'x' ? g.a.x : g.a.y;
          const p1 = dir === 'x' ? g.b.x : g.b.y;
          if (Math.min(p0, p1) > lo + EPS || Math.max(p0, p1) < hi - EPS) return false;
          if (w.topOnly !== undefined) return true;
          const sg = Math.sign(p1 - p0) || 1;
          const toWall = (pos: number) => (pos - p0) * sg + g.startExt;
          const a = Math.min(toWall(lo), toWall(hi));
          const b = Math.max(toWall(lo), toWall(hi));
          return [...(w.open ?? []), ...(w.railings ?? [])].some((o) => Math.min(o.x1, b) - Math.max(o.x0, a) > EPS);
        });
      let open = false;
      for (let i = 0; i < nx && !open; i++)
        for (let j = 0; j < ny && !open; j++) {
          if (!cells[i]![j]) continue;
          if ((j === 0 || !cells[i]![j - 1]) && openEdge('x', ys[j]!, xs[i]!, xs[i + 1]!)) open = true;
          if ((j === ny - 1 || !cells[i]![j + 1]) && openEdge('x', ys[j + 1]!, xs[i]!, xs[i + 1]!)) open = true;
          if ((i === 0 || !cells[i - 1]![j]) && openEdge('y', xs[i]!, ys[j]!, ys[j + 1]!)) open = true;
          if ((i === nx - 1 || !cells[i + 1]![j]) && openEdge('y', xs[i + 1]!, ys[j]!, ys[j + 1]!)) open = true;
        }
      rooms.push({ cells, rects: greedyRects(grid, cells).map(grid.rect), area: area / 1e6, open });
    }
  // suurem ruum ees, lahtised osad lõpus
  return rooms.sort((a, b) => Number(a.open) - Number(b.open) || b.area - a.area);
}

/** Kas ristküliku serval (plaani joonel) on sein, mis katab serva (osaliselt) */
export function edgeHasWall(geo: WallGeometry[], dir: 'x' | 'y', at: number, lo: number, hi: number): boolean {
  return geo.some((g) => {
    if (g.dir !== dir) return false;
    const line = dir === 'x' ? g.a.y : g.a.x;
    if (Math.abs(line - at) > EPS) return false;
    const p0 = dir === 'x' ? Math.min(g.a.x, g.b.x) : Math.min(g.a.y, g.b.y);
    const p1 = dir === 'x' ? Math.max(g.a.x, g.b.x) : Math.max(g.a.y, g.b.y);
    return Math.min(p1, hi) - Math.max(p0, lo) > EPS;
  });
}

/**
 * Hoone välispindade pindala (m²): kesktelgede ala + välisperimeeter × t/2 + t²
 * (täisnurkne hulknurk: kumerad − nõgusad nurgad = 4).
 */
export function outerArea(grid: PlanGrid, t: number): number {
  const { nx, ny, inside, xs, ys } = grid;
  let area = 0;
  let perim = 0;
  const at = (i: number, j: number) => i >= 0 && j >= 0 && i < nx && j < ny && inside[i]![j];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      if (!inside[i]![j]) continue;
      const w = xs[i + 1]! - xs[i]!;
      const h = ys[j + 1]! - ys[j]!;
      area += w * h;
      if (!at(i, j - 1)) perim += w;
      if (!at(i, j + 1)) perim += w;
      if (!at(i - 1, j)) perim += h;
      if (!at(i + 1, j)) perim += h;
    }
  return (area + (perim * t) / 2 + t * t) / 1e6;
}

/** Välisnurkade arv (kumerad + nõgusad): ruudustiku sõlmed, kus sisemine ala murdub */
export function outlineCorners(grid: PlanGrid): number {
  const { nx, ny, inside } = grid;
  const at = (i: number, j: number) => i >= 0 && j >= 0 && i < nx && j < ny && inside[i]![j]!;
  let n = 0;
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= ny; j++) {
      const q = [at(i - 1, j - 1), at(i, j - 1), at(i - 1, j), at(i, j)];
      const k = q.filter(Boolean).length;
      if (k === 1 || k === 3) n++;
      else if (k === 2 && q[0] === q[3]) n += 2; // diagonaalis: kaks nurka
    }
  return n;
}

/**
 * Seina „sisemine“ pool (uks avaneb vaikimisi sinna): funktsioon (sein, kaugus palgi otsast) → +1/−1 =
 * risti seinaga plaani telje suunas (x-seinal +y, y-seinal +x). Eelistus: suletud ruum > lahtine osa
 * (terrass) > väljas; vaheseinal (mõlemal pool ruum) suurema ruumi pool.
 */
export function insideSide(plan: HousePlan, geo: WallGeometry[]): (wall: string, along: number) => 1 | -1 {
  const grid = planGrid(plan, geo, solidBelow);
  const rooms = grid ? planRooms(plan, geo, grid) : [];
  const gById = new Map(geo.map((g) => [g.id, g]));
  const cellAt = (x: number, y: number): [number, number] | null => {
    if (!grid) return null;
    const i = grid.xs.findIndex((v, k) => k < grid.nx && x > v && x < grid.xs[k + 1]!);
    const j = grid.ys.findIndex((v, k) => k < grid.ny && y > v && y < grid.ys[k + 1]!);
    return i < 0 || j < 0 ? null : [i, j];
  };
  const score = (x: number, y: number) => {
    const c = cellAt(x, y);
    if (!c) return 0;
    const room = rooms.find((r) => r.cells[c[0]]![c[1]]);
    return !room ? 0 : room.open ? 1 : 2 + room.area / 1e3;
  };
  return (wall, along) => {
    const g = gById.get(wall);
    if (!g) return 1;
    const ux = (g.b.x - g.a.x) / g.span;
    const uy = (g.b.y - g.a.y) / g.span;
    const px = g.a.x + ux * (along - g.startExt);
    const py = g.a.y + uy * (along - g.startExt);
    const d = 1;
    const plus = g.dir === 'x' ? score(px, py + d) : score(px + d, py);
    const minus = g.dir === 'x' ? score(px, py - d) : score(px - d, py);
    return minus > plus ? -1 : 1;
  };
}
