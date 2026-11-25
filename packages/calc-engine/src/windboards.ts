/**
 * Tuuleliistud (Windboard 18x40 × 2200) Viktra paigaldusjoonise järgi (S-PDF „Windboard“, 190325;
 * nt Carina lk 12, Lund lk 15):
 * - toas, katuse kalde all oleval seinal (viilusein; ühekaldel külgseinad; ka kalde all vahesein – Boden),
 *   kummaski otsas üks;
 * - liistu serv 200 mm nurgas ristuva seina sisepinnast, alumine ots 40 mm põrandast;
 * - liist 2200 lõigatakse katuse alla mahtuvaks (Assembly 2), ülemisse otsa uus Ø8 ava 40 mm otsast;
 *   pilud (vajumiseks) jäävad.
 * Revit: Bente, Annika, Carina, Brantevik, Placas, Nora, Boden – 4 tk; Lund – 6 (3 viiluseina).
 * Boden II lisaks „Windboard2“ 4 × 550 (veranda) – ei arvutata.
 */
import type { HousePlan, WallGeometry } from './plan.js';
import { insideSide } from './plan-regions.js';
import type { WallSpec } from './wall-model.js';

export const WINDBOARD = {
  /** tarnepikkus */
  stock: 2200,
  thickness: 18,
  width: 40,
  /** liistu serv nurgas ristuva seina sisepinnast */
  fromCorner: 200,
  /** alumine ots põrandast */
  fromFloor: 40,
  /** ülemine ots katuse alumisest pinnast (lõikamisel) */
  underRoof: 50,
  /** uus ava ülemisest otsast (lõikamisel), Ø8 */
  holeFromTop: 40,
  holeDiameter: 8,
  /** põrandalaua paksus (Revit FB 17x114) – põranda pind seina alusest */
  floorTop: 17,
} as const;

export interface Windboard {
  wall: string;
  /** liistu keskkoht piki seina (seina koordinaat) */
  x: number;
  /** maja sisemine pool: +1/−1 plaani teljel risti seinaga (x-seinal y, y-seinal x) */
  side: 1 | -1;
  /** alumine ja ülemine ots seina alusest */
  z0: number;
  z1: number;
  /** lõikepikkus (= z1 − z0); tarnepikkus WINDBOARD.stock */
  cut: number;
  /** kas tuleb lõigata (lühem kui tarnepikkus) */
  cutNeeded: boolean;
}

/** roofLine (X, Z) -> katuse kõrgus seina kohal */
function roofAt(line: [number, number][] | null, X: number): number {
  if (!line?.length) return Infinity;
  if (X <= line[0]![0]) return line[0]![1];
  for (let i = 1; i < line.length; i++) {
    const [x1, z1] = line[i]!;
    const [x0, z0] = line[i - 1]!;
    if (X <= x1) return x1 - x0 < 1e-6 ? z1 : z0 + ((X - x0) / (x1 - x0)) * (z1 - z0);
  }
  return line[line.length - 1]![1];
}

export function computeWindboards(
  plan: HousePlan,
  geo: WallGeometry[],
  wallModel: WallSpec[],
  roofLines: Map<string, [number, number][] | null>,
  topOnly: (id: string) => boolean,
  t: number,
): Windboard[] {
  const W = WINDBOARD;
  let side: ((wall: string, along: number) => 1 | -1) | null = null;
  try {
    side = insideSide(plan, geo);
  } catch {
    side = null;
  }
  const out: Windboard[] = [];
  for (const w of wallModel) {
    // sein katuse kalde all (katus seina kohal kaldu: viilusein, ühekalde külgsein, kalde all vahesein – Boden),
    // alt olemas (mitte „ainult ülemised read“); räästaseinad ja harjaga paralleelsed vaheseinad ei
    if (topOnly(w.id) || !w.joints.length) continue;
    const line = roofLines.get(w.id) ?? null;
    const xs = w.joints.map((j) => j.x);
    const j0 = Math.min(...xs);
    const j1 = Math.max(...xs);
    const zs = (line ?? []).filter(([x]) => x >= j0 - 1 && x <= j1 + 1).map(([, z]) => z);
    if (zs.length < 2 || Math.max(...zs) - Math.min(...zs) < 50) continue;
    const z0 = W.floorTop + W.fromFloor;
    // lahtised osad (veranda, terrass), mis katavad liistu kõrguse: seal palke pole
    const z0w = W.floorTop + W.fromFloor;
    const open = (w.voids ?? []).filter((v) => v.kind === 'open' && v.y0 < z0w + 1000 && v.y1 > z0w + 1000);
    const blocked = (a: number, b: number) => open.some((v) => v.x0 < b - 1 && v.x1 > a + 1);
    const place = (start: boolean): number | null => {
      const face = start ? j0 + t / 2 : j1 - t / 2;
      const x = start ? face + W.fromCorner + W.width / 2 : face - W.fromCorner - W.width / 2;
      if (!blocked(x - W.width / 2, x + W.width / 2)) return x;
      // 200 mm kohal lahtine osa: nurgapost (Lund), kui mahub – muidu liistu pole (Kolding veranda raam)
      const edge = start ? Math.min(...open.filter((v) => v.x1 > face).map((v) => v.x0)) : Math.max(...open.filter((v) => v.x0 < face).map((v) => v.x1));
      const lo = start ? face : edge;
      const hi = start ? edge : face;
      return hi - lo >= W.width + 20 ? (lo + hi) / 2 : null;
    };
    for (const x of [place(true), place(false)].filter((v): v is number => v !== null)) {
      // katus liistu madalamas servas
      const roof = Math.min(roofAt(line, x - W.width / 2), roofAt(line, x + W.width / 2));
      const top = Math.min(z0 + W.stock, roof - W.underRoof);
      const cut = Math.round(top - z0);
      out.push({ wall: w.id, x, side: side?.(w.id, x) ?? 1, z0, z1: z0 + cut, cut, cutNeeded: cut < W.stock - 0.5 });
    }
  }
  return out;
}
