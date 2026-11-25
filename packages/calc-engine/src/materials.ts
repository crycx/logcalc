/**
 * Muu puit lõikenimekirjana (seinapalkide kõrval): vundamendi prussid, põranda- ja terrassilauad, katuselauad,
 * pärlinid, toelauad, räästalauad, tuuleliistud. Read tulevad materjalide nimekirja tükkidest (sama arvutus),
 * igal pikkusel oma tähis (nt "K-1"), et 3D mudelis saaks tükke esile tõsta.
 */
import type { BomLine, EngineConstants, HouseInput } from './types.js';

export interface MaterialCutRow {
  mark: string;
  count: number;
  /** mm */
  length: number;
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

export function materialCutList(input: HouseInput, bom: BomLine[], c: EngineConstants): MaterialCutGroup[] {
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
  let best: MaterialCutRow | null = null;
  for (const r of g.rows) if (!best || Math.abs(r.length - length) < Math.abs(best.length - length)) best = r;
  return best && Math.abs(best.length - length) <= 2 ? best.mark : '';
}
