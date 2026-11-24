import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DEFAULT_CONSTANTS, type CalcResult } from '@logcalc/calc-engine';
import { DimLines, type Dim } from '../dim-lines/dim-lines';
import type { HouseFormValue, RowValue } from '../../core/house-form';

export type DrawingView = 'overview' | 'side' | 'floor' | 'foundation';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

let uid = 0;

/**
 * Skemaatilised joonised. Koordinaadid on millimeetrites (SVG viewBox), mõõtkava tuleb automaatselt.
 * - overview:   plaan (A/B/1/2 seinad) + eestvaade (viilkatus) / külgvaade (ühekalle)
 * - floor:      põrandalaudade plaan
 * - foundation: vundamendi prusside plaan
 * Uste/akende asukohti mudel veel ei tea – eestvaates on need paigutatud ühtlaselt (skeem).
 */
@Component({
  selector: 'app-house-drawing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, NgTemplateOutlet, DimLines],
  templateUrl: './house-drawing.html',
  styleUrl: './house-drawing.scss',
})
export class HouseDrawing {
  readonly v = input.required<HouseFormValue>();
  readonly r = input.required<CalcResult>();
  readonly view = input<DrawingView>('overview');

  protected readonly clipId = `lc-clip-${++uid}`;

  protected readonly plan = computed(() => {
    const { width: W, depth: D } = this.r().dimensions;
    const t = Math.max(this.v().logThickness, 1);
    const o = DEFAULT_CONSTANTS.cornerOverhang;
    const m = Math.max(W, D);
    const pad = m * 0.12;
    const fs = m * 0.04;
    const df = fs * 0.8; // mõõtude teksti suurus
    const d1 = df * 2.2; // sisemine kett
    const d2 = df * 4.6; // väline kett
    const walls: Rect[] = [
      { x: 0, y: o, w: W, h: t }, // sein 2
      { x: 0, y: D - o - t, w: W, h: t }, // sein 1
      { x: o, y: 0, w: t, h: D }, // sein A
      { x: W - o - t, y: 0, w: t, h: D }, // sein B
    ];
    const ax = -pad * 0.55;
    const labels = [
      { t: 'A', x: o + t / 2, y: ax },
      { t: 'B', x: W - o - t / 2, y: ax },
      { t: '2', x: ax, y: o + t / 2 },
      { t: '1', x: ax, y: D - o - t / 2 },
    ];
    // Mõõdukett: nurgaülejääk | välisseina mõõt | nurgaülejääk  ja kogu palgi pikkus
    const dims: Dim[] = [
      { x1: 0, y1: D, x2: o, y2: D, offset: d1, shift: 'start' },
      { x1: o, y1: D, x2: W - o, y2: D, offset: d1 },
      { x1: W - o, y1: D, x2: W, y2: D, offset: d1, shift: 'end' },
      { x1: 0, y1: D, x2: W, y2: D, offset: d2 },
      { x1: W, y1: 0, x2: W, y2: o, offset: -d1, shift: 'start' },
      { x1: W, y1: o, x2: W, y2: D - o, offset: -d1 },
      { x1: W, y1: D - o, x2: W, y2: D, offset: -d1 },
      { x1: W, y1: 0, x2: W, y2: D, offset: -d2 },
    ];
    const far = d2 + df * 2;
    return {
      W,
      D,
      o,
      t,
      fs,
      df,
      walls,
      labels,
      dims,
      viewBox: `${-pad} ${-pad} ${W + pad + far} ${D + pad + far}`,
    };
  });

