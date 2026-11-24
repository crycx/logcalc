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
import { EPS, greedyRects, planGrid } from './plan-regions.js';
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

export function roofVolumes(plan: HousePlan, geo: WallGeometry[]): RoofVolume[] {
  const grid = planGrid(plan, geo);
  if (!grid) return [];
  // ahne jaotus: suurim täielikult sisemine ristkülik, siis järgmine ülejäänust
  const rects = greedyRects(grid, grid.inside).map(grid.rect);
  if (!rects.length) return [];

  const mainRidge = plan.ridge ?? 'y';
  const vols: RoofVolume[] = rects.map((r, k) => ({
    ...r,
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
      // viil kaob ainult siis, kui teised mahud katavad otsa täielikult; osaliselt kaetud ots jääb viiluks
      // (L-maja harjaga x: põhiosa ots sisenurga seinal B – pool kolmnurgast seinal, teine pool tiiva all)
      const covered = vols.reduce((sum, o, m) => sum + (m !== k ? overlap(o, e) : 0), 0);
      if (covered < e.to - e.from - EPS) ends.push(e);
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

/** kui palju mahust o on serva e vastas (ühise serva pikkus) */
function overlap(o: RoofVolume, e: RoofGableEnd): number {
  const ov = (p0: number, p1: number) => Math.max(0, Math.min(p1, e.to) - Math.max(p0, e.from));
  if (e.dir === 'x') return Math.abs(o.y0 - e.at) < EPS || Math.abs(o.y1 - e.at) < EPS ? ov(o.x0, o.x1) : 0;
  return Math.abs(o.x0 - e.at) < EPS || Math.abs(o.x1 - e.at) < EPS ? ov(o.y0, o.y1) : 0;
}

/**
 * Katuse kalle kõigil mahtudel sama: sisemine kõrgus / sisemine laius kogu maja (ümbritseva ristküliku)
 * järgi põhiosa harjaga risti – nagu ristkülikul (hari − küljesein) / (laius − 2 × (ülejääk + paksus)).
 * L-/T-majal jääb kalle samaks mis sama mõõduga ristkülikul; kitsamate osade harjad on madalamad.
 */
export function pitchRatio(vols: RoofVolume[], input: HouseInput): number {
  const main = vols.find((v) => v.main);
  if (!main) return 0;
  const across =
    main.ridge === 'y'
      ? Math.max(...vols.map((v) => v.x1)) - Math.min(...vols.map((v) => v.x0))
      : Math.max(...vols.map((v) => v.y1)) - Math.min(...vols.map((v) => v.y0));
  const innerW = across - input.log.thickness;
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
