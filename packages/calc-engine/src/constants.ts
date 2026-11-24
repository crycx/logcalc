import type { EngineConstants } from './types.js';

/** Vaikekonstandid – vastavad vanale v2 kõvakodeeritud väärtustele. */
export const DEFAULT_CONSTANTS: Readonly<EngineConstants> = Object.freeze({
  cornerOverhang: 100,
  roofBoardWidth: 110,
  defaultRoofOverhang: 200,
  maxJoistSpacing: 500,
  maxPurlinSpacing: 700,
  longBoardThreshold: 114,
  fasciaExtra: 38,
  defaultFloorGap: 5,
});
