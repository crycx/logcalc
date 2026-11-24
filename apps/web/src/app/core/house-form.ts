import { FormArray, FormControl, FormGroup, NonNullableFormBuilder } from '@angular/forms';
import type {
  CalculateOptions,
  FloorDirection,
  HouseInput,
  LengthScenario,
  PriceList,
  RoofType,
  WallId,
} from '@logcalc/calc-engine';

/**
 * Üks rida loendis (pikem laud / uks / aken): a = pikkus|laius, b = kõrgus.
 * name + price: uste/akende kataloogi mudel (tühi = oma mõõdud, ilma hinnata).
 */
export type RowForm = FormGroup<{
  a: FormControl<number>;
  b: FormControl<number>;
  count: FormControl<number>;
  name: FormControl<string>;
  price: FormControl<number>;
  /** uksed/aknad: sein, kaugus seina algusest, alumine serv (null = automaatne) */
  wall: FormControl<WallId>;
  offset: FormControl<number | null>;
  sill: FormControl<number | null>;
}>;

export interface RowValue {
  a: number;
  b: number;
  count: number;
  name?: string;
  price?: number;
  wall?: WallId;
  offset?: number | null;
  sill?: number | null;
}

/** Ettevõtte uste/akende kataloogi rida */
/** Vundamendi prusside arvu määramine: auto (max vahe 600), arv käsitsi või max vahe käsitsi */
export type JoistMode = 'auto' | 'count' | 'spacing';

export interface CatalogItem {
  name: string;
  width: number;
  height: number;
  /** € tk kohta */
  price: number;
}

export interface Catalog {
  doors: CatalogItem[];
  windows: CatalogItem[];
}

export type CatalogItemForm = FormGroup<{
  name: FormControl<string>;
  width: FormControl<number>;
  height: FormControl<number>;
  price: FormControl<number>;
}>;

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
  /** Esi/tagaseina kõrgus = küljesein − ½ palki (QUESTIONS.md K5) */
  fbAuto: boolean;
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
  joistMode: JoistMode;
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
  /** Ettevõtte hinnakiri (ei salvestata majaga) */
  prices: Record<keyof PriceList, number>;
  /** Ettevõtte uste/akende kataloog (ei salvestata majaga) */
  catalog: Catalog;
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
  fbAuto: true,
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
  joistMode: 'auto',
  joistCount: 8,
  joistMaxSpacing: 600,
  dist12: 0,
  distAB: 0,
  ring: false,
  floorOn: true,
  floorBoardWidth: 110,
  floorGap: 5,
  roofOn: true,
  roofBoardLength: 0,
  roofOverhang: 0,
  roofBoardWidth: 0,
  purlinsOn: true,
  purlinCount: 0,
  ridgeOnly: false,
  prices: { ...ZERO_PRICES },
  catalog: { doors: [], windows: [] },
};

const normRow = (r: RowValue): Required<RowValue> => ({
  a: r.a ?? 0,
  b: r.b ?? 0,
  count: r.count ?? 1,
  name: r.name ?? '',
  price: r.price ?? 0,
  wall: r.wall ?? '1',
  offset: r.offset ?? null,
  sill: r.sill ?? null,
});

/**
 * Salvestatud/vana maja -> täielik vormi väärtus.
 * Vanadel majadel pole fbAuto-t: nende esi/tagaseina kõrgus jääb käsitsi (fbAuto = false).
 */
export function normalizeHouse(d: Partial<HouseFormValue>, keep?: Pick<HouseFormValue, 'prices' | 'catalog'>): HouseFormValue {
  return {
    ...DEFAULT_VALUE,
    ...d,
    fbAuto: d.fbAuto ?? false,
    // vanad majad: arv > 0 -> käsitsi arv; muu max vahe kui v2 vaikimisi 500 -> käsitsi vahe; muidu auto
    joistMode:
      d.joistMode ??
      ((d.joistCount ?? 0) > 0 ? 'count' : d.joistMaxSpacing && d.joistMaxSpacing !== 500 ? 'spacing' : 'auto'),
    joistCount: d.joistCount || DEFAULT_VALUE.joistCount,
    joistMaxSpacing: d.joistMaxSpacing && d.joistMaxSpacing !== 500 ? d.joistMaxSpacing : DEFAULT_VALUE.joistMaxSpacing,
    longBoards: (d.longBoards ?? DEFAULT_VALUE.longBoards).map(normRow),
    doors: (d.doors ?? DEFAULT_VALUE.doors).map(normRow),
    windows: (d.windows ?? DEFAULT_VALUE.windows).map(normRow),
    prices: keep?.prices ?? { ...DEFAULT_VALUE.prices, ...(d.prices ?? {}) },
    catalog: keep?.catalog ?? d.catalog ?? DEFAULT_VALUE.catalog,
  };
}