  /** Põrandalauad: suund AB = lauad laiuse suunas (x), 12 = pikkuse suunas (y). */
  protected readonly floorPlan = computed(() => {
    const fl = this.r().floor;
    if (!fl) return null;
    const { W, D, o, t } = this.plan();
    const v = this.v();
    const bw = Math.max(v.floorBoardWidth, 1);
    const inner = { x: o + t, y: o + t, w: W - 2 * (o + t), h: D - 2 * (o + t) };
    const boards: Rect[] = [];
    const across = v.floorDirection === 'AB' ? inner.h : inner.w;
    const n = Math.min(Math.ceil(across / bw), 400);
    for (let i = 0; i < n; i++) {
      boards.push(
        v.floorDirection === 'AB'
          ? { x: inner.x, y: inner.y + i * bw, w: fl.boardLength, h: bw }
          : { x: inner.x + i * bw, y: inner.y, w: bw, h: fl.boardLength },
      );
    }
    const { df } = this.plan();
    const dims: Dim[] =
      v.floorDirection === 'AB'
        ? [{ x1: inner.x, y1: inner.y + inner.h / 2, x2: inner.x + fl.boardLength, y2: inner.y + inner.h / 2, offset: -df * 0.2 }]
        : [{ x1: inner.x + inner.w / 2, y1: inner.y, x2: inner.x + inner.w / 2, y2: inner.y + fl.boardLength, offset: df * 0.2 }];
    return { inner, boards, dims, label: `${fl.boardCount} × ${Math.round(fl.boardLength)} mm` };
  });

  /** Vundamendi prussid. Suund AB: prussid sügavuse suunas, paigutatud laiuse peale; 12 vastupidi. */
  protected readonly foundationPlan = computed(() => {
    const f = this.r().foundation;
    if (!f) return null;
    const { o, df } = this.plan();
    const v = this.v();
    const jw = Math.max(v.joistWidth, 1);
    const k12 = v.dist12;
    const kAB = v.distAB;
    const ab = v.floorDirection === 'AB';
    const joists: Rect[] = [];
    const ring: Rect[] = [];
    const startAlong = (ab ? o + k12 : o + kAB) + (f.ringPieces ? jw : 0);
    for (let i = 0; i < Math.min(f.joistCount, 200); i++) {
      const pos = (ab ? o + k12 : o + kAB) + i * f.spacing;
      joists.push(ab ? { x: pos, y: startAlong, w: jw, h: f.joistLength } : { x: startAlong, y: pos, w: f.joistLength, h: jw });
    }
    if (f.ringPieces) {
      const len = f.ringPieces.length;
      const a = startAlong - jw;
      const b = startAlong + f.joistLength;
      if (ab) {
        ring.push({ x: o + kAB, y: a, w: len, h: jw }, { x: o + kAB, y: b, w: len, h: jw });
      } else {
        ring.push({ x: a, y: o + k12, w: jw, h: len }, { x: b, y: o + k12, w: jw, h: len });
      }
    }
    const dims: Dim[] = [];
    const j0 = joists[0];
    const j1 = joists[1];
    if (j0) {
      // prussi pikkus
      dims.push(
        ab
          ? { x1: j0.x, y1: j0.y, x2: j0.x, y2: j0.y + j0.h, offset: df * 1.6 }
          : { x1: j0.x, y1: j0.y, x2: j0.x + j0.w, y2: j0.y, offset: -df * 1.6 },
      );
    }
    if (j0 && j1) {
      // kesktelgede vahe (k/k)
      dims.push(
        ab
          ? { x1: j0.x + jw / 2, y1: j0.y, x2: j1.x + jw / 2, y2: j1.y, offset: -df * 1.6 }
          : { x1: j0.x, y1: j0.y + jw / 2, x2: j1.x, y2: j1.y + jw / 2, offset: df * 1.6 },
      );
    }
    const ringNote = f.ringPieces ? ` + ring 2 × ${Math.round(f.ringPieces.length)} mm` : '';
    return { joists, ring, dims, label: `${f.joistCount} × ${Math.round(f.joistLength)} mm${ringNote}, vahe ${Math.round(f.spacing)} mm` };
  });

  /**
   * Uksed ja aknad seinal 1 (esisein, laius W). Mudel asukohti veel ei tea –
   * jaotatakse ühtlaselt; sama paigutust kasutavad plaan ja eestvaade.
   */
  protected readonly frontOpenings = computed(() => {
    const v = this.v();
    const W = this.r().dimensions.width;
    const o = DEFAULT_CONSTANTS.cornerOverhang;
    const units: { kind: 'door' | 'window'; w: number; h: number }[] = [];
    const push = (kind: 'door' | 'window', list: RowValue[]) =>
      list.forEach((x) => {
        for (let i = 0; i < Math.min(x.count, 6); i++) if (x.a > 0 && x.b > 0) units.push({ kind, w: x.a, h: x.b });
      });
    push('door', v.doors);
    push('window', v.windows);
    const inner0 = o + v.logThickness;
    const innerW = W - 2 * inner0;
    const gap = units.length ? Math.max((innerW - units.reduce((sum, u) => sum + u.w, 0)) / (units.length + 1), 0) : 0;
    let x = inner0 + gap;
    return units.map((u) => {
      const res = { ...u, x };
      x += u.w + gap;
      return res;
    });
  });

