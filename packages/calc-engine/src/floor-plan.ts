/**
 * Põrand ja vundament plaanist (WALL-GRAPH.md, etapp 4).
 *
 * Põrand ruumide kaupa: ruum = sisemise ala osa, mida eraldavad alt olemas seinad (Lund: tuba + terrass,
 * Boden: tuba + veranda). Iga ruumi ristkülikus lauad suunas `floorDirection`, seina ääres sama vahe
 * nagu ristkülikmajal (porandKirjuta), seinata serval (L-ruumi jaotusjoon) vahet pole.
 *
 * Vundament lõikude kaupa: prussid ühes suunas üle kogu maja; lõik katkeb prussidega paralleelse
 * vaheseina all (Lund: sein 2 -> topeltpruss) ja kus maja kuju muutub (L-maja tiib). Iga lõik nagu
 * ristkülikmaja vundament (computeFoundation) – ristkülikul täpselt sama tulemus.
 */
import { computeFoundation } from './foundation.js';
import { edgeHasWall, planGrid, planRooms, solidBelow, type PlanGrid } from './plan-regions.js';
import type { HousePlan, WallGeometry } from './plan.js';
import type { EngineConstants, FloorPart, FloorResult, FoundationBay, FoundationResult, HouseInput, PlanBox, Warning } from './types.js';

export function planFloor(input: HouseInput, plan: HousePlan, geo: WallGeometry[], c: EngineConstants, grid = planGrid(plan, geo, solidBelow)): FloorResult | null {
  const fl = input.floor;
  if (!fl || !(fl.boardWidth > 0) || !grid) return null;
  const along: 'x' | 'y' = (input.floorDirection ?? 'AB') === 'AB' ? 'x' : 'y';
  const half = input.log.thickness / 2;
  const gap = fl.distanceFromWall ?? c.defaultFloorGap;
  const tw = fl.terraceBoardWidth && fl.terraceBoardWidth > 0 ? fl.terraceBoardWidth : c.terraceBoardWidth;
  const tg = fl.terraceBoardGap !== undefined && fl.terraceBoardGap >= 0 ? fl.terraceBoardGap : c.terraceBoardGap;
  const parts: FloorPart[] = [];
  planRooms(plan, geo, grid).forEach((room, k) => {
    for (const r of room.rects) {
      const w = {
        x0: edgeHasWall(geo, 'y', r.x0, r.y0, r.y1),
        x1: edgeHasWall(geo, 'y', r.x1, r.y0, r.y1),
        y0: edgeHasWall(geo, 'x', r.y0, r.x0, r.x1),
        y1: edgeHasWall(geo, 'x', r.y1, r.x0, r.x1),
      };
      const box: PlanBox = {
        x0: r.x0 + (w.x0 ? half : 0),
        x1: r.x1 - (w.x1 ? half : 0),
        y0: r.y0 + (w.y0 ? half : 0),
        y1: r.y1 - (w.y1 ? half : 0),
      };
      const alongLen = along === 'x' ? box.x1 - box.x0 : box.y1 - box.y0;
      const sideGaps = along === 'x' ? Number(w.y0) + Number(w.y1) : Number(w.x0) + Number(w.x1);
      const across = (along === 'x' ? box.y1 - box.y0 : box.x1 - box.x0) - sideGaps * c.floorSideGap;
      // terrass: terrassilauad vahedega, otsad seinani (Revit Lund TB 28x120: 30 tk, 2310 = sisemõõt)
      const open = room.open;
      const boardWidth = open ? tw : fl.boardWidth;
      const pitch = open ? tw + tg : fl.boardWidth;
      const boardCount = Math.max(0, Math.ceil((across + (open ? tg : 0)) / pitch - 1e-9));
      const boardLength = alongLen - (open ? 0 : gap);
      if (boardCount <= 0 || boardLength <= 0) continue;
      parts.push({ box, room: k, open, boardWidth, along, boardCount, boardLength, totalJm: (boardCount * boardLength) / 1000 });
    }
  });
  if (!parts.length) return null;
  const inner = parts.filter((p) => !p.open);
  const outer = parts.filter((p) => p.open);
  return {
    boardCount: inner.reduce((s, p) => s + p.boardCount, 0),
    boardLength: inner.length ? Math.max(...inner.map((p) => p.boardLength)) : 0,
    totalJm: inner.reduce((s, p) => s + p.totalJm, 0),
    parts,
    terrace: outer.length
      ? { boardCount: outer.reduce((s, p) => s + p.boardCount, 0), totalJm: outer.reduce((s, p) => s + p.totalJm, 0) }
      : null,
  };
}

