/**
 * Detailid (Revit „Details“, Kolding 40 _D_ PDF): iga palgitüki lõiked – nurgaliite sälgud peal ja all, otsalõiked,
 * pärlinite pilud viilupalkides, ukse kohal vajumisvaru. Sama info on detailijoonise, 3D ja hiljem CNC (BTLx) alus.
 *
 * Revit-i reeglid:
 * - nurgaliite sälk: laius = ristuva palgi paksus, sügavus h/4 peal ja all (kahe palgi sälgud kokku = ½ palki);
 * - palgi tavaline ots (nurga ülejääk): nurgad faasitud ~12 mm;
 * - pikendatud ots (varikatus, pärlin): ülevalt 65 mm püsti, siis 45° alumisse nurka;
 * - pärlin 40x143: viiluseina kohal alt sälk (seina paksus) × 48, viilupalkides pilu 40 × 95 (143 − 48);
 * - ukse kohal olev palk: alt 12 mm sisselõige ukse laiuses (vajumisvaru).
 */
import type { PlacedPiece, WallSpec } from './wall-model.js';

export type EndCut = 'log' | 'ext' | 'plain';

export const DETAIL = {
  /** tavalise palgiotsa nurgafaas */
  endChamfer: 12,
  /** pikendatud otsa püstine osa ülevalt (ülejäänu 45°) */
  extVertical: 65,
  /** pärlini sälk alt viiluseina kohal */
  purlinNotch: 48,
  /** ukse kohal oleva palgi sisselõige alt */
  doorGap: 12,
} as const;

export interface PieceNotch {
  /** keskkoht piki palki (seina koordinaat) */
  x: number;
  /** laius piki palki */
  w: number;
  side: 'top' | 'bottom';
  depth: number;
  kind: 'corner' | 'door';
}

export interface PieceDetail {
  start: EndCut;
  end: EndCut;
  notches: PieceNotch[];
  /** pärlinite pilud selles tükis (seina koordinaadid X, Z) */
  slots: [number, number][][];
}

export function endCutOf(wall: Pick<WallSpec, 'length' | 'buttStart' | 'buttEnd'>, p: PlacedPiece, start: boolean): EndCut {
  if (p.kind === 'gable') return 'plain';
  const x = start ? p.x0 : p.x1;
  if (start ? p.spliceStart : p.spliceEnd) return 'plain';
  if (start ? wall.buttStart && Math.abs(x) < 1 : wall.buttEnd && Math.abs(x - wall.length) < 1) return 'plain';
  if (start ? x < -1 : x > wall.length + 1) return 'ext';
  return Math.abs(start ? x : x - wall.length) < 1 ? 'log' : 'plain';
}

/** Pikendatud otsa 45° lõike pikkus (= kõrgus) – ülevalt 65 püsti */
export const extCut = (h: number) => Math.max(0, h - DETAIL.extVertical);

export function pieceDetails(
  wall: WallSpec,
  pieces: PlacedPiece[],
  t: number,
  logHeight: number,
  slots: [number, number][][],
): PieceDetail[] {
  const nd = logHeight / 4;
  const doors = wall.openings.filter((o) => o.kind === 'door');
  return pieces.map((p) => {
    const notches: PieceNotch[] = [];
    for (const j of wall.joints) {
      if (j.x - t / 2 < p.x0 + 1 || j.x + t / 2 > p.x1 - 1) continue;
      // sälk servas, mida ristuva seina palk läbib (ristuv palk ulatub üle selle kõrguse); alumisel real lisaks, kui
      // ristuv sein algab poole palgiga (selle pool palki istub siin alt) – pool palki ise alt ei sälgita
      const passes = (y: number) => !j.ranges || j.ranges.some(([a, b]) => a < y - 1 && b > y + 1);
      const halfBelow = p.y0 < 1 && !!j.ranges?.some(([a, b]) => a < 1 && b - a < logHeight * 0.75);
      if (p.kind !== 'gable' && passes(p.y1)) notches.push({ x: j.x, w: t, side: 'top', depth: nd, kind: 'corner' });
      if (passes(p.y0) || halfBelow) notches.push({ x: j.x, w: t, side: 'bottom', depth: nd, kind: 'corner' });
    }
    // ukse kohal: alt vajumisvaru ukse laiuses
    for (const d of doors) {
      if (Math.abs(p.y0 - (d.sill + d.height)) > 1) continue;
      const a = Math.max(p.x0, d.offset);
      const b = Math.min(p.x1, d.offset + d.width);
      if (b - a > 1) notches.push({ x: (a + b) / 2, w: b - a, side: 'bottom', depth: DETAIL.doorGap, kind: 'door' });
    }
    notches.sort((a, b) => a.x - b.x);
    const pieceSlots = slots.filter((s) => {
      const xs = s.map((q) => q[0]);
      const zs = s.map((q) => q[1]);
      return Math.max(...xs) > p.x0 && Math.min(...xs) < p.x1 && Math.max(...zs) > p.y0 && Math.min(...zs) < p.y1;
    });
    return { start: endCutOf(wall, p, true), end: endCutOf(wall, p, false), notches, slots: pieceSlots };
  });
}