/** Automaatsed väljad välja arvutatud (K5: esi/taga = küljesein − ½ palki). */
export function resolveAuto(v: HouseFormValue): HouseFormValue {
  if (v.roofType === 'gable' && v.fbAuto) {
    return { ...v, frontBackWallHeight: (v.sideWallHeight || 0) - (v.logHeight || 0) / 2 };
  }
  return v;
}

export function buildRow(fb: NonNullableFormBuilder, v: RowValue = { a: 0, b: 0, count: 1 }): RowForm {
  const r = normRow(v);
  return fb.group({
    a: fb.control(r.a),
    b: fb.control(r.b),
    count: fb.control(r.count),
    name: fb.control(r.name),
    price: fb.control(r.price),
    wall: fb.control<WallId>(r.wall),
    offset: fb.control<number | null>(r.offset),
    sill: fb.control<number | null>(r.sill),
  });
}

export function buildCatalogItem(fb: NonNullableFormBuilder, v: CatalogItem = { name: '', width: 0, height: 0, price: 0 }): CatalogItemForm {
  return fb.group({
    name: fb.control(v.name),
    width: fb.control(v.width),
    height: fb.control(v.height),
    price: fb.control(v.price),
  });
}

export function buildHouseForm(fb: NonNullableFormBuilder, v: HouseFormValue = DEFAULT_VALUE) {
  return fb.group({
    roofType: fb.control<RoofType>(v.roofType),
    lengthScenario: fb.control<LengthScenario>(v.lengthScenario),
    width: fb.control(v.width),
    depth: fb.control(v.depth),
    sideWallHeight: fb.control(v.sideWallHeight),
    frontBackWallHeight: fb.control(v.frontBackWallHeight),
    fbAuto: fb.control(v.fbAuto),
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
    joistMode: fb.control<JoistMode>(v.joistMode),
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
    catalog: fb.group({
      doors: fb.array<CatalogItemForm>(v.catalog.doors.map((c) => buildCatalogItem(fb, c))),
      windows: fb.array<CatalogItemForm>(v.catalog.windows.map((c) => buildCatalogItem(fb, c))),
    }),
  });
}

export type HouseForm = ReturnType<typeof buildHouseForm>;

/** Seab kataloogi (ettevõtte seadetest). */
export function setCatalog(fb: NonNullableFormBuilder, form: HouseForm, c: Catalog): void {
  const set = (arr: FormArray<CatalogItemForm>, items: CatalogItem[]) => {
    arr.clear({ emitEvent: false });
    items.forEach((it) => arr.push(buildCatalogItem(fb, it), { emitEvent: false }));
  };
  set(form.controls.catalog.controls.doors, c.doors);
  set(form.controls.catalog.controls.windows, c.windows);
  form.controls.catalog.updateValueAndValidity();
}

/** Seab vormi väärtuse, sh loendite read. */
export function setFormValue(fb: NonNullableFormBuilder, form: HouseForm, v: HouseFormValue): void {
  const setRows = (arr: FormArray<RowForm>, rows: RowValue[]) => {
    arr.clear({ emitEvent: false });
    rows.forEach((r) => arr.push(buildRow(fb, r), { emitEvent: false }));
  };
  setRows(form.controls.longBoards, v.longBoards);
  setRows(form.controls.doors, v.doors);
  setRows(form.controls.windows, v.windows);
  setCatalog(fb, form, v.catalog);
  form.patchValue(v);
}

const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const rows = (list: RowValue[]) => list.filter((r) => n(r.a) > 0 && n(r.b) > 0 && n(r.count) > 0);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const opening = (r: RowValue) => ({
  width: r.a,
  height: r.b,
  count: r.count,
  ...(r.name ? { name: r.name } : {}),
  ...(n(r.price) > 0 ? { unitPrice: n(r.price) } : {}),
  ...(r.wall ? { wall: r.wall } : {}),
  ...(isNum(r.offset) ? { offset: r.offset } : {}),
  ...(isNum(r.sill) ? { sill: r.sill } : {}),
});

/** Vormi väärtus -> arvutusmootori sisend. */
export function toEngineInput(value: HouseFormValue): { input: HouseInput; options: CalculateOptions } {
  const v = resolveAuto(value);
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
    doors: rows(v.doors).map(opening),
    windows: rows(v.windows).map(opening),
    floorDirection: v.floorDirection,
  };
  if (v.foundationOn) {
    input.foundation = {
      joistWidth: n(v.joistWidth),
      joistHeight: n(v.joistHeight),
      ...(v.joistMode === 'count' ? { count: n(v.joistCount) } : {}),
      ...(v.joistMode === 'spacing' ? { maxSpacing: n(v.joistMaxSpacing) } : {}),
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
