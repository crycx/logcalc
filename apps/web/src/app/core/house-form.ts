import { FormArray, FormControl, FormGroup, NonNullableFormBuilder } from '@angular/forms';
import type {
  CalculateOptions,
  FloorDirection,
  HouseInput,
  LengthScenario,
  PriceList,
  RoofType,
} from '@logcalc/calc-engine';

/** Üks rida loendis (pikem laud / uks / aken): a = pikkus|laius, b = kõrgus. */
export type RowForm = FormGroup<{
  a: FormControl<number>;
  b: FormControl<number>;
  count: FormControl<number>;
}>;

export interface RowValue {
  a: number;
  b: number;
  count: number;
}

export const PRICE_KEYS: { key: keyof PriceList; label: string }[] = [
  { key: 'seinaLauad', label: 'Seinalauad' },
  { key: 'tuuleLiist', label: 'Tuuleliistud' },
  { key: 'katuseLauad', label: 'Katuselauad' },
  { key: 'parlinid', label: 'Pärlinid' },
  { key: 'porandaLauad', label: 'Põrandalauad' },
  { key: 'vundament', label: 'Vundamendi prussid' },
  { key: 'esiraastalaud', label: 'Esiräästalaud (RF)' },
  { key: 'papikinnituslaud', label: 'Papikinnituslaud (EE)' },
  { key: 'toelaud38', label: 'Toelaud 38x38' },
  { key: 'toelaud95', label: 'Toelaud 18x95' },
];

/** Vormi väärtus (getRawValue) – ka localStorage-sse salvestatav kuju. */
export interface HouseFormValue {
  roofType: RoofType;
  lengthScenario: LengthScenario;
  width: number;
  depth: number;
  sideWallHeight: number;
  frontBackWallHeight: number;
  roofHeight: number;
  logThickness: number;
  logHeight: number;
  longBoards: RowValue[];
  doors: RowValue[];
  windows: RowValue[];
  floorDirection: FloorDirection;
  foundationOn: boolean;
  joistWidth: number;
  joistHeight: number;
  joistCount: number;
  joistMaxSpacing: number;
  dist12: number;
  distAB: number;
  ring: boolean;
  floorOn: boolean;
  floorBoardWidth: number;
  floorGap: number;
  roofOn: boolean;
  roofBoardLength: number;
  roofOverhang: number;
  roofBoardWidth: number;
  purlinsOn: boolean;
  purlinCount: number;
  ridgeOnly: boolean;
  prices: Record<keyof PriceList, number>;
}

const ZERO_PRICES = Object.fromEntries(PRICE_KEYS.map((p) => [p.key, 0])) as Record<keyof PriceList, number>;

/** Vaikimisi: Bente IV 28 (kontrollitud v2 tulemusega, vt calc-engine/test/real-houses.test.ts). */
export const DEFAULT_VALUE: HouseFormValue = {
  roofType: 'gable',
  lengthScenario: 'log',
  width: 2950,
  depth: 3800,
  sideWallHeight: 1824,
  frontBackWallHeight: 1767,
  roofHeight: 2223,
  logThickness: 28,
  logHeight: 114,
  longBoards: [{ a: 4000, b: 115, count: 2 }],
  doors: [{ a: 1440, b: 1824, count: 1 }],
  windows: [],
  floorDirection: '12',
  foundationOn: true,
  joistWidth: 40,
  joistHeight: 70,
  joistCount: 0,
  joistMaxSpacing: 500,
  dist12: 0,
  distAB: 0,
  ring: false,
  floorOn: true,
  floorBoardWidth: 110,
  floorGap: 5,
  roofOn: true,
  roofBoardLength: 0,
  roofOverhang: 200,
  roofBoardWidth: 110,
  purlinsOn: true,
  purlinCount: 0,
  ridgeOnly: false,
  prices: { ...ZERO_PRICES },
};

export interface Example {
  name: string;
  note: string;
  value: Partial<HouseFormValue>;
}

export const EXAMPLES: Example[] = [
  { name: 'Bente IV 28', note: 'v2 tulemusega kontrollitud', value: DEFAULT_VALUE },
  {
    name: 'Placas I 40',
    note: 'Revit-eelarvega kontrollitud',
    value: {
      roofType: 'gable',
      lengthScenario: 'log',
      width: 4500,
      depth: 3000,
      sideWallHeight: 2052,
      frontBackWallHeight: 1995,
      roofHeight: 2565,
      logThickness: 40,
      logHeight: 114,
      longBoards: [
        { a: 3900, b: 114, count: 2 },
        { a: 3500, b: 114, count: 2 },
        { a: 3200, b: 114, count: 2 },
      ],
      doors: [{ a: 1440, b: 1995, count: 1 }],
      windows: [{ a: 520, b: 1938, count: 2 }],
    },
  },
  {
    name: 'Brantevik II 40',
    note: 'joonise andmed',
    value: {
      roofType: 'gable',
      lengthScenario: 'log',
      width: 3800,
      depth: 3800,
      sideWallHeight: 2058,
      frontBackWallHeight: 1995,
      roofHeight: 2565,
      logThickness: 40,
      logHeight: 114,
      longBoards: [
        { a: 5100, b: 120, count: 2 },
        { a: 4700, b: 114, count: 2 },
        { a: 4400, b: 114, count: 2 },
        { a: 4100, b: 114, count: 2 },
      ],
      doors: [{ a: 1440, b: 1995, count: 1 }],
      windows: [{ a: 765, b: 990, count: 1 }],
      floorDirection: 'AB',
      floorBoardWidth: 95,
    },
  },
];

