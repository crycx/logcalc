import type { Dimensions, EngineConstants, GableCourse, HouseInput } from './types.js';

const EPS = 1e-9;

/** Täis- ja murdosa: h/p = full + frac. Kaitseb ujukomavigade eest (nt 2030/145). */
export function courses(height: number, logHeight: number): { full: number; frac: number } {
  const ratio = height / logHeight;
  const rounded = Math.round(ratio);
  if (Math.abs(ratio - rounded) < EPS) return { full: rounded, frac: 0 };
  const full = Math.floor(ratio);
  return { full, frac: ratio - full };
}

/**
 * Arvutuslikud mõõdud = palgi pikkus (moodud()).
 *
 * v2-s: sise +280, välis +200. +200 = 2 x nurgaülejääk.
 * +280 eeldas palgi paksust 40 mm; siin arvestatakse tegelikku paksust:
 * sise -> + 2 x (ülejääk + paksus). Vt DEVIATIONS.md (D3).
 */
export function resolveDimensions(input: HouseInput, c: EngineConstants): Dimensions {
  const o = c.cornerOverhang;
  const t = input.log.thickness;
  switch (input.lengthScenario) {
    case 'inner':
      return { width: input.width + 2 * (o + t), depth: input.depth + 2 * (o + t) };
    case 'outer':
      return { width: input.width + 2 * o, depth: input.depth + 2 * o };
    case 'log':
    default:
      return { width: input.width, depth: input.depth };
  }
}

/**
 * Viilu (viilkatus) või külgseina kolmnurga (ühekaldeline) geomeetria (arvutaUus()).
 * - slopeRun / slopeRise: katuse kaldepinna kaatetid (kaatet1 / kaatet2)
 * - courses: kolmnurga palgid (ühe viilu/külje kohta)
 */
export interface TriangleGeometry {
  /** gableArvutuslikLaius | kolmnurkArvutuslikLaius */
  innerWidth: number;
  /** gableArvutuslikKorgus | kolmnurkArvutuslikKorgus */
  innerHeight: number;
  /** kaatet1 */
  slopeRun: number;
  /** kaatet2 */
  slopeRise: number;
  courses: GableCourse[];
}

export function triangleGeometry(
  input: HouseInput,
  dims: Dimensions,
  c: EngineConstants,
): TriangleGeometry {
  const p = input.log.height;
  const t = input.log.thickness;
  const o = c.cornerOverhang;
  const list: GableCourse[] = [];

  if (input.roofType === 'gable') {
    const innerWidth = dims.width - 2 * (o + t);
    const innerHeight = input.roofHeight - input.sideWallHeight;
    const n = Math.max(0, Math.ceil((input.roofHeight - input.frontBackWallHeight) / p - EPS));
    for (let i = 1; i <= n; i++) {
      const distanceFromTop = (n + 1 - i) * p;
      const length = i === 1 ? dims.width : (innerWidth * distanceFromTop) / innerHeight;
      list.push({ index: i, distanceFromTop, length });
    }
    return { innerWidth, innerHeight, slopeRun: innerWidth / 2, slopeRise: innerHeight, courses: list };
  }

  // Ühekaldeline: kolmnurk külgseintel (kõrgem esisein -> madalam tagasein)
  const drop = input.frontBackWallHeight - input.roofHeight;
  const innerWidth = dims.depth - (2 * o + t);
  const innerHeight = (drop * (dims.depth - (o + t))) / innerWidth;
  const raise = innerHeight - drop; // kolmnurgaKorgendus
  const n = Math.max(0, Math.ceil((input.frontBackWallHeight - (input.roofHeight - p / 2)) / p - EPS));
  for (let i = 1; i <= n; i++) {
    const distanceFromTop = (n + 1 - i) * p - p / 2 + raise;
    const length = i === 1 ? dims.depth : (innerWidth * distanceFromTop) / (innerHeight - raise);
    list.push({ index: i, distanceFromTop, length });
  }
  return { innerWidth, innerHeight, slopeRun: innerWidth, slopeRise: innerHeight, courses: list };
}

/** Kaldepinna pikkus (hypotenuus). */
export function slopeLength(g: TriangleGeometry): number {
  return Math.hypot(g.slopeRun, g.slopeRise);
}
