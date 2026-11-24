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
  return dominate(vols);
}

/**
 * Tiib, mis on teise mahu räästa vastas ja sellest laiem (sama kalde juures kõrgem hari), läbib nurga:
 * teise mahu riba tiiva laiuses läheb tiivale (ristviil), kitsam osa liitub tiivaga oruga.
 * Muidu jääks kõrgem tiiva hari madalama katuse kohal õhku.
 */
function dominate(input: RoofVolume[]): RoofVolume[] {
  let vols = input.map((v) => ({ ...v }));
  for (let guard = 0; guard < 10; guard++) {
    let next: RoofVolume[] | null = null;
    for (let k = 0; k < vols.length && !next; k++) {
      const w = vols[k]!;
      for (let h = 0; h < vols.length && !next; h++) {
        const o = vols[h]!;
        if (h === k || o.ridge === w.ridge) continue;
        const se = sharedEdge(o, w);
        // ühine serv peab olema o räästas (paralleelne o harjaga)
        if (!((se === 'v' && o.ridge === 'y') || (se === 'h' && o.ridge === 'x'))) continue;
        if (volumeSpan(w).across <= volumeSpan(o).across + EPS) continue;
        const ry = o.ridge === 'y'; // o hari y -> tiiva hari x, tiiva laius y-suunas
        const s0 = ry ? w.y0 : w.x0;
        const s1 = ry ? w.y1 : w.x1;
        const o0 = ry ? o.y0 : o.x0;
        const o1 = ry ? o.y1 : o.x1;
        if (s0 < o0 - EPS || s1 > o1 + EPS) continue; // tiib peab jääma o külje sisse
        const grown: RoofVolume = ry
          ? { ...w, x0: Math.min(o.x0, w.x0), x1: Math.max(o.x1, w.x1) }
          : { ...w, y0: Math.min(o.y0, w.y0), y1: Math.max(o.y1, w.y1) };
        const rest: RoofVolume[] = [];
        if (s0 - o0 > EPS) rest.push(ry ? { ...o, y1: s0 } : { ...o, x1: s0 });
        if (o1 - s1 > EPS) rest.push(ry ? { ...o, y0: s1 } : { ...o, x0: s1 });
        // põhiosa jääb o suuremale tükile (või tiivale, kui o kaob)
        rest.sort((a, b) => volumeSpan(b).along - volumeSpan(a).along);
        rest.forEach((r, i) => (r.main = o.main && i === 0));
        grown.main = w.main || (o.main && !rest.length);
        next = vols.flatMap((v, i) => (i === k ? [grown] : i === h ? rest : [v]));
      }
    }
    if (!next) break;
    vols = next;
  }
  // põhiosa ees (katuse arvutus: esimene = põhiosa)
  return [...vols.filter((v) => v.main), ...vols.filter((v) => !v.main)];
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

/** Tiiva katus harja suunas: kust kuhu katuselauad ulatuvad (WALL-GRAPH.md, etapp 4 – org) */
export interface WingSpan {
  /** katuselaudade ala pikkus harja suunas (vabast viilust teise mahu räästa jooneni / seinani) */
  length: number;
  /** vabade viiluotste arv (esiräästa- ja papikinnituslauad ainult neis) */
  gableEnds: number;
  /** pärlinite pikkus: oru poolt ulatub tiiva hari põhiosa katusesse (ristlõike pool laiust) */
  purlinLength: number;
  /** kas mõni ots on teise mahu räästa vastas (org) */
  valley: boolean;
}

/**
 * Mahu k katuse ulatus harja suunas.
 * - vaba ots: palgi otsani (kesktelg + t/2 + nurga ülejääk) – viil nagu ristkülikul;
 * - teise mahu räästa vastas (org): selle räästa jooneni (kesktelg + t/2 + räästa üleulatus) – põhiosa lauad
 *   lõigatakse orus ja lõikejäägid (45°, sama kalle) on täpselt tiiva oru lauad, seega tiivale lisa pole vaja;
 * - teise mahu viilu vastas: seina välispinnani.
 * Ilma ühendusteta maht annab sama pikkuse mis ristkülik (along + t + 2 × ülejääk).
 */
export function wingSpan(
  vols: RoofVolume[],
  k: number,
  t: number,
  c: Pick<EngineConstants, 'cornerOverhang'>,
  hostOverhang: (m: number) => number,
): WingSpan {
  const v = vols[k]!;
  const { along, across } = volumeSpan(v);
  const ends: RoofGableEnd[] =
    v.ridge === 'y'
      ? [
          { volume: k, dir: 'x', at: v.y0, from: v.x0, to: v.x1 },
          { volume: k, dir: 'x', at: v.y1, from: v.x0, to: v.x1 },
        ]
      : [
          { volume: k, dir: 'y', at: v.x0, from: v.y0, to: v.y1 },
          { volume: k, dir: 'y', at: v.x1, from: v.y0, to: v.y1 },
        ];
  let length = along;
  let purlinLength = along;
  let gableEnds = 0;
  let valley = false;
  for (const e of ends) {
    let host = -1;
    let best = EPS;
    vols.forEach((o, m) => {
      const ov = m !== k ? overlap(o, e) : 0;
      if (ov > best) {
        best = ov;
        host = m;
      }
    });
    if (host < 0) {
      length += t / 2 + c.cornerOverhang;
      purlinLength += t / 2 + c.cornerOverhang;
      gableEnds++;
    } else if (vols[host]!.ridge === e.dir) {
      // teise mahu räästas (hari serva suunas): tiiva lauad kuni räästa jooneni, hari ulatub orus edasi
      length -= t / 2 + hostOverhang(host);
      purlinLength += across / 2;
      valley = true;
    } else {
      // teise mahu viilusein: kuni seina välispinnani
      length -= t / 2;
      purlinLength -= t / 2;
    }
  }
  return { length, gableEnds, purlinLength, valley };
}
