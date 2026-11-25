import { slopeLength, type TriangleGeometry } from './geometry.js';
import type {
  Dimensions,
  EngineConstants,
  HouseInput,
  LongBoardsResult,
  PurlinsResult,
  RoofResult,
} from './types.js';

/** Ühekalde räästa esiräästalaud: katuse pikkus + 36 (Revit Carina RF2 3789 = 3753 + 36) */
const MONO_EAVE_FASCIA_EXTRA = 36;

/** Ümardus üles sammuni (nt 10 mm). 0/negatiivne = ilma ümarduseta. */
const ceilTo = (x: number, step: number) => (step > 0 ? step * Math.ceil(x / step - 1e-9) : x);

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
  const t = input.log.thickness;
  const hyp = slopeLength(tri);
  // v2 kasutas Math.sin(...) asemel asin – siin arvutatakse nurk otse kaatetitest. Vt DEVIATIONS.md (D4).
  const angle = (Math.atan2(tri.slopeRise, tri.slopeRun) * 180) / Math.PI;

  let boardLength: number;
  const boardLengthIsComputed = !(r.boardLength && r.boardLength > 0);
  if (!boardLengthIsComputed) {
    boardLength = r.boardLength!;
  } else {
    // min üleulatus -> laua pikkus, ümardatud üles sentimeetrini (QUESTIONS.md K14)
    const ov = r.overhang && r.overhang > 0 ? r.overhang : c.defaultRoofOverhang;
    const base = tri.innerWidth + 2 * (ov + t);
    const height = (base * tri.innerHeight) / tri.innerWidth;
    boardLength = ceilTo(gable ? Math.hypot(base / 2, height) : Math.hypot(base, height), c.roofBoardRounding);
  }
  // tegelik üleulatus laua pikkusest: alus = L × sisemine laius / kaldpind (mõlemal katusetüübil)
  const computedOverhang = ((boardLength * tri.innerWidth) / hyp - tri.innerWidth) / 2 - t;

  const roofLength = roofLengthOf(input, dims, lb);
  // Revit: alla(katuse pikkus / laua laius) katusepoole kohta (v2: 2 + 2 × ümar). DEVIATIONS.md D9.
  const perSlope = Math.floor(roofLength / c.roofBoardWidth + 1e-9);
  const boardCount = gable ? 2 * perSlope : perSlope;
  const boardsJm = (boardCount * boardLength) / 1000;

  const n = gable ? 4 : 2;
  // v2 kuvas tüki pikkuseks +38, aga kogupikkuse arvutas +18-ga. Siin ühtne. Vt DEVIATIONS.md (D6).
  const pieceLength = ceilTo(boardLength + c.fasciaExtra, c.roofBoardRounding);
  const piece = (count: number, len: number) => ({ count, pieceLength: len, totalJm: (count * len) / 1000 });
  const fascia = piece(n, pieceLength);
  const felt = piece(n, pieceLength);
  const supportSmall = piece(2, roofLength);
  // viilkatus: suurem toelaud räästas (Revit RR1 18x95); ühekalle (Revit Carina, D17): räästas esiräästalaud
  // 18x120 (katuse pikkus + 36), suuremat toelauda pole
  const supportLarge = piece(gable ? 2 : 0, roofLength);
  const fasciaEave = gable ? undefined : piece(2, roofLength + MONO_EAVE_FASCIA_EXTRA);

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
      ...(fasciaEave ? { fasciaEave } : {}),
      totalJm: fascia.totalJm + felt.totalJm + supportSmall.totalJm + supportLarge.totalJm + (fasciaEave?.totalJm ?? 0),
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
  // Revit: vahe mõõdetakse horisontaalselt (v2: kaldpinna pikkus). DEVIATIONS.md D10.
  const run = tri.slopeRun;
  // Pärlin jookseb katuse pikkuses: viilkatusel sügavus, ühekaldelisel laius (v2-s alati sügavus). Vt DEVIATIONS.md (D8).
  const length = roofLengthOf(input, dims, lb);

  if (gable && pu.ridgeOnly) {
    return { perSide: 0, pieces: 1, hasRidge: true, spacing: null, length, totalJm: length / 1000 };
  }

  let perSide: number;
  let spacing: number;
  if (pu.count && pu.count > 0) {
    perSide = pu.count;
    spacing = run / (perSide + 1);
  } else {
    perSide = 0;
    spacing = run;
    while (spacing >= c.maxPurlinSpacing) {
      perSide++;
      spacing = run / (perSide + 1);
    }
  }
  const pieces = gable ? 2 * perSide + 1 : perSide;
  return { perSide, pieces, hasRidge: gable, spacing, length, totalJm: (pieces * length) / 1000 };
}
