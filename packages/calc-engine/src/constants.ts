import type { EngineConstants } from './types.js';

/**
 * Vaikekonstandid. Algselt v2 kõvakodeeritud väärtused; osa on 2026-11 kalibreeritud
 * Viktra Revit-jooniste järgi (8 maja, vt DEVIATIONS.md D9–D12 ja test/revit-houses.test.ts).
 */
export const DEFAULT_CONSTANTS: Readonly<EngineConstants> = Object.freeze({
  cornerOverhang: 100,
  roofBoardWidth: 110,
  defaultRoofOverhang: 200,
  /** Revit: 508–593 mm (v2: 500) */
  maxJoistSpacing: 600,
  /** Horisontaalne vahe, Revit 8/8 (v2: 700 kaldpinnal) */
  maxPurlinSpacing: 900,
  longBoardThreshold: 114,
  fasciaExtra: 38,
  defaultFloorGap: 5,
  terraceBoardWidth: 120,
  terraceBoardGap: 4,
  floorSideGap: 20,
  joistEndGap: 5,
  /** Katuse- ja räästalaudade pikkus ümardatakse üles (mm) – sentimeetri täpsus */
  roofBoardRounding: 10,
  /** Pikim toodetav palk (mm); pikemad seinad jätkatakse vaheseina kohalt, ridade kaupa vaheliti */
  maxLogLength: 6000,
});
