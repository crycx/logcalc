import { DEFAULT_CONSTANTS } from './constants.js';
import { computeFloor, computeFoundation } from './foundation.js';
import { resolveDimensions, triangleGeometry } from './geometry.js';
import { computePurlins, computeRoof } from './roof.js';
import type { BomLine, CalcResult, EngineConstants, HouseInput, PriceList, Warning } from './types.js';
import { computeLongBoards, computeOpenings, computeWalls } from './walls.js';

export class CalcInputError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = 'CalcInputError';
  }
}

export interface CalculateOptions {
  prices?: PriceList;
  constants?: Partial<EngineConstants>;
}

function validate(input: HouseInput): Warning[] {
  const must = (ok: boolean, field: string, msg: string) => {
    if (!ok) throw new CalcInputError(msg, field);
  };
  const pos = (v: number) => Number.isFinite(v) && v > 0;
  must(pos(input.width), 'width', 'Laius peab olema positiivne arv.');
  must(pos(input.depth), 'depth', 'Pikkus peab olema positiivne arv.');
  must(pos(input.log.height), 'log.height', 'Palgi kõrgus peab olema positiivne arv.');
  must(Number.isFinite(input.log.thickness) && input.log.thickness >= 0, 'log.thickness', 'Palgi paksus ei tohi olla negatiivne.');
  must(pos(input.frontBackWallHeight), 'frontBackWallHeight', 'Esi/tagaseina kõrgus peab olema positiivne arv.');
  must(pos(input.roofHeight), 'roofHeight', 'Katuse kõrgus peab olema positiivne arv.');

  const warnings: Warning[] = [];
  if (input.roofType === 'gable') {
    must(pos(input.sideWallHeight), 'sideWallHeight', 'Küljeseina kõrgus peab olema positiivne arv.');
    if (input.roofHeight <= input.sideWallHeight)
      warnings.push({ code: 'roof.noGable', message: 'Harja kõrgus ei ole küljeseinast kõrgem – viilu ei teki.' });
  } else if (input.frontBackWallHeight <= input.roofHeight) {
    warnings.push({ code: 'roof.noSlope', message: 'Esisein ei ole tagaseinast kõrgem – kallet ei teki.' });
  }
  return warnings;
}

const LABELS: Record<keyof PriceList, string> = {
  seinaLauad: 'Seinalauad',
  tuuleLiist: 'Tuuleliistud',
  katuseLauad: 'Katuselauad',
  parlinid: 'Pärlinid',
  porandaLauad: 'Põrandalauad',
  vundament: 'Vundamendi prussid',
  esiraastalaud: 'Esiräästalaud (RF)',
  papikinnituslaud: 'Papikinnituslaud (EE)',
  toelaud38: 'Katuselaudade toelaud',
  toelaud95: 'Katuselaudade toelaud (suurem)',
};

/**
 * Peafunktsioon: maja sisend -> kogu materjalikulu.
 * Puhas funktsioon: sama sisend annab alati sama tulemuse, DOM-i ega globaalset olekut ei kasutata.
 */
export function calculateHouse(input: HouseInput, options: CalculateOptions = {}): CalcResult {
  const c: EngineConstants = { ...DEFAULT_CONSTANTS, ...options.constants };
  const warnings = validate(input);

  const dimensions = resolveDimensions(input, c);
  const tri = triangleGeometry(input, dimensions, c);
  const longBoards = computeLongBoards(input, dimensions, c);
  const openings = computeOpenings(input);
  const walls = computeWalls(input, dimensions, tri, longBoards, openings, c);
  const foundation = computeFoundation(input, dimensions, c, warnings);
  const floor = computeFloor(input, dimensions, c);
  const roof = computeRoof(input, dimensions, tri, longBoards, c);
  const purlins = computePurlins(input, dimensions, tri, longBoards, c);

  const prices = options.prices ?? {};
  const bom: BomLine[] = [];
  const add = (key: keyof PriceList, quantity: number, extra: Partial<BomLine> = {}) => {
    if (!(quantity > 0)) return;
    const unitPrice = prices[key];
    bom.push({
      key,
      label: LABELS[key],
      quantity,
      unit: 'jm',
      ...extra,
      ...(unitPrice !== undefined ? { unitPrice, total: quantity * unitPrice } : {}),
    });
  };

  add('seinaLauad', walls.netJm);
  if (walls.netJm > 0) add('tuuleLiist', walls.windStripsJm);
  if (foundation) {
    const pieces = [{ count: foundation.joistCount, length: foundation.joistLength }];
    if (foundation.ringPieces) pieces.push(foundation.ringPieces);
    add('vundament', foundation.totalJm, { pieces });
  }
  if (floor) add('porandaLauad', floor.totalJm, { pieces: [{ count: floor.boardCount, length: floor.boardLength }] });
  if (roof) {
    const pf = input.roof?.profiles ?? {};
    add('katuseLauad', roof.boardsJm, { pieces: [{ count: roof.boardCount, length: roof.boardLength }] });
    const e = roof.edgeBoards;
    add('esiraastalaud', e.fascia.totalJm, { pieces: [{ count: e.fascia.count, length: e.fascia.pieceLength }], profile: pf.fasciaBoard ?? '18x120' });
    add('papikinnituslaud', e.felt.totalJm, { pieces: [{ count: e.felt.count, length: e.felt.pieceLength }], profile: pf.feltBoard ?? '18x95' });
    add('toelaud38', e.supportSmall.totalJm, { pieces: [{ count: 2, length: e.supportSmall.pieceLength }], profile: pf.supportSmall ?? '38x38' });
    add('toelaud95', e.supportLarge.totalJm, { pieces: [{ count: 2, length: e.supportLarge.pieceLength }], profile: pf.supportLarge ?? '18x95' });
  }
  if (purlins) add('parlinid', purlins.totalJm, { pieces: [{ count: purlins.pieces, length: purlins.length }] });

  const totalPrice = bom.reduce((s, l) => s + (l.total ?? 0), 0);

  return { dimensions, walls, openings, longBoards, foundation, floor, roof, purlins, bom, totalPrice, warnings };
}