  /** Plaan: avad seinal 1 (uks: ava + avanemiskaar, aken: topeltjoon) */
  protected readonly planOpenings = computed(() => {
    const { D, o, t } = this.plan();
    const yIn = D - o - t; // siseserv
    const yOut = D - o; // välisserv
    return this.frontOpenings().map((u) => ({
      kind: u.kind,
      gap: { x: u.x, y: yIn, w: u.w, h: t },
      // uks avaneb sissepoole: hing vasakul, leht + veerandkaar
      swing: u.kind === 'door' ? `M${u.x},${yIn} L${u.x},${yIn - u.w} A${u.w},${u.w} 0 0 1 ${u.x + u.w},${yIn}` : null,
      glass: u.kind === 'window' ? { x1: u.x, x2: u.x + u.w, y1: yIn + t / 3, y2: yOut - t / 3 } : null,
    }));
  });

  /** Eestvaade: sein 1 (viilkatusel koos viiluga, ühekaldelisel kõrge esisein) */
  protected readonly elev = computed(() => this.elevation('front'));
  /** Külgvaade (ühekaldelise kolmnurk) */
  protected readonly elevSide = computed(() => this.elevation('side'));

  private elevation(kind: 'front' | 'side') {
    const v = this.v();
    const r = this.r();
    const gable = v.roofType === 'gable';
    const side = kind === 'side' && !gable;
    const { width: W, depth: D } = r.dimensions;
    const p = Math.max(v.logHeight, 1);
    const t = v.logThickness;
    const o = DEFAULT_CONSTANTS.cornerOverhang;
    const ov = v.roofOn && v.roofOverhang > 0 ? v.roofOverhang : DEFAULT_CONSTANTS.defaultRoofOverhang;
    const L = side ? D : W; // joonise laius
    const wallH = gable ? v.frontBackWallHeight : side ? v.roofHeight - p / 2 : v.frontBackWallHeight;
    const top = Math.max(v.roofHeight, v.frontBackWallHeight) + p;
    const Y = (h: number) => top - h;
    const fs = Math.max(L, top) * 0.04;

    const lines: number[] = [];
    // viilu / kolmnurga palgid mootorist (ühekalde eestvaates neid pole)
    const courses: Rect[] = gable || side
      ? r.walls.gableCourses.map((c) => {
          const bottom = wallH + (c.index - 1) * p;
          return gable
            ? { x: L / 2 - c.length / 2, y: Y(bottom + p), w: c.length, h: p }
            : { x: 0, y: Y(bottom + p), w: c.length, h: p };
        })
      : [];
    const highest = Math.max(wallH, ...courses.map((c) => top - c.y));
    // esi/tagasein algab poole palgiga; külgsein täispalgiga
    for (let h = side ? p : p / 2; h < wallH - 1; h += p) lines.push(Y(h));
    const body: Rect = { x: 0, y: Y(wallH), w: L, h: Math.max(wallH, 0) };

    // katusejoon + lõikeala selle all
    let roof: string;
    let clip: string;
    const big = top * 2;
    if (gable) {
      const run = (W - 2 * (o + t)) / 2;
      const slope = run > 0 ? (v.roofHeight - v.sideWallHeight) / run : 0;
      const yAt = (x: number) => v.roofHeight - slope * Math.abs(W / 2 - x);
      const xe = o - ov;
      roof = `${xe},${Y(yAt(xe))} ${W / 2},${Y(v.roofHeight)} ${W - xe},${Y(yAt(W - xe))}`;
      clip = `${-big},${Y(yAt(-big))} ${W / 2},${Y(v.roofHeight)} ${W + big},${Y(yAt(W + big))} ${W + big},${Y(-big)} ${-big},${Y(-big)}`;
    } else if (side) {
      const x1 = o + t;
      const x2 = D - o - t;
      const slope = (v.frontBackWallHeight - v.roofHeight) / Math.max(x2 - x1, 1);
      const yAt = (x: number) => v.frontBackWallHeight - slope * (x - x1);
      roof = `${-ov},${Y(yAt(-ov))} ${D + ov},${Y(yAt(D + ov))}`;
      clip = `${-big},${Y(yAt(-big))} ${D + big},${Y(yAt(D + big))} ${D + big},${Y(-big)} ${-big},${Y(-big)}`;
    } else {
      // ühekalle eestvaates: katuseserv horisontaalselt esiseina kohal
      const xe = o - ov;
      roof = `${xe},${Y(v.frontBackWallHeight)} ${W - xe},${Y(v.frontBackWallHeight)}`;
      clip = `${-big},${Y(v.frontBackWallHeight)} ${W + big},${Y(v.frontBackWallHeight)} ${W + big},${Y(-big)} ${-big},${Y(-big)}`;
    }

    // uksed ja aknad – ainult eestvaates (sein 1)
    const openings = side
      ? []
      : this.frontOpenings().map((u) => {
          const sill = u.kind === 'door' ? 0 : Math.max(Math.min(900, wallH - u.h - p), 0);
          return { kind: u.kind, x: u.x, y: Y(sill + u.h), w: u.w, h: Math.min(u.h, wallH) };
        });

    // Mõõtjooned
    const df = fs * 0.8;
    const d1 = df * 2.2;
    const d2 = df * 4.6;
    const Y0 = Y(0);
    const dims: Dim[] = [{ x1: 0, y1: Y0, x2: L, y2: Y0, offset: d1 }];
    for (const op of openings) {
      const yb = op.y + op.h;
      dims.push({ x1: op.x, y1: yb, x2: op.x + op.w, y2: yb, offset: -df * 1.3 });
    }
    let xL: number;
    let xR: number;
    if (gable) {
      xL = o - ov;
      xR = W - xL;
      const hF = v.frontBackWallHeight;
      const hR = v.roofHeight;
      const hS = v.sideWallHeight;
      dims.push(
        { x1: xL, y1: Y0, x2: xL, y2: Y(hF), offset: -d1, from1: [0, Y0], from2: [0, Y(hF)] },
        { x1: xL, y1: Y(hF), x2: xL, y2: Y(hR), offset: -d1, from1: [0, Y(hF)], from2: [W / 2, Y(hR)] },
        { x1: xL, y1: Y0, x2: xL, y2: Y(hR), offset: -d2, from1: [0, Y0], from2: [W / 2, Y(hR)] },
        { x1: xR, y1: Y0, x2: xR, y2: Y(hS), offset: d1, from1: [W, Y0], from2: [W - o - t, Y(hS)] },
      );
    } else if (side) {
      xL = -ov;
      xR = D + ov;
      dims.push(
        { x1: xL, y1: Y0, x2: xL, y2: Y(v.frontBackWallHeight), offset: -d1, from1: [0, Y0], from2: [o + t, Y(v.frontBackWallHeight)] },
        { x1: xR, y1: Y0, x2: xR, y2: Y(v.roofHeight), offset: d1, from1: [D, Y0], from2: [D - o - t, Y(v.roofHeight)] },
      );
    } else {
      xL = o - ov;
      xR = W - xL;
      dims.push({ x1: xL, y1: Y0, x2: xL, y2: Y(v.frontBackWallHeight), offset: -d1, from1: [0, Y0], from2: [0, Y(v.frontBackWallHeight)] });
    }
    const left = xL - (gable ? d2 : d1) - df * 2;
    const right = xR + d1 + df * 2;
    const bottom = Y0 + d1 + df * 2;
    const topY = Y(Math.max(gable || side ? v.roofHeight : v.frontBackWallHeight, highest)) - df * 2;

    return {
      caption: gable
        ? 'Eestvaade – sein 1 (esisein ja viil)'
        : side
          ? 'Külgvaade – sein A (kolmnurk)'
          : 'Eestvaade – sein 1 (kõrge esisein)',
      viewBox: `${left} ${topY} ${right - left} ${bottom - topY}`,
      fs,
      body,
      lines,
      courses,
      openings,
      roof,
      clip,
      dims,
      groundX1: -ov,
      groundX2: L + ov,
      groundY: Y(0),
    };
  }
}