/** Vundamendi lõigud: lahtrite vahemikud vahe-telje suunas, igas üks pidev prusside jooks */
function bays(grid: PlanGrid, spacingX: boolean): { s0: number; s1: number; m0: number; m1: number }[] {
  const { nx, ny, inside, vWall, hWall } = grid;
  const nS = spacingX ? nx : ny;
  const nJ = spacingX ? ny : nx;
  const cell = (k: number, m: number) => (spacingX ? inside[k]![m]! : inside[m]![k]!);
  const runs = (k: number) => {
    const out: [number, number][] = [];
    for (let m = 0; m < nJ; m++) {
      if (!cell(k, m)) continue;
      const last = out[out.length - 1];
      if (last && last[1] === m - 1) last[1] = m;
      else out.push([m, m]);
    }
    return out;
  };
  /** prussidega paralleelne (alt olemas) sein joonel k (lõikude k-1 ja k vahel) */
  const wallOnLine = (k: number, rs: [number, number][]) =>
    rs.some(([m0, m1]) => {
      for (let m = m0; m <= m1; m++) if (spacingX ? vWall(k, m, solidBelow) : hWall(m, k, solidBelow)) return true;
      return false;
    });
  const out: { s0: number; s1: number; m0: number; m1: number }[] = [];
  let group: { k0: number; k1: number; rs: [number, number][] } | null = null;
  const flush = () => {
    if (group) for (const [m0, m1] of group.rs) out.push({ s0: group.k0, s1: group.k1, m0, m1 });
    group = null;
  };
  for (let k = 0; k < nS; k++) {
    const rs = runs(k);
    if (!rs.length) {
      flush();
      continue;
    }
    const g = group as { k0: number; k1: number; rs: [number, number][] } | null;
    if (g && JSON.stringify(g.rs) === JSON.stringify(rs) && !wallOnLine(k, rs)) g.k1 = k;
    else {
      flush();
      group = { k0: k, k1: k, rs };
    }
  }
  flush();
  return out;
}

export function planFoundation(
  input: HouseInput,
  plan: HousePlan,
  geo: WallGeometry[],
  c: EngineConstants,
  warnings: Warning[],
  grid = planGrid(plan, geo, solidBelow),
): FoundationResult | null {
  const f = input.foundation;
  if (!f || !grid) return null;
  const dir = input.floorDirection ?? 'AB';
  // AB: prussid sügavuse suunas (y), vahe laiuse suunas (x); 12 vastupidi
  const spacingX = dir === 'AB';
  const half = input.log.thickness / 2;
  const o = c.cornerOverhang;
  const jw = f.joistWidth;
  const kS = (spacingX ? f.distanceFromWall12 : f.distanceFromWallAB) ?? 0;
  const kR = (spacingX ? f.distanceFromWallAB : f.distanceFromWall12) ?? 0;
  const sv = spacingX ? grid.xs : grid.ys;
  const jv = spacingX ? grid.ys : grid.xs;
  const sDir: 'x' | 'y' = spacingX ? 'x' : 'y';
  const jDir: 'x' | 'y' = spacingX ? 'y' : 'x';
  const local: Warning[] = [];

  const result: FoundationBay[] = bays(grid, spacingX).map((b) => {
    const s0 = sv[b.s0]!;
    const s1 = sv[b.s1 + 1]!;
    const a0 = jv[b.m0]!;
    const a1 = jv[b.m1 + 1]!;
    // välisseina serval -> välispind (kesktelg + t/2); vaheseina all (teisel pool ka lõik) kesktelg,
    // nii et naaberlõikude prussid jäävad seina alla kõrvuti (Lund: topeltpruss seina 2 all)
    const across = (k: number) => k >= 0 && k < sv.length - 1 && Array.from({ length: b.m1 - b.m0 + 1 }, (_, i) => b.m0 + i).some((m) => (spacingX ? grid.inside[k]![m] : grid.inside[m]![k]));
    const S0 = s0 - (edgeHasWall(geo, jDir, s0, a0, a1) && !across(b.s0 - 1) ? half : 0);
    const S1 = s1 + (edgeHasWall(geo, jDir, s1, a0, a1) && !across(b.s1 + 1) ? half : 0);
    const A0 = a0 - (edgeHasWall(geo, sDir, a0, s0, s1) ? half : 0);
    const A1 = a1 + (edgeHasWall(geo, sDir, a1, s0, s1) ? half : 0);
    const sLen = S1 - S0;
    const aLen = A1 - A0;
    const dims = spacingX ? { width: sLen + 2 * o, depth: aLen + 2 * o } : { width: aLen + 2 * o, depth: sLen + 2 * o };
    const r = computeFoundation(input, dims, c, local)!;
    const along0 = A0 + kS + (r.ringPieces ? jw : 0);
    const box = (s: number, sw: number, a: number, al: number): PlanBox =>
      spacingX ? { x0: s, x1: s + sw, y0: a, y1: a + al } : { x0: a, x1: a + al, y0: s, y1: s + sw };
    const joists: PlanBox[] = [];
    for (let i = 0; i < Math.min(r.joistCount, 200); i++) joists.push(box(S0 + kS + i * r.spacing, jw, along0, r.joistLength));
    // ringi tükid prussidega risti, prusside otstes
    const ring: PlanBox[] = r.ringPieces
      ? [along0 - jw, along0 + r.joistLength].map((a) => box(S0 + kR, r.ringPieces!.length, a, jw))
      : [];
    return { ...r, box: box(S0, sLen, A0, aLen), joists, ring };
  });
  if (!result.length) return null;
  for (const w of local) if (!warnings.some((x) => x.code === w.code)) warnings.push(w);
  const ringPieces = result.some((b) => b.ringPieces)
    ? { count: result.reduce((s, b) => s + (b.ringPieces?.count ?? 0), 0), length: Math.max(...result.map((b) => b.ringPieces?.length ?? 0)) }
    : null;
  return {
    joistCount: result.reduce((s, b) => s + b.joistCount, 0),
    spacing: Math.max(...result.map((b) => b.spacing)),
    joistLength: Math.max(...result.map((b) => b.joistLength)),
    ringPieces,
    totalJm: result.reduce((s, b) => s + b.totalJm, 0),
    bays: result,
  };
}

