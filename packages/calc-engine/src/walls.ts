import { courses, type TriangleGeometry } from './geometry.js';
import type {
  Dimensions,
  EngineConstants,
  HouseInput,
  LongBoardsResult,
  Opening,
  OpeningsResult,
  WallsBreakdown,
  WallsResult,
} from './types.js';

/**
 * Osalise rea lisa ühe seina kohta: üks täispikk laud, kui kõrgus ei jagu palgi kõrgusega.
 * Esi/tagasein algab poole palgiga (nt 40x57), seega kõrgus on tavaliselt X,5 rida.
 * v2-s oli 1/murdosa: 0,5 korral = 2 (õige, 1 pool palki kummalegi seinale),
 * täisarvu korral lõpmatus, muu murdosa korral vale. Vt DEVIATIONS.md (D1).
 */
function partialCourse(frac: number): number {
  return frac > 0 ? 1 : 0;
}

/** pikemLaudSum2() */
export function computeLongBoards(input: HouseInput, dims: Dimensions, c: EngineConstants): LongBoardsResult {
  let tallJm = 0;
  let tallCount = 0;
  let lowJm = 0;
  let lowCount = 0;
  let maxLength: number | null = null;
  for (const b of input.longBoards ?? []) {
    if (b.height > c.longBoardThreshold) {
      tallJm += (b.length * b.count) / 1000;
      tallCount += b.count;
    } else {
      lowJm += (b.length * b.count) / 1000;
      lowCount += b.count;
    }
    maxLength = maxLength === null ? b.length : Math.max(maxLength, b.length);
  }
  const base = input.roofType === 'gable' ? dims.depth : dims.width;
  return {
    tallJm,
    tallCount,
    lowJm,
    lowCount,
    tallExtraJm: tallJm - (tallCount * base) / 1000,
    lowExtraJm: lowJm - (lowCount * base) / 1000,
    maxLength,
  };
}

function openingSum(list: Opening[] | undefined, logHeight: number): { area: number; jm: number } {
  let area = 0;
  let jm = 0;
  for (const o of list ?? []) {
    area += (o.width * o.height * o.count) / 1_000_000;
    jm += (o.width * Math.ceil(o.height / logHeight) * o.count) / 1000;
  }
  return { area, jm };
}

/** uksedSum() / aknadSum(). v2 ei nullinud pindala summat – siin arvutatakse alati nullist. */
export function computeOpenings(input: HouseInput): OpeningsResult {
  const d = openingSum(input.doors, input.log.height);
  const w = openingSum(input.windows, input.log.height);
  return { doorsArea: d.area, doorsJm: d.jm, windowsArea: w.area, windowsJm: w.jm };
}

/** arvuta() + arvuta2() + arvutaUus() seinte osa. */
export function computeWalls(
  input: HouseInput,
  dims: Dimensions,
  tri: TriangleGeometry,
  longBoards: LongBoardsResult,
  openings: OpeningsResult,
  c: EngineConstants,
): WallsResult {
  const p = input.log.height;
  const W = dims.width;
  const D = dims.depth;
  const o2 = 2 * c.cornerOverhang;
  const hS = input.sideWallHeight;
  const hFb = input.frontBackWallHeight;
  const hR = input.roofHeight;

  const gableJm = (2 * tri.courses.reduce((s, x) => s + x.length, 0)) / 1000;
  const breakdown: WallsBreakdown = { sides: 0, longBoards: longBoards.tallJm };
  let totalJm: number;

  if (input.roofType === 'gable') {
    const fb = courses(hFb, p);
    const side = courses(hS, p);
    const sideDeduct = side.frac > 0 ? 1 : 0; // lahutatav
    // 2 seina x (täisread + osaline rida). Osaline rida (pool palki) eraldi, et BOM saaks näidata profiili.
    breakdown.frontBackPartial = (2 * partialCourse(fb.frac) * W) / 1000;
    breakdown.frontBack = (fb.full * W * 2) / 1000 + breakdown.frontBackPartial;
    breakdown.sides = ((side.full - sideDeduct) * D * 2) / 1000 + longBoards.lowExtraJm;
    breakdown.gables = gableJm;
    breakdown.longBoards = longBoards.tallJm;
    totalJm = breakdown.frontBack + breakdown.sides + gableJm + longBoards.tallJm;
  } else {
    // v2: (floor(h/p) - lahutatav) + 1/murdosa; 0,5 korral = täisread + 1. Ühe seina kohta.
    const front = courses(hFb, p);
    const back = courses(hR, p);
    breakdown.frontPartial = (partialCourse(front.frac) * W) / 1000;
    breakdown.backPartial = (partialCourse(back.frac) * W) / 1000;
    breakdown.front = (front.full * W) / 1000 + breakdown.frontPartial + longBoards.lowExtraJm / 2;
    breakdown.back = (back.full * W) / 1000 + breakdown.backPartial + longBoards.lowExtraJm / 2;
    breakdown.sides = (Math.floor((hR - p / 2) / p + 1e-9) * D * 2) / 1000;
    breakdown.triangles = gableJm;
    breakdown.longBoards = longBoards.tallJm;
    totalJm = breakdown.front + breakdown.back + breakdown.sides + gableJm + longBoards.tallJm;
  }

  const netJm = totalJm - openings.doorsJm - openings.windowsJm;
  const footW = W - o2;
  const footD = D - o2;
  const footprintArea = (footW * footD) / 1_000_000;

  let volume: number;
  let windStripsJm: number;
  if (input.roofType === 'gable') {
    volume = (footW * hS * footD) / 1e9 + (footW * (hR - hS)) / 2 / 1e6 * (footD / 1000);
    windStripsJm = (4 * hS) / 1000;
  } else {
    // Geomeetriliselt õige: risttahukas madalama seina kõrguseni + kiil. Vt DEVIATIONS.md (D5).
    volume = (footW * footD * hR) / 1e9 + (0.5 * footW * footD * (hFb - hR)) / 1e9;
    windStripsJm = (2 * (hFb - p)) / 1000 + (2 * (hR - p)) / 1000;
  }

  return { totalJm, netJm, gableCourses: tri.courses, gableJm, breakdown, footprintArea, volume, windStripsJm };
}
