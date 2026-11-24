import { DEFAULT_CONSTANTS } from './constants.js';
import { computeFloor, computeFoundation } from './foundation.js';
import { resolveDimensions, triangleGeometry } from './geometry.js';
import { computePurlins, computeRoof } from './roof.js';
import type { BomLine, CalcResult, EngineConstants, HouseInput, PriceList, RoofResult, Warning } from './types.js';
import { computeLongBoards, computeOpenings, computeWalls } from './walls.js';
import { buildWalls, placeOpenings, wallCutList, type WallId } from './wall-model.js';
import { planGeometry } from './plan.js';
import { pitchRatio, roofVolumes, volumeInput } from './roof-volumes.js';

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
  let roof = computeRoof(input, dimensions, tri, longBoards, c);
  let purlins = computePurlins(input, dimensions, tri, longBoards, c);

  // plaanist viilkatusega maja: katus mahtude kaupa (põhiosa + tiivad, sama kalle)
  if (input.plan && input.roofType === 'gable') {
    const vols = roofVolumes(input.plan, planGeometry(input.plan, input.log.thickness, c));
    if (vols.length) {
      const ratio = pitchRatio(vols, input);
      const parts = vols.map((v) => {
        const vi = volumeInput(input, v, ratio, c);
        const vd = resolveDimensions(vi, c);
        const vt = triangleGeometry(vi, vd, c);
        // pikemad lauad (räästa pikendus) ainult põhiosal
        const lb = v.main ? longBoards : computeLongBoards({ ...vi, longBoards: [] }, vd, c);
        return { roof: computeRoof(vi, vd, vt, lb, c), purlins: computePurlins(vi, vd, vt, lb, c) };
      });
      const [main, ...wings] = parts;
      if (main!.roof) roof = { ...main!.roof, ...(wings.length ? { parts: wings.map((w) => w.roof!).filter(Boolean) } : {}) };
      if (main!.purlins) purlins = { ...main!.purlins, ...(wings.length ? { parts: wings.map((w) => w.purlins!).filter(Boolean) } : {}) };
      if (wings.length) {
        warnings.push({
          code: 'roof.valley',
          message: 'Mitme katuseosaga maja (L/T): tiiva katus on arvestatud ristkülikuna (orgu lõikamata) – katuselaudu on veidi rohkem.',
        });
      }
    }
  }

  // seinamudel ja lõikenimekiri (plaanist või ristkülikust)
  const placedOpenings = placeOpenings(input, dimensions, c);
  const wallModel = buildWalls(input, dimensions, tri, c, placedOpenings, input.plan);
  const cutList = wallModel.map((w) => wallCutList(w, input.log, { maxLogLength: c.maxLogLength }));
  // ava peab mahtuma seina sisse (nurgaliidete vahele)
  for (const w of wallModel) {
    const inner = w.joints.length ? [Math.min(...w.joints.map((j) => j.x)), Math.max(...w.joints.map((j) => j.x))] : [0, w.length];
    for (const o of w.openings) {
      if (o.offset < inner[0]! || o.offset + o.width > inner[1]! || o.width > inner[1]! - inner[0]!) {
        warnings.push({
          code: 'opening.outside',
          message: `${o.kind === 'door' ? 'Uks' : 'Aken'} ${Math.round(o.width)} mm ei mahu seinale ${w.id} (kaugus ${Math.round(o.offset)} mm, seina sisemõõt ${Math.round(inner[1]! - inner[0]!)} mm).`,
        });
      }
    }
  }
  for (const cl of cutList) {
    if (cl.overLength > 0) {
      warnings.push({
        code: 'wall.logTooLong',
        message: `Seinas ${cl.wall} on ${cl.overLength} palki pikemad kui ${c.maxLogLength} mm ja jätkamiseks pole vaheseina.`,
      });
    }
  }

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

  // plaanist maja: seinalauad = lõikenimekirja summa (ristküliku valem ei kehti)
  const wallJm = input.plan ? cutList.reduce((sum, w) => sum + w.totalJm, 0) : walls.netJm;
  add('seinaLauad', wallJm);
  if (walls.netJm > 0) {
    // nurkade vertikaalsed liistud: 4 nurka × seina kõrgus
    const p = input.log.height;
    const pieces =
      input.roofType === 'gable'
        ? [{ count: 4, length: input.sideWallHeight }]
        : [
            { count: 2, length: input.frontBackWallHeight - p },
            { count: 2, length: input.roofHeight - p },
          ];
    add('tuuleLiist', walls.windStripsJm, { pieces });
  }
  if (foundation) {
    const pieces = [{ count: foundation.joistCount, length: foundation.joistLength }];
    if (foundation.ringPieces) pieces.push(foundation.ringPieces);
    add('vundament', foundation.totalJm, { pieces });
  }
  if (floor) add('porandaLauad', floor.totalJm, { pieces: [{ count: floor.boardCount, length: floor.boardLength }] });
  if (roof) {
    const pf = input.roof?.profiles ?? {};
    const all = [roof, ...(roof.parts ?? [])];
    const sum = (f: (r: RoofResult) => number) => all.reduce((acc, r) => acc + f(r), 0);
    add('katuseLauad', sum((r) => r.boardsJm), { pieces: all.map((r) => ({ count: r.boardCount, length: r.boardLength })) });
    // Järjekord nagu tootja joonisel: toelauad (RR) ees, siis RF ja EE (QUESTIONS.md K9)
    add('toelaud38', sum((r) => r.edgeBoards.supportSmall.totalJm), { pieces: all.map((r) => ({ count: 2, length: r.edgeBoards.supportSmall.pieceLength })), profile: pf.supportSmall ?? '38x38' });
    add('toelaud95', sum((r) => r.edgeBoards.supportLarge.totalJm), { pieces: all.map((r) => ({ count: 2, length: r.edgeBoards.supportLarge.pieceLength })), profile: pf.supportLarge ?? '18x95' });
    add('esiraastalaud', sum((r) => r.edgeBoards.fascia.totalJm), { pieces: all.map((r) => ({ count: r.edgeBoards.fascia.count, length: r.edgeBoards.fascia.pieceLength })), profile: pf.fasciaBoard ?? '18x120' });
    add('papikinnituslaud', sum((r) => r.edgeBoards.felt.totalJm), { pieces: all.map((r) => ({ count: r.edgeBoards.felt.count, length: r.edgeBoards.felt.pieceLength })), profile: pf.feltBoard ?? '18x95' });
  }
  if (purlins) {
    const all = [purlins, ...(purlins.parts ?? [])];
    add('parlinid', all.reduce((acc, x) => acc + x.totalJm, 0), { pieces: all.map((x) => ({ count: x.pieces, length: x.length })) });
  }

  // Uksed ja aknad tükiridadena: sama nime, mõõdu ja hinnaga read liidetakse, alareale seinad
  const addOpenings = (list: HouseInput['doors'], kind: 'door' | 'window', word: string) => {
    // paigutatud avad on ridade järjekorras, kogus lahti laotud
    const placed = placedOpenings.filter((p) => p.kind === kind);
    let n = 0;
    const groups = new Map<string, { o: NonNullable<HouseInput['doors']>[number]; count: number; walls: WallId[] }>();
    for (const o of list ?? []) {
      const cnt = o.count > 0 ? Math.floor(o.count) : 0;
      const walls = placed.slice(n, n + cnt).map((p) => p.wall);
      n += cnt;
      if (!(o.count > 0)) continue;
      const price = o.unitPrice !== undefined && o.unitPrice > 0 ? o.unitPrice : 0;
      const key = `${o.name?.trim() ?? ''}|${Math.round(o.width)}|${Math.round(o.height)}|${price}`;
      const g = groups.get(key);
      if (g) {
        g.count += o.count;
        g.walls.push(...walls);
      } else groups.set(key, { o, count: o.count, walls });
    }
    [...groups.values()].forEach(({ o, count, walls }, i) => {
      const label = `${word} ${o.name?.trim() || `${Math.round(o.width)} × ${Math.round(o.height)}`}`;
      const priced = o.unitPrice !== undefined && o.unitPrice > 0;
      const size = o.name ? `${Math.round(o.width)} × ${Math.round(o.height)} mm` : '';
      const where = wallsText(walls);
      const profile = [size, where].filter(Boolean).join(' · ');
      bom.push({
        key: `${kind}:${i}`,
        label,
        quantity: count,
        unit: 'tk',
        ...(profile ? { profile } : {}),
        ...(where ? { walls: [...walls] } : {}),
        ...(priced ? { unitPrice: o.unitPrice, total: count * (o.unitPrice as number) } : {}),
      });
    });
  };
  addOpenings(input.doors, 'door', 'Uks');
  addOpenings(input.windows, 'window', 'Aken');

  const totalPrice = bom.reduce((s, l) => s + (l.total ?? 0), 0);

  return { dimensions, cutList, wallModel, placedOpenings, walls, openings, longBoards, foundation, floor, roof, purlins, bom, totalPrice, warnings };
}

/** „sein A“, „seinad 1, A“, „seinad A ×2, B“ – seinte järjekord 1, 2, A, B */
function wallsText(walls: WallId[]): string {
  if (!walls.length) return '';
  // järjekord: 1, 2, A, B, siis ülejäänud (plaani seinad) tähestiku järgi
  const base: WallId[] = ['1', '2', 'A', 'B'];
  const order = [...base, ...[...new Set(walls)].filter((w) => !base.includes(w)).sort((a, b) => a.localeCompare(b, 'et', { numeric: true }))];
  const counts = order.map((w) => [w, walls.filter((x) => x === w).length] as const).filter(([, c]) => c > 0);
  const parts = counts.map(([w, c]) => (c > 1 ? `${w} ×${c}` : w));
  return `${counts.length === 1 && counts[0]![1] === 1 ? 'sein' : 'seinad'} ${parts.join(', ')}`;
}
