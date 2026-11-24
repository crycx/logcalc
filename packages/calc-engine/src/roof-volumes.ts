/**
 * Katusemahud plaanist (WALL-GRAPH.md, etapp 4).
 *
 * Plaani sisemine ala (seinte vahel, väljast ligipääsmatu – ka lahtine terrass on katuse all) jagatakse
 * ristkülikuteks: suurim on põhiosa, ülejäänud tiivad. Iga maht on viilkatus oma harjaga:
 * põhiosa hari vaikimisi sügavuse suunas ('y', nagu kõigil Viktra ristkülikmajadel), tiiva hari on risti
 * seinaga, millega ta põhiosa külge kinnitub (L-/T-maja: kaks viilkatust, org vahel).
 * Viil tekib mahu otsas (harjaga risti), kui see serv ei ole teise mahu vastas.
 */
import type { HousePlan, WallGeometry } from './plan.js';
import type { EngineConstants, HouseInput } from './types.js';

export interface RoofVolume {
  /** kesktelgede ristkülik (välisseinte teljed) */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** harja suund */
  ridge: 'x' | 'y';
  main: boolean;
}

/** Mahu otsa serv (viil): asukoht harjaga risti, ulatus, kas viil (mitte teise mahu vastas) */
export interface RoofGableEnd {
  volume: number;
  /** 'x' = serv x-suunas (y = at), 'y' = serv y-suunas (x = at) */
  dir: 'x' | 'y';
  at: number;
  from: number;
  to: number;
}

const EPS = 0.5;

export function roofVolumes(plan: HousePlan, geo: WallGeometry[]): RoofVolume[] {
  if (!geo.length) return [];
  const xs = uniq(plan.nodes.map((n) => n.x));
  const ys = uniq(plan.nodes.map((n) => n.y));
  const nx = xs.length - 1;
  const ny = ys.length - 1;
  if (nx < 1 || ny < 1) return [];

  // seinad ruudustiku joontel: x-sein (horisontaalne) y-joonel, y-sein x-joonel
  const covers = (g: WallGeometry, lo: number, hi: number) => {
    const a = g.dir === 'x' ? Math.min(g.a.x, g.b.x) : Math.min(g.a.y, g.b.y);
    const b = g.dir === 'x' ? Math.max(g.a.x, g.b.x) : Math.max(g.a.y, g.b.y);
    return a <= lo + EPS && b >= hi - EPS;
  };
  /** horisontaalne tõke y-joonel j (0..ny) lahtris i */
  const hWall = (i: number, j: number) => geo.some((g) => g.dir === 'x' && Math.abs(g.a.y - ys[j]!) < EPS && covers(g, xs[i]!, xs[i + 1]!));
  /** vertikaalne tõke x-joonel i (0..nx) lahtris j */
  const vWall = (i: number, j: number) => geo.some((g) => g.dir === 'y' && Math.abs(g.a.x - xs[i]!) < EPS && covers(g, ys[j]!, ys[j + 1]!));

  // üleujutus väljast: lahtrid, kuhu pääseb ilma seina ületamata, on väljas
  const out = Array.from({ length: nx }, () => Array<boolean>(ny).fill(false));
  const queue: [number, number][] = [];
  const push = (i: number, j: number) => {
    if (!out[i]![j]) {
      out[i]![j] = true;
      queue.push([i, j]);
    }
  };
  for (let i = 0; i < nx; i++) {
    if (!hWall(i, 0)) push(i, 0);
    if (!hWall(i, ny)) push(i, ny - 1);
  }
  for (let j = 0; j < ny; j++) {
    if (!vWall(0, j)) push(0, j);
    if (!vWall(nx, j)) push(nx - 1, j);
  }
  while (queue.length) {
    const [i, j] = queue.shift()!;
    if (i > 0 && !vWall(i, j)) push(i - 1, j);
    if (i < nx - 1 && !vWall(i + 1, j)) push(i + 1, j);
    if (j > 0 && !hWall(i, j)) push(i, j - 1);
    if (j < ny - 1 && !hWall(i, j + 1)) push(i, j + 1);
  }
  const inside = out.map((col) => col.map((o) => !o));

  // ahne jaotus: suurim täielikult sisemine ristkülik, siis järgmine ülejäänust
  const rects: { i0: number; j0: number; i1: number; j1: number }[] = [];
  const left = inside.map((col) => [...col]);
  for (let guard = 0; guard < 20; guard++) {
    let best: { i0: number; j0: number; i1: number; j1: number; area: number } | null = null;
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
    rects.push(best);
    for (let i = best.i0; i <= best.i1; i++) for (let j = best.j0; j <= best.j1; j++) left[i]![j] = false;
  }
  if (!rects.length) return [];

  const mainRidge = plan.ridge ?? 'y';
  const vols: RoofVolume[] = rects.map((r, k) => ({
    x0: xs[r.i0]!,
    y0: ys[r.j0]!,
    x1: xs[r.i1 + 1]!,
    y1: ys[r.j1 + 1]!,
    ridge: mainRidge,
    main: k === 0,
  }));
  // tiiva hari risti ühise servaga (kinnitub põhiosa või varasema mahu külge)
  for (let k = 1; k < vols.length; k++) {
    const v = vols[k]!;
    const host = vols.slice(0, k).find((h) => sharedEdge(h, v));
    const e = host ? sharedEdge(host, v) : null;
    v.ridge = e === 'v' ? 'x' : e === 'h' ? 'y' : mainRidge;
  }
  return vols;
}

