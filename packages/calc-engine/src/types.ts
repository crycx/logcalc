/**
 * LogCalc arvutusmootori sisend- ja väljundtüübid.
 *
 * Kõik pikkused on millimeetrites (mm). Jooksvad meetrid (jm) on meetrites.
 * Sulgudes on vana v2 (htdocs/v2/JS/script.js) muutuja nimi, et valemeid oleks lihtne võrrelda.
 */

/** Katuse tüüp. gable = viilkatus (viilKatus), mono = ühekaldeline (yhekaldneKatus). */
export type RoofType = 'gable' | 'mono';

/**
 * Kuidas sisestatud laius/pikkus tõlgendada (misPikkus):
 * - log   = palgi pikkus (koos nurgaülejääkidega)
 * - outer = välisseinast välisseinani
 * - inner = siseseinast siseseinani
 */
export type LengthScenario = 'log' | 'outer' | 'inner';

/**
 * Põranda (ja seega vundamendi prusside) suund (porandaSuund).
 * AB: põrandalauad jooksevad laiuse suunas, prussid sügavuse suunas.
 * '12': vastupidi.
 */
export type FloorDirection = 'AB' | '12';

export interface LogProfile {
  /** Palgi paksus (palgiPaksus) */
  thickness: number;
  /** Palgi (laua) kõrgus (palgiKorgus) */
  height: number;
}

/** Pikem laud (pikemadLauad[i]) – nt räästa alla ulatuvad pikemad seinalauad. */
export interface LongBoard {
  /** pikkus */
  length: number;
  /** korgus – laua kõrgus; <= longBoardThreshold loetakse "madalaks" laudaks */
  height: number;
  /** kogus */
  count: number;
}

/** Uks või aken (uksed[i] / aknad[i]). */
export interface Opening {
  width: number;
  height: number;
  count: number;
  /** Mudeli nimi (nt kataloogist); materjalide nimekirjas kuvamiseks */
  name?: string;
  /** Hind tk kohta (€) */
  unitPrice?: number;
  /** Sein, millel ava on (vaikimisi '1' = esisein) */
  wall?: '1' | '2' | 'A' | 'B';
  /** Kaugus seina palgi otsast ava vasaku servani (mm). Puudub = paigutatakse ühtlaselt. */
  offset?: number;
  /** Alumine serv seina alusest (mm). Uks vaikimisi 0, aken ülaservaga ukse ülaservas. */
  sill?: number;
}

export interface FoundationInput {
  /** Prussi laius (prussiW / vundament[0].laius) */
  joistWidth: number;
  /** Prussi kõrgus (prussiH) */
  joistHeight: number;
  /** Prusside arv käsitsi (prussideArvTapsem). 0/undefined = arvuta automaatselt. */
  count?: number;
  /** Prussi kaugus välisseinast seinte 1-2 suunas (prussiKaugusValisseinast12) */
  distanceFromWall12?: number;
  /** Prussi kaugus välisseinast seinte A-B suunas (prussiKaugusValisseinastAB) */
  distanceFromWallAB?: number;
  /** Vundamendi ring – lisaks 2 ristprussi (vundamendiRing) */
  ring?: boolean;
  /** Prusside max kesktelgede vahe automaatsel arvutusel. Vaikimisi constants.maxJoistSpacing (500). */
  maxSpacing?: number;
}

export interface FloorInput {
  /** Põrandalaua laius (porandaLauaLaius) */
  boardWidth: number;
  /** Põrandalaua kaugus seinast (porandaKaugusSeinast), vaikimisi 5 */
  distanceFromWall?: number;
}

export interface RoofInput {
  /** Katuselaua pikkus (katuseLauaPikkus). 0/undefined = arvuta üleulatusest. */
  boardLength?: number;
  /** Katuse üleulatus (katuseLauaYleulatus). 0/undefined = vaikimisi (defaultRoofOverhang). */
  overhang?: number;
  /** Profiilid ainult kuvamiseks (nt "18x120"). */
  profiles?: {
    fasciaBoard?: string; // esiraastalaud (RF)
    feltBoard?: string; // papikinnituslaud (EE)
    supportSmall?: string; // toelaud (38x38)
    supportLarge?: string; // toelaudSuurem (18x95)
  };
}

