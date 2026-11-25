import { DEFAULT_CONSTANTS } from './constants.js';
import { computeFloor, computeFoundation } from './foundation.js';
import { resolveDimensions, triangleGeometry } from './geometry.js';
import { computePurlins, computeRoof } from './roof.js';
import type { BomLine, CalcResult, EngineConstants, HouseInput, PriceList, RoofResult, Warning } from './types.js';
import { computeLongBoards, computeOpenings, computeWalls } from './walls.js';
import { buildWalls, placeOpenings, wallCutList, type WallId } from './wall-model.js';
import { materialCutList } from './materials.js';
import { planGeometry, rectanglePlan } from './plan.js';
import { houseModel3d } from './model3d.js';
import { WINDBOARD, computeWindboards, type Windboard } from './windboards.js';
import { pitchRatio, roofVolumes, volumeInput, wingSpan, type WingSpan } from './roof-volumes.js';
import { planFloor, planFoundation } from './floor-plan.js';
import { outerArea, outlineCorners, planGrid, solidBelow } from './plan-regions.js';

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
  terrassiLauad: 'Terrassilauad',
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
  // plaanist maja: põrand ruumide kaupa, vundament lõikude kaupa, pindala ja nurgad plaani järgi
  const planGeo = input.plan ? planGeometry(input.plan, input.log.thickness, c) : null;
  const grid = input.plan && planGeo ? planGrid(input.plan, planGeo) : null;
  // põrand/vundament: ala, mida piiravad alt olemas seinad (lahtine veranda „ainult viil“ esiseinaga jääb välja)
  const floorGrid = input.plan && planGeo ? planGrid(input.plan, planGeo, solidBelow) : null;
  const foundation =
    input.plan && planGeo ? planFoundation(input, input.plan, planGeo, c, warnings, floorGrid) : computeFoundation(input, dimensions, c, warnings);
  const floor = input.plan && planGeo ? planFloor(input, input.plan, planGeo, c, floorGrid) : computeFloor(input, dimensions, c);
  if (grid) {
    const rectArea = walls.footprintArea;
    walls.footprintArea = outerArea(grid, input.log.thickness);
    if (rectArea > 0) walls.volume *= walls.footprintArea / rectArea;
  }
  let roof = computeRoof(input, dimensions, tri, longBoards, c);
  let purlins = computePurlins(input, dimensions, tri, longBoards, c);

  // plaanist viilkatusega maja: katus mahtude kaupa (põhiosa + tiivad, sama kalle)
  if (input.plan && input.roofType === 'gable') {
    const vols = roofVolumes(input.plan, planGeo!);
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
      // teise mahuga liituv osa: katus vabast viilust teise mahu räästa jooneni (org) või seinani; läbiv (kõrgem)
      // maht jääb täislaudadega (orus lõigatud laudade jäägid katavad liituva osa oru – sama kalle, 45°)
      const t = input.log.thickness;
      const ovOf = (m: number) => parts[m]?.roof?.computedOverhang ?? input.roof?.overhang ?? c.defaultRoofOverhang;
      parts.forEach((p, k) => {
        const span = wingSpan(vols, k, t, c, ovOf);
        // ilma ühendusteta osa (ka põhiosa pikemate laudadega) jääb nagu ristkülik
        if (span.gableEnds >= 2) return;
        if (p.roof) p.roof = trimRoof(p.roof, span, c);
        if (p.purlins) p.purlins = { ...p.purlins, length: span.purlinLength, totalJm: (p.purlins.pieces * span.purlinLength) / 1000 };
      });
      const [main, ...wings] = parts;
      if (main!.roof) roof = { ...main!.roof, ...(wings.length ? { parts: wings.map((w) => w.roof!).filter(Boolean) } : {}) };
      if (main!.purlins) purlins = { ...main!.purlins, ...(wings.length ? { parts: wings.map((w) => w.purlins!).filter(Boolean) } : {}) };
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
      // ava seina lahtises osas (terrass, veranda, sissepääs): seal palke pole
      const area = o.width * o.height;
      const inOpen = (w.voids ?? [])
        .filter((v) => v.kind === 'open')
        .reduce((sum, v) => sum + Math.max(0, Math.min(v.x1, o.offset + o.width) - Math.max(v.x0, o.offset)) * Math.max(0, Math.min(v.y1, o.sill + o.height) - Math.max(v.y0, o.sill)), 0);
      if (area > 0 && inOpen > area / 2) {
        warnings.push({
          code: 'opening.inOpen',
          message: `${o.kind === 'door' ? 'Uks' : 'Aken'} ${Math.round(o.width)} mm on seina ${w.id} lahtises osas (terrass/veranda – seal palke pole). Vali ruumi sein.`,
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

  // tuuleliistud: toas viiluseintel, lõigatud katuse alla (katusejoon 3D mudelist, ilma muu puiduta)
  let windboards: Windboard[] = [];
  try {
    const wbPlan = input.plan ?? rectanglePlan(dimensions.width, dimensions.depth, input.log.thickness, c);
    const wbGeo = planGeo ?? planGeometry(wbPlan, input.log.thickness, c);
    const pre = { dimensions, cutList, materials: [], windboards: [], wallModel, placedOpenings, walls, openings, longBoards, foundation, floor, roof, purlins, bom: [], totalPrice: 0, warnings: [] } as CalcResult;
    const m = houseModel3d(input, pre, c, { members: false });
    windboards = computeWindboards(
      wbPlan,
      wbGeo,
      wallModel,
      new Map(m.walls.map((w) => [w.id, w.roofLine])),
      (id) => wbPlan.walls.find((x) => x.id === id)?.topOnly !== undefined,
      input.log.thickness,
    );
  } catch {
    windboards = [];
  }
  // tuuleliist ava kohal (uks/aken 200 mm nurgast)
  for (const wb of windboards) {
    const w = wallModel.find((x) => x.id === wb.wall);
    const o = w?.openings.find((o) => o.offset < wb.x + WINDBOARD.width / 2 && o.offset + o.width > wb.x - WINDBOARD.width / 2 && o.sill < wb.z1 && o.sill + o.height > wb.z0);
    if (o) {
      warnings.push({
        code: 'windboard.opening',
        message: `Tuuleliist seinal ${wb.wall} (${WINDBOARD.fromCorner} mm nurgast) jääb ${o.kind === 'door' ? 'ukse' : 'akna'} kohale – nihuta ava nurgast kaugemale.`,
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
  if (walls.netJm > 0 && windboards.length) {
    // tuuleliistud: tarnepikkus 2200 (Revit „Windboard 18x40“), lõikepikkused lõikenimekirjas
    add('tuuleLiist', (windboards.length * WINDBOARD.stock) / 1000, {
      pieces: [{ count: windboards.length, length: WINDBOARD.stock }],
      profile: `${WINDBOARD.thickness}x${WINDBOARD.width}`,
    });
  } else if (walls.netJm > 0) {
    // nurkade vertikaalsed liistud: 4 nurka × seina kõrgus
    const p = input.log.height;
    // plaanist maja: iga välisnurk (L-majal 6)
    const corners = grid ? outlineCorners(grid) : 4;
    const pieces =
      input.roofType === 'gable'
        ? [{ count: corners, length: input.sideWallHeight }]
        : [
            { count: 2, length: input.frontBackWallHeight - p },
            { count: 2, length: input.roofHeight - p },
          ];
    add('tuuleLiist', pieces.reduce((sum, x) => sum + (x.count * x.length) / 1000, 0) || walls.windStripsJm, { pieces });
  }
  if (foundation) {
    const pieces: { count: number; length: number }[] = [];
    for (const b of foundation.bays ?? [foundation]) {
      pieces.push({ count: b.joistCount, length: b.joistLength });
      if (b.ringPieces) pieces.push(b.ringPieces);
    }
    add('vundament', foundation.totalJm, { pieces: mergePieces(pieces) });
  }
  if (floor) {
    const parts = floor.parts?.filter((p) => !p.open) ?? [{ boardCount: floor.boardCount, boardLength: floor.boardLength }];
    add('porandaLauad', floor.totalJm, { pieces: mergePieces(parts.map((p) => ({ count: p.boardCount, length: p.boardLength }))) });
    const terr = floor.parts?.filter((p) => p.open) ?? [];
    if (floor.terrace && terr.length) {
      add('terrassiLauad', floor.terrace.totalJm, {
        pieces: mergePieces(terr.map((p) => ({ count: p.boardCount, length: p.boardLength }))),
        profile: `laius ${terr[0]!.boardWidth}`,
      });
    }
  }
  if (roof) {
    const pf = input.roof?.profiles ?? {};
    const all = [roof, ...(roof.parts ?? [])];
    const sum = (f: (r: RoofResult) => number) => all.reduce((acc, r) => acc + f(r), 0);
    add('katuseLauad', sum((r) => r.boardsJm), { pieces: all.map((r) => ({ count: r.boardCount, length: r.boardLength })) });
    // Järjekord nagu tootja joonisel: toelauad (RR) ees, siis RF ja EE (QUESTIONS.md K9)
    add('toelaud38', sum((r) => r.edgeBoards.supportSmall.totalJm), { pieces: all.map((r) => ({ count: 2, length: r.edgeBoards.supportSmall.pieceLength })), profile: pf.supportSmall ?? '38x38' });
    add('toelaud95', sum((r) => r.edgeBoards.supportLarge.totalJm), { pieces: all.map((r) => ({ count: r.edgeBoards.supportLarge.count, length: r.edgeBoards.supportLarge.pieceLength })), profile: pf.supportLarge ?? '18x95' });
    // esiräästalaud: viiluotstes (kaldserv), ühekaldel ka räästas
    add('esiraastalaud', sum((r) => r.edgeBoards.fascia.totalJm + (r.edgeBoards.fasciaEave?.totalJm ?? 0)), {
      pieces: mergePieces(all.flatMap((r) => [
        { count: r.edgeBoards.fascia.count, length: r.edgeBoards.fascia.pieceLength },
        ...(r.edgeBoards.fasciaEave ? [{ count: r.edgeBoards.fasciaEave.count, length: r.edgeBoards.fasciaEave.pieceLength }] : []),
      ])),
      profile: pf.fasciaBoard ?? '18x120',
    });
    // papikinnituslaud (EE): Revit 28 mm majad 18x40, 40 mm majad 18x95 (D17)
    add('papikinnituslaud', sum((r) => r.edgeBoards.felt.totalJm), { pieces: all.map((r) => ({ count: r.edgeBoards.felt.count, length: r.edgeBoards.felt.pieceLength })), profile: pf.feltBoard ?? (input.log.thickness <= 30 ? '18x40' : '18x95') });
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

  const materials = materialCutList(input, bom, c, windboards);
  return { dimensions, cutList, materials, windboards, wallModel, placedOpenings, walls, openings, longBoards, foundation, floor, roof, purlins, bom, totalPrice, warnings };
}

/** „sein A“, „seinad 1, A“, „seinad A ×2, B“ – seinte järjekord 1, 2, A, B */
/** Tiiva katus: lauad ja servalauad katuse tegeliku pikkuse järgi (ainult vabades viiluotstes servalauad) */
function trimRoof(r: RoofResult, span: WingSpan, c: EngineConstants): RoofResult {
  const len = Math.max(0, span.length);
  const perSlope = Math.floor(len / c.roofBoardWidth + 1e-9);
  const boardCount = 2 * perSlope;
  const n = 2 * span.gableEnds;
  const e = r.edgeBoards;
  const fascia = { ...e.fascia, count: n, totalJm: (n * e.fascia.pieceLength) / 1000 };
  const felt = { ...e.felt, count: n, totalJm: (n * e.felt.pieceLength) / 1000 };
  const supportSmall = { count: 2, pieceLength: len, totalJm: (2 * len) / 1000 };
  const supportLarge = { count: 2, pieceLength: len, totalJm: (2 * len) / 1000 };
  return {
    ...r,
    roofLength: len,
    boardCount,
    boardsJm: (boardCount * r.boardLength) / 1000,
    edgeBoards: { fascia, felt, supportSmall, supportLarge, totalJm: fascia.totalJm + felt.totalJm + supportSmall.totalJm + supportLarge.totalJm },
  };
}

/** Sama pikkusega tükid kokku (järjekord säilib) */
function mergePieces(pieces: { count: number; length: number }[]): { count: number; length: number }[] {
  const out: { count: number; length: number }[] = [];
  for (const p of pieces) {
    const same = out.find((x) => Math.abs(x.length - p.length) < 0.5);
    if (same) same.count += p.count;
    else out.push({ ...p });
  }
  return out;
}

function wallsText(walls: WallId[]): string {
  if (!walls.length) return '';
  // järjekord: 1, 2, A, B, siis ülejäänud (plaani seinad) tähestiku järgi
  const base: WallId[] = ['1', '2', 'A', 'B'];
  const order = [...base, ...[...new Set(walls)].filter((w) => !base.includes(w)).sort((a, b) => a.localeCompare(b, 'et', { numeric: true }))];
  const counts = order.map((w) => [w, walls.filter((x) => x === w).length] as const).filter(([, c]) => c > 0);
  const parts = counts.map(([w, c]) => (c > 1 ? `${w} ×${c}` : w));
  return `${counts.length === 1 && counts[0]![1] === 1 ? 'sein' : 'seinad'} ${parts.join(', ')}`;
}
