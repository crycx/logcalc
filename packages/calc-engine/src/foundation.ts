import type { Dimensions, EngineConstants, FloorResult, FoundationResult, HouseInput, Warning } from './types.js';

/**
 * Vundamendi prussid (lisaPorandVundament() + vundamentKirjuta()).
 * Automaatne arv: väikseim prusside arv, mille korral kesktelgede vahe < maxJoistSpacing.
 */
export function computeFoundation(
  input: HouseInput,
  dims: Dimensions,
  c: EngineConstants,
  warnings: Warning[],
): FoundationResult | null {
  const f = input.foundation;
  if (!f) return null;
  const dir = input.floorDirection ?? 'AB';
  const o2 = 2 * c.cornerOverhang;
  const k12 = f.distanceFromWall12 ?? 0;
  const kAB = f.distanceFromWallAB ?? 0;
  const jw = f.joistWidth;

  // NB: AB suunas kasutab v2 nii vahe kui pikkuse jaoks kaugust k12. Vt QUESTIONS.md (K3).
  const span = dir === 'AB' ? dims.width - 2 * k12 - o2 - jw : dims.depth - 2 * kAB - o2 - jw;
  const baseLength = dir === 'AB' ? dims.depth - 2 * k12 - o2 : dims.width - 2 * kAB - o2;
  // Revit: prussi otstes 5 mm vahe (v2: täispikk). DEVIATIONS.md D11.
  const gap = 2 * c.joistEndGap;
  const joistLength = (f.ring ? baseLength - 2 * jw : baseLength) - gap;

  let joistCount: number;
  let spacing: number;
  if (f.count && f.count > 0) {
    joistCount = f.count;
    spacing = joistCount > 1 ? span / (joistCount - 1) : 0;
    if (joistCount < 2) warnings.push({ code: 'foundation.singleJoist', message: 'Vähemalt 2 prussi on vajalik.' });
  } else {
    const maxSpacing = f.maxSpacing && f.maxSpacing > 0 ? f.maxSpacing : c.maxJoistSpacing;
    joistCount = 2;
    spacing = span;
    while (spacing >= maxSpacing) {
      joistCount++;
      spacing = span / (joistCount - 1);
    }
  }
  if (span <= 0) warnings.push({ code: 'foundation.span', message: 'Prusside paigutusala on 0 või negatiivne.' });

  let ringPieces: FoundationResult['ringPieces'] = null;
  if (f.ring) {
    const length = (dir === 'AB' ? dims.width - 2 * kAB - o2 : dims.depth - 2 * k12 - o2) - gap;
    ringPieces = { count: 2, length };
  }
  const totalJm = (joistCount * joistLength) / 1000 + (ringPieces ? (ringPieces.count * ringPieces.length) / 1000 : 0);
  return { joistCount, spacing, joistLength, ringPieces, totalJm };
}

/** Põrandalauad (porandKirjuta()). */
export function computeFloor(input: HouseInput, dims: Dimensions, c: EngineConstants): FloorResult | null {
  const fl = input.floor;
  if (!fl || !(fl.boardWidth > 0)) return null;
  const dir = input.floorDirection ?? 'AB';
  const o2 = 2 * c.cornerOverhang;
  const t2 = 2 * input.log.thickness;
  const gap = fl.distanceFromWall ?? c.defaultFloorGap;
  const across = dir === 'AB' ? dims.depth : dims.width;
  const along = dir === 'AB' ? dims.width : dims.depth;
  // Revit: 20 mm vahe seinast kummalgi pool, ilma lisalauata (v2: +1). DEVIATIONS.md D12.
  const boardCount = Math.ceil((across - o2 - t2 - 2 * c.floorSideGap) / fl.boardWidth - 1e-9);
  const boardLength = along - o2 - t2 - gap;
  return { boardCount, boardLength, totalJm: (boardCount * boardLength) / 1000 };
}