export interface PurlinInput {
  /** Pärlini kõrgus (parlinKorgus) – info */
  height?: number;
  /** Pärlini laius (parlinLaius) – info */
  width?: number;
  /** Pärlinite arv ühel katusepoolel (parlinArv). 0/undefined = arvuta automaatselt. */
  count?: number;
  /** Ainult tipupärlin (tipuParlin), ainult viilkatusel. */
  ridgeOnly?: boolean;
}

/** Ühikuhinnad (hinnad). €/jm. */
export interface PriceList {
  seinaLauad?: number;
  tuuleLiist?: number;
  katuseLauad?: number;
  parlinid?: number;
  porandaLauad?: number;
  vundament?: number;
  esiraastalaud?: number;
  papikinnituslaud?: number;
  toelaud38?: number;
  toelaud95?: number;
}

export interface HouseInput {
  roofType: RoofType;
  lengthScenario: LengthScenario;
  /** Laius nagu sisestatud (cab_width) */
  width: number;
  /** Pikkus/sügavus nagu sisestatud (cab_depth) */
  depth: number;
  /** Küljeseina kõrgus (heightSide) – viilkatusel räästaseinad */
  sideWallHeight: number;
  /** Esi/tagaseina kõrgus (heightFb). Ühekaldelisel: kõrgem (esi)sein. */
  frontBackWallHeight: number;
  /** Katuse kõrgus (roofHeight). Viilkatusel harja kõrgus, ühekaldelisel madalama (taga)seina kõrgus. */
  roofHeight: number;
  log: LogProfile;
  longBoards?: LongBoard[];
  doors?: Opening[];
  windows?: Opening[];
  floorDirection?: FloorDirection;
  foundation?: FoundationInput;
  floor?: FloorInput;
  roof?: RoofInput;
  purlins?: PurlinInput;
}

/** Mootori konstandid. Vaikeväärtused vastavad vanale v2 käitumisele. */
export interface EngineConstants {
  /** Nurgaülejääk ühel pool (v2-s kõvakodeeritud 100) */
  cornerOverhang: number;
  /** Katuselaua laius, mille järgi lauad loetakse (v2: 110) */
  roofBoardWidth: number;
  /** Katuse minimaalne (vaikimisi) üleulatus (v2: 200); laud ümardatakse üles, tegelik üleulatus ≥ see */
  defaultRoofOverhang: number;
  /** Vundamendi prusside max kesktelgede vahe automaatsel arvutusel (Revit 508–593; v2: 500) */
  maxJoistSpacing: number;
  /** Pärlinite max HORISONTAALNE vahe (Revit; v2: 700 kaldpinnal) */
  maxPurlinSpacing: number;
  /** Pikemate laudade "madala" laua piir (v2: 114) */
  longBoardThreshold: number;
  /** Räästalaua tüki pikkuse lisa (v2 kuvas +38) */
  fasciaExtra: number;
  /** Põrandalaua vaikimisi kaugus seinast laua otsas (v2: 5) */
  defaultFloorGap: number;
  /** Põrandalaudade vahe seinast külgedel, kummalgi pool (Revit: 20) */
  floorSideGap: number;
  /** Vundamendi prussi otsa vahe seinast/ringist, kummaski otsas (Revit: 5) */
  joistEndGap: number;
  /** Katuse- ja räästalaudade pikkuse ümardus üles (mm), nt 10 = sentimeetri täpsus */
  roofBoardRounding: number;
}

export type Unit = 'jm' | 'tk' | 'm2' | 'm3' | 'deg' | 'mm';

/** Üks materjalirida (BOM). */
export interface BomLine {
  key: string;
  label: string;
  quantity: number;
  unit: 'jm' | 'tk';
  /** Tükkide arv ja tüki pikkus, kui on teada */
  pieces?: { count: number; length: number }[];
  profile?: string;
  unitPrice?: number;
  total?: number;
}

export interface GableCourse {
  /** Järjekorranumber alt (1 = alumine) */
  index: number;
  /** Kaugus tipust (palkTipust), mm */
  distanceFromTop: number;
  /** Palgi pikkus, mm */
  length: number;
}