/** Viiluotsad: mahu harjaga ristuvad servad, mis ei ole teise mahu vastas */
export function gableEnds(vols: RoofVolume[]): RoofGableEnd[] {
  const ends: RoofGableEnd[] = [];
  vols.forEach((v, k) => {
    const cand: RoofGableEnd[] =
      v.ridge === 'y'
        ? [
            { volume: k, dir: 'x', at: v.y0, from: v.x0, to: v.x1 },
            { volume: k, dir: 'x', at: v.y1, from: v.x0, to: v.x1 },
          ]
        : [
            { volume: k, dir: 'y', at: v.x0, from: v.y0, to: v.y1 },
            { volume: k, dir: 'y', at: v.x1, from: v.y0, to: v.y1 },
          ];
    for (const e of cand) {
      const blocked = vols.some((o, m) => m !== k && touches(o, e));
      if (!blocked) ends.push(e);
    }
  });
  return ends;
}

/** Mahu laius harjaga risti (kesktelgede vahe) */
export function volumeSpan(v: RoofVolume): { across: number; along: number } {
  return v.ridge === 'y' ? { across: v.x1 - v.x0, along: v.y1 - v.y0 } : { across: v.y1 - v.y0, along: v.x1 - v.x0 };
}

function sharedEdge(a: RoofVolume, b: RoofVolume): 'v' | 'h' | null {
  const ov = (p0: number, p1: number, q0: number, q1: number) => Math.min(p1, q1) - Math.max(p0, q0) > EPS;
  if ((Math.abs(a.x1 - b.x0) < EPS || Math.abs(b.x1 - a.x0) < EPS) && ov(a.y0, a.y1, b.y0, b.y1)) return 'v';
  if ((Math.abs(a.y1 - b.y0) < EPS || Math.abs(b.y1 - a.y0) < EPS) && ov(a.x0, a.x1, b.x0, b.x1)) return 'h';
  return null;
}

/** kas maht o on serva e vastas (jagab seda serva osaliselt) */
function touches(o: RoofVolume, e: RoofGableEnd): boolean {
  const ov = (p0: number, p1: number) => Math.min(p1, e.to) - Math.max(p0, e.from) > EPS;
  if (e.dir === 'x') return (Math.abs(o.y0 - e.at) < EPS || Math.abs(o.y1 - e.at) < EPS) && ov(o.x0, o.x1);
  return (Math.abs(o.x0 - e.at) < EPS || Math.abs(o.x1 - e.at) < EPS) && ov(o.y0, o.y1);
}

function uniq(v: number[]): number[] {
  const s = [...v].sort((a, b) => a - b);
  return s.filter((x, i) => i === 0 || x - s[i - 1]! > EPS);
}

/**
 * Katuse kalle kõigil mahtudel sama: sisemine kõrgus / sisemine laius põhiosa järgi
 * (ristkülikul = (hari − küljesein) / (laius − 2 × (ülejääk + paksus)), nagu triangleGeometry).
 */
export function pitchRatio(vols: RoofVolume[], input: HouseInput): number {
  const main = vols.find((v) => v.main);
  if (!main) return 0;
  const innerW = volumeSpan(main).across - input.log.thickness;
  return innerW > 0 ? (input.roofHeight - input.sideWallHeight) / innerW : 0;
}

/** Mahu sisend katuse arvutuseks: laius = palk üle harja, sügavus = palk piki harja, hari sama kaldega */
export function volumeInput(input: HouseInput, v: RoofVolume, ratio: number, c: Pick<EngineConstants, 'cornerOverhang'>): HouseInput {
  const t = input.log.thickness;
  const { across, along } = volumeSpan(v);
  const innerW = across - t;
  const { plan: _plan, ...rest } = input;
  return {
    ...rest,
    lengthScenario: 'log',
    width: across + t + 2 * c.cornerOverhang,
    depth: along + t + 2 * c.cornerOverhang,
    roofHeight: input.sideWallHeight + innerW * ratio,
  };
}
