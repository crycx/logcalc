import { slopeLength, type TriangleGeometry } from './geometry.js';
import type {
  Dimensions,
  EngineConstants,
  HouseInput,
  LongBoardsResult,
  PurlinsResult,
  RoofResult,
} from './types.js';

const round5 = (x: number) => 5 * Math.round(x / 5);

/** Katuse pikkus harja suunas: pikim pikem laud või maja sügavus/laius. */
function roofLengthOf(input: HouseInput, dims: Dimensions, lb: LongBoardsResult): number {
  if (lb.maxLength !== null) return lb.maxLength;
  return input.roofType === 'gable' ? dims.depth : dims.width;
}

/** Katuselauad ja räästalauad (lisaKatus2() + lisakatusKirjuta()). */
export function computeRoof(
  input: HouseInput,
  dims: Dimensions,
  tri: TriangleGeometry,
  lb: LongBoardsResult,
  c: EngineConstants,
): RoofResult | null {
  const r = input.roof;
  if (!r) return null;
  const gable = input.roofType === 'gable';
  const o2 = 2 * c.cornerOverhang;
  const t = input.log.thickness;
  const hyp = slopeLength(tri);
  // v2 kasutas Math.sin(...) asemel asin – siin arvutatakse nurk otse kaatetitest. Vt DEVIATIONS.md (D4).
  const angle = (Math.atan2(tri.slopeRise, tri.slopeRun) * 180) / Math.PI;

  let boardLength: number;
  let computedOverhang: number | null = null;
  const boardLengthIsComputed = !(r.boardLength && r.boardLength > 0);
  if (!boardLengthIsComputed) {
    boardLength = r.boardLength!;
    const outer = gable ? dims.width - o2 : dims.depth - o2;
    computedOverhang = ((boardLength * tri.innerWidth) / hyp - outer) / 2;
  } else {
    const ov = r.overhang && r.overhang > 0 ? r.overhang : c.defaultRoofOverhang;
    const base = tri.innerWidth + 2 * (ov + t);
    const height = (base * tri.innerHeight) / tri.innerWidth;
    boardLength = gable ? Math.hypot(base / 2, height) : Math.hypot(base, height);
  }

  const roofLength = roofLengthOf(input, dims, lb);
  const boardCount = gable
    ? 2 + 2 * Math.round(roofLength / c.roofBoardWidth)
    : 2 + 2 * Math.round(roofLength / c.roofBoardWidth / 2);
  const boardsJm = (boardCount * boardLength) / 1000;

  const n = gable ? 4 : 2;
  // v2 kuvas tüki pikkuseks +38, aga kogupikkuse arvutas +18-ga. Siin ühtne. Vt DEVIATIONS.md (D6).
  const pieceLength = round5(boardLength + c.fasciaExtra);
  const fascia = { count: n, pieceLength, totalJm: (n * pieceLength) / 1000 };
  const felt = { count: n, pieceLength, totalJm: (n * pieceLength) / 1000 };
  const supportSmall = { count: 2, pieceLength: roofLength, totalJm: (2 * roofLength) / 1000 };
  const supportLarge = { count: 2, pieceLength: roofLength, totalJm: (2 * roofLength) / 1000 };

  return {
    angle,
    boardCount,
    boardLength,
    boardLengthIsComputed,
    computedOverhang,
    roofLength,
    boardsJm,
    edgeBoards: {
      fascia,
      felt,
      supportSmall,
      supportLarge,
      totalJm: fascia.totalJm + felt.totalJm + supportSmall.totalJm + supportLarge.totalJm,
    },
  };
}

/** Pärlinid (lisaParlin2() + parlinNimekiri()). */
export function computePurlins(
  input: HouseInput,
  dims: Dimensions,
  tri: TriangleGeometry,
  lb: LongBoardsResult,
  c: EngineConstants,
): PurlinsResult | null {
  const pu = input.purlins;
  if (!pu) return null;
  const gable = input.roofType === 'gable';
  const hyp = slopeLength(tri);
  // Pärlin jookseb katuse pikkuses: viilkatusel sügavus, ühekaldelisel laius (v2-s alati sügavus). Vt DEVIATIONS.md (D8).
  const length = roofLengthOf(input, dims, lb);

  if (gable && pu.ridgeOnly) {
    return { perSide: 0, pieces: 1, hasRidge: true, spacing: null, length, totalJm: length / 1000 };
  }

  let perSide: number;
  let spacing: number;
  if (pu.count && pu.count > 0) {
    perSide = pu.count;
    spacing = hyp / (perSide + 1);
  } else {
    perSide = 0;
    spacing = hyp;
    while (spacing >= c.maxPurlinSpacing) {
      perSide++;
      spacing = hyp / (perSide + 1);
    }
  }
  const pieces = gable ? 2 * perSide + 1 : perSide;
  return { perSide, pieces, hasRidge: gable, spacing, length, totalJm: (pieces * length) / 1000 };
}