/** Seinte jm jaotus. Viilkatusel frontBack/sides/gables, ühekaldelisel front/back/sides/triangles. */
export interface WallsBreakdown {
  /** Viilkatus: esi + tagasein kokku (sh osaline rida) */
  frontBack?: number;
  /** Viilkatus: osalise rea (pool palki) osa esi/tagaseintes */
  frontBackPartial?: number;
  /** Ühekalle: esisein */
  front?: number;
  frontPartial?: number;
  /** Ühekalle: tagasein */
  back?: number;
  backPartial?: number;
  /** Küljeseinad kokku */
  sides: number;
  /** Viilkatus: viilud kokku */
  gables?: number;
  /** Ühekalle: külgseinte kolmnurgad kokku */
  triangles?: number;
  /** Pikemad (kõrgemad) lauad */
  longBoards: number;
}

export interface WallsResult {
  /** Seinte jm ilma avadeta (jooksevMeeter) */
  totalJm: number;
  /** Seinte jm koos avade mahaarvamisega (jooksevMeeterUksedAknad) */
  netJm: number;
  /** Viilu-/kolmnurgapalgid (üks viil); kokku läheb 2x */
  gableCourses: GableCourse[];
  gableJm: number;
  /** Detailne jaotus (jm) */
  breakdown: WallsBreakdown;
  /** Hõlmatav pindala m2 (pindala) */
  footprintArea: number;
  /** Sisene ruumala m3 (ruumala2) */
  volume: number;
  /** Tuuleliistud jm */
  windStripsJm: number;
}

export interface OpeningsResult {
  doorsArea: number;
  doorsJm: number;
  windowsArea: number;
  windowsJm: number;
}

export interface LongBoardsResult {
  /** Kõrgemad kui piir: täispikkuses lisanduv jm (pikemadLauadJooksvadMeetrid) */
  tallJm: number;
  tallCount: number;
  /** Madalad (<= piir): ainult lisakulu üle tavalaua (pikemadLauad114LisaKulu) */
  lowJm: number;
  lowCount: number;
  lowExtraJm: number;
  tallExtraJm: number;
  maxLength: number | null;
}

export interface FoundationResult {
  joistCount: number;
  /** Kesktelgede vahe, mm */
  spacing: number;
  joistLength: number;
  ringPieces: { count: number; length: number } | null;
  totalJm: number;
}

export interface FloorResult {
  boardCount: number;
  boardLength: number;
  totalJm: number;
}

export interface RoofResult {
  /** Katuse nurk kraadides */
  angle: number;
  boardCount: number;
  /** Kasutatud katuselaua pikkus (sisestatud või arvutatud) */
  boardLength: number;
  boardLengthIsComputed: boolean;
  /** Tegelik üleulatus (laua pikkusest tagasi arvutatud; arvutatud laua puhul ≥ min üleulatus) */
  computedOverhang: number | null;
  /** Katuse pikkus harja suunas */
  roofLength: number;
  boardsJm: number;
  edgeBoards: {
    fascia: { count: number; pieceLength: number; totalJm: number };
    felt: { count: number; pieceLength: number; totalJm: number };
    supportSmall: { count: number; pieceLength: number; totalJm: number };
    supportLarge: { count: number; pieceLength: number; totalJm: number };
    totalJm: number;
  };
}

export interface PurlinsResult {
  /** Pärlinite arv ühel katusepoolel (ilma tipupärlinita) */
  perSide: number;
  /** Kõik tükid kokku (viilkatusel 2*perSide + 1 tipupärlin) */
  pieces: number;
  hasRidge: boolean;
  spacing: number | null;
  length: number;
  totalJm: number;
}

export interface Dimensions {
  /** Arvutuslik laius (palgi pikkus), mm */
  width: number;
  /** Arvutuslik sügavus (palgi pikkus), mm */
  depth: number;
}

export interface Warning {
  code: string;
  message: string;
}

export interface CalcResult {
  dimensions: Dimensions;
  /** Iga seina lõikenimekiri (seinamudel) */
  cutList: import('./wall-model.js').WallCutList[];
  /** Seinad koos ridade ja paigutatud avadega (joonistamiseks) */
  wallModel: import('./wall-model.js').WallSpec[];
  /** Uksed ja aknad paigutatuna (sisendi järjekorras: uksed, siis aknad; kogus lahti laotud) */
  placedOpenings: import('./wall-model.js').PlacedOpening[];
  walls: WallsResult;
  openings: OpeningsResult;
  longBoards: LongBoardsResult;
  foundation: FoundationResult | null;
  floor: FloorResult | null;
  roof: RoofResult | null;
  purlins: PurlinsResult | null;
  bom: BomLine[];
  totalPrice: number;
  warnings: Warning[];
}
