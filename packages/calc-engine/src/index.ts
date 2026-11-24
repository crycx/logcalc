export * from './types.js';
export { DEFAULT_CONSTANTS } from './constants.js';
export { calculateHouse, CalcInputError, type CalculateOptions } from './calculate.js';
export { resolveDimensions, triangleGeometry, slopeLength, courses, type TriangleGeometry } from './geometry.js';
export { computeWalls, computeOpenings, computeLongBoards } from './walls.js';
export { computeFoundation, computeFloor } from './foundation.js';
export { computeRoof, computePurlins } from './roof.js';
export {
  buildWalls,
  placeOpenings,
  wallCutList,
  wallPieces,
  type CutPiece,
  type PlacedPiece,
  type PlacedOpening,
  type WallCutList,
  type WallId,
  type WallRow,
  type WallSpec,
  type WallVoid,
} from './wall-model.js';
export {
  planGeometry,
  planBounds,
  rectanglePlan,
  PlanError,
  type HousePlan,
  type PlanNode,
  type PlanWall,
  type WallGeometry,
  type OpenSection,
  type Railing,
} from './plan.js';
export {
  addWall,
  deleteWall,
  moveWall,
  nextWallId,
  normalizePlan,
  reverseWall,
  setWallSpan,
  updateWall,
  wallLine,
  wallSpan,
  type WallLine,
} from './plan-edit.js';
export { planTemplate, PLAN_TEMPLATES, type PlanTemplateKind, type PlanTemplateInfo, type PlanTemplateOptions } from './plan-templates.js';
