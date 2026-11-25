/**
 * Muu puit lõikenimekirjana (seinapalkide kõrval): vundamendi prussid, põranda- ja terrassilauad, katuselauad,
 * pärlinid, toelauad, räästalauad, tuuleliistud. Read tulevad materjalide nimekirja tükkidest (sama arvutus),
 * igal pikkusel oma tähis (nt "K-1"), et 3D mudelis saaks tükke esile tõsta.
 */
import type { BomLine, EngineConstants, HouseInput } from './types.js';
import type { Windboard } from './windboards.js';

export interface MaterialCutRow {
  mark: string;
  count: number;
  /** tarne-/toorikupikkus, mm */
  length: number;
  /** lõikepikkus, kui tükk lõigatakse kohapeal lühemaks (tuuleliist katuse alla), mm */
  cut?: number;
}

export interface MaterialCutGroup {
  /** materjali võti (hinnakirja võti), nt 'katuseLauad' */
  key: string;
  label: string;
  profile: string;
  rows: MaterialCutRow[];
  totalJm: number;
}

/** Tähiste eesliited (seinapalkidel on seina tähis + BL/LG/TL, nt "1LG-3" – ei kattu) */
export const MATERIAL_PREFIX: Record<string, string> = {
  vundament: 'V',
  porandaLauad: 'P',
  terrassiLauad: 'TR',
  katuseLauad: 'K',
  parlinid: 'PR',
  toelaud38: 'RR',
  toelaud95: 'RS',
  esiraastalaud: 'RF',
  papikinnituslaud: 'EE',
  tuuleLiist: 'TU',
};

const ORDER = ['vundament', 'porandaLauad', 'terrassiLauad', 'parlinid', 'katuseLauad', 'toelaud38', 'toelaud95', 'esiraastalaud', 'papikinnituslaud', 'tuuleLiist'];

export function materialCutList(input: HouseInput, bom: BomLine[], c: EngineConstants, windboards: Windboard[] = []): MaterialCutGroup[] {
  const profileOf = (l: BomLine): string => {
    if (l.profile) return l.profile;
    switch (l.key) {
      case 'vundament':
        return input.foundation ? `${input.foundation.joistWidth}x${input.foundation.joistHeight}` : '';
      case 'porandaLauad':
        return input.floor ? `laius ${input.floor.boardWidth}` : '';
      case 'katuseLauad':
        return `laius ${c.roofBoardWidth}`;
      case 'parlinid':
        return input.purlins?.width && input.purlins?.height ? `${input.purlins.width}x${input.purlins.height}` : '';
      default:
        return '';
    }
  };
  const groups: MaterialCutGroup[] = [];
  for (const l of bom) {
    const prefix = MATERIAL_PREFIX[l.key];
    if (!prefix || !l.pieces?.length) continue;
    // tuuleliistud: toorik 2200, read lõikepikkuse järgi
    if (l.key === 'tuuleLiist' && windboards.length) {
      const stock = l.pieces[0]!.length;
      const byCut = new Map<number, number>();
      for (const w of windboards) byCut.set(w.cut, (byCut.get(w.cut) ?? 0) + 1);
      const rows = [...byCut.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([cut, count], i) => ({ mark: `${prefix}-${i + 1}`, count, length: stock, ...(cut < stock ? { cut } : {}) }));
      groups.push({ key: l.key, label: l.label, profile: profileOf(l), rows, totalJm: rows.reduce((s, r) => s + (r.count * r.length) / 1000, 0) });
      continue;
    }
    // sama pikkus (mm täpsusega) üheks reaks, lühemad ees
    const byLen = new Map<number, number>();
    for (const p of l.pieces) {
      if (!(p.count > 0 && p.length > 0)) continue;
      const len = Math.round(p.length);
      byLen.set(len, (byLen.get(len) ?? 0) + p.count);
    }
    const rows = [...byLen.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([length, count], i) => ({ mark: `${prefix}-${i + 1}`, count, length }));
    if (!rows.length) continue;
    groups.push({ key: l.key, label: l.label, profile: profileOf(l), rows, totalJm: rows.reduce((s, r) => s + (r.count * r.length) / 1000, 0) });
  }
  return groups.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
}

/** Tähis materjali ja pikkuse järgi (3D tükkidele); '' kui pole */
export function materialMark(groups: MaterialCutGroup[], key: string, length: number): string {
  const g = groups.find((x) => x.key === key);
  if (!g) return '';
  // lõigatud tükid (tuuleliist): lõikepikkuse järgi
  const lenOf = (r: MaterialCutRow) => r.cut ?? r.length;
  let best: MaterialCutRow | null = null;
  for (const r of g.rows) if (!best || Math.abs(lenOf(r) - length) < Math.abs(lenOf(best) - length)) best = r;
  return best && Math.abs(lenOf(best) - length) <= 2 ? best.mark : '';
}