export function buildRow(fb: NonNullableFormBuilder, v: RowValue = { a: 0, b: 0, count: 1 }): RowForm {
  return fb.group({ a: fb.control(v.a), b: fb.control(v.b), count: fb.control(v.count) });
}

export function buildHouseForm(fb: NonNullableFormBuilder, v: HouseFormValue = DEFAULT_VALUE) {
  return fb.group({
    roofType: fb.control<RoofType>(v.roofType),
    lengthScenario: fb.control<LengthScenario>(v.lengthScenario),
    width: fb.control(v.width),
    depth: fb.control(v.depth),
    sideWallHeight: fb.control(v.sideWallHeight),
    frontBackWallHeight: fb.control(v.frontBackWallHeight),
    roofHeight: fb.control(v.roofHeight),
    logThickness: fb.control(v.logThickness),
    logHeight: fb.control(v.logHeight),
    longBoards: fb.array<RowForm>(v.longBoards.map((r) => buildRow(fb, r))),
    doors: fb.array<RowForm>(v.doors.map((r) => buildRow(fb, r))),
    windows: fb.array<RowForm>(v.windows.map((r) => buildRow(fb, r))),
    floorDirection: fb.control<FloorDirection>(v.floorDirection),
    foundationOn: fb.control(v.foundationOn),
    joistWidth: fb.control(v.joistWidth),
    joistHeight: fb.control(v.joistHeight),
    joistCount: fb.control(v.joistCount),
    joistMaxSpacing: fb.control(v.joistMaxSpacing),
    dist12: fb.control(v.dist12),
    distAB: fb.control(v.distAB),
    ring: fb.control(v.ring),
    floorOn: fb.control(v.floorOn),
    floorBoardWidth: fb.control(v.floorBoardWidth),
    floorGap: fb.control(v.floorGap),
    roofOn: fb.control(v.roofOn),
    roofBoardLength: fb.control(v.roofBoardLength),
    roofOverhang: fb.control(v.roofOverhang),
    roofBoardWidth: fb.control(v.roofBoardWidth),
    purlinsOn: fb.control(v.purlinsOn),
    purlinCount: fb.control(v.purlinCount),
    ridgeOnly: fb.control(v.ridgeOnly),
    prices: fb.group(
      Object.fromEntries(PRICE_KEYS.map((p) => [p.key, fb.control(v.prices[p.key] ?? 0)])) as Record<
        keyof PriceList,
        FormControl<number>
      >,
    ),
  });
}

export type HouseForm = ReturnType<typeof buildHouseForm>;

/** Seab vormi väärtuse, sh loendite read. */
export function setFormValue(fb: NonNullableFormBuilder, form: HouseForm, v: HouseFormValue): void {
  const setRows = (arr: FormArray<RowForm>, rows: RowValue[]) => {
    arr.clear({ emitEvent: false });
    rows.forEach((r) => arr.push(buildRow(fb, r), { emitEvent: false }));
  };
  setRows(form.controls.longBoards, v.longBoards);
  setRows(form.controls.doors, v.doors);
  setRows(form.controls.windows, v.windows);
  form.patchValue(v);
}

const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const rows = (list: RowValue[]) => list.filter((r) => n(r.a) > 0 && n(r.b) > 0 && n(r.count) > 0);

/** Vormi väärtus -> arvutusmootori sisend. */
export function toEngineInput(v: HouseFormValue): { input: HouseInput; options: CalculateOptions } {
  const gable = v.roofType === 'gable';
  const input: HouseInput = {
    roofType: v.roofType,
    lengthScenario: v.lengthScenario,
    width: n(v.width),
    depth: n(v.depth),
    sideWallHeight: gable ? n(v.sideWallHeight) : 0,
    frontBackWallHeight: n(v.frontBackWallHeight),
    roofHeight: n(v.roofHeight),
    log: { thickness: n(v.logThickness), height: n(v.logHeight) },
    longBoards: rows(v.longBoards).map((r) => ({ length: r.a, height: r.b, count: r.count })),
    doors: rows(v.doors).map((r) => ({ width: r.a, height: r.b, count: r.count })),
    windows: rows(v.windows).map((r) => ({ width: r.a, height: r.b, count: r.count })),
    floorDirection: v.floorDirection,
  };
  if (v.foundationOn) {
    input.foundation = {
      joistWidth: n(v.joistWidth),
      joistHeight: n(v.joistHeight),
      count: n(v.joistCount),
      maxSpacing: n(v.joistMaxSpacing),
      distanceFromWall12: n(v.dist12),
      distanceFromWallAB: n(v.distAB),
      ring: v.ring,
    };
  }
  if (v.floorOn) input.floor = { boardWidth: n(v.floorBoardWidth), distanceFromWall: n(v.floorGap) };
  if (v.roofOn) input.roof = { boardLength: n(v.roofBoardLength), overhang: n(v.roofOverhang) };
  if (v.purlinsOn) input.purlins = { count: n(v.purlinCount), ridgeOnly: gable && v.ridgeOnly };

  const prices: PriceList = {};
  for (const p of PRICE_KEYS) if (n(v.prices[p.key]) > 0) prices[p.key] = n(v.prices[p.key]);

  const constants = n(v.roofBoardWidth) > 0 ? { roofBoardWidth: n(v.roofBoardWidth) } : {};
  return { input, options: { prices, constants } };
}
