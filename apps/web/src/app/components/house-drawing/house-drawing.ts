import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DEFAULT_CONSTANTS, planBounds, planGeometry, type CalcResult, type PlanBox, type WallId } from '@logcalc/calc-engine';
import { DimLines, type Dim } from '../dim-lines/dim-lines';
import { PlanEditor } from '../plan-editor/plan-editor';
import { WallView } from '../wall-view/wall-view';
import type { HouseFormValue } from '../../core/house-form';

export type DrawingView = 'overview' | 'side' | 'walls' | 'floor' | 'foundation';

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
  imports: [DecimalPipe, NgTemplateOutlet, DimLines, PlanEditor, WallView],
  templateUrl: './house-drawing.html',
  styleUrl: './house-drawing.scss',
})
export class HouseDrawing {
  readonly v = input.required<HouseFormValue>();
  readonly r = input.required<CalcResult>();
  readonly view = input<DrawingView>('overview');

  /** plaanist maja: mõõdud (mallide jaoks, siin ainult kuvamine) ja esisein mudelist */
  protected readonly planSize = computed(() => ({ width: this.r().dimensions.width, depth: this.r().dimensions.depth }));
  protected readonly frontWall = computed(() => {
    const ws = this.r().wallModel;
    return ws.find((w) => w.id === '1') ?? ws[0] ?? null;
  });

  /** plaanist maja: kõik seinad (numbrid eest taha, siis tähed vasakult paremale) */
  protected readonly allWalls = computed(() => {
    const key = (id: string) => {
      const m = /^(\d+)(.*)$/.exec(id);
      return m ? [0, Number(m[1]), m[2] ?? ''] as const : [1, 0, id] as const;
    };
    return [...this.r().wallModel].sort((a, b) => {
      const ka = key(a.id);
      const kb = key(b.id);
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2], 'et', { numeric: true });
    });
  });

  protected readonly clipId = `lc-clip-${++uid}`;

  protected readonly plan = computed(() => {
    const { width: W, depth: D } = this.r().dimensions;
    const t = Math.max(this.v().logThickness, 1);
    const o = DEFAULT_CONSTANTS.cornerOverhang;
    const m = Math.max(W, D);
    const pad = m * 0.12;
    const fs = m * 0.04;
    const df = fs * 0.8; // mõõtude teksti suurus
    const step = df * 2.4; // ketikihtide vahe
    const walls: Rect[] = [
      { x: 0, y: o, w: W, h: t }, // sein 2
      { x: 0, y: D - o - t, w: W, h: t }, // sein 1
      { x: o, y: 0, w: t, h: D }, // sein A
      { x: W - o - t, y: 0, w: t, h: D }, // sein B
    ];

    // avade mõõtkett seina kohta: palgi otsast -> ava -> ava -> ... -> palgi otsani (nagu Revitis)
    const placed = this.r().placedOpenings;
    const chainPts = (wall: WallId): number[] | null => {
      const ops = placed.filter((op) => op.wall === wall).sort((a, b) => a.offset - b.offset);
      if (!ops.length) return null;
      const len = wall === '1' || wall === '2' ? W : D;
      const pts = [0, ...ops.flatMap((op) => [op.offset, op.offset + op.width]), len]
        .map((x) => Math.min(Math.max(x, 0), len))
        .sort((a, b) => a - b);
      return pts.filter((x, i) => i === 0 || x - pts[i - 1]! > 0.5);
    };
    const c1 = chainPts('1');
    const c2 = chainPts('2');
    const cA = chainPts('A');
    const cB = chainPts('B');

    const dims: Dim[] = [];
    const segs = (pts: number[], make: (a: number, b: number) => Dim) => {
      for (let i = 0; i + 1 < pts.length; i++) dims.push(make(pts[i]!, pts[i + 1]!));
    };
    // all (sein 1): avade kett seina välispinnalt, siis nurgaülejäägid, siis kogupikkus
    const b1 = step;
    const b2 = c1 ? 2 * step : step;
    const b3 = b2 + step;
    if (c1) segs(c1, (a, b) => ({ x1: a, y1: D - o, x2: b, y2: D - o, offset: o + b1 }));
    dims.push(
      { x1: 0, y1: D, x2: o, y2: D, offset: b2, shift: 'start' },
      { x1: o, y1: D, x2: W - o, y2: D, offset: b2 },
      { x1: W - o, y1: D, x2: W, y2: D, offset: b2, shift: 'end' },
      { x1: 0, y1: D, x2: W, y2: D, offset: b3 },
    );
    // paremal (sein B)
    const r2 = cB ? 2 * step : step;
    const r3 = r2 + step;
    if (cB) segs(cB, (a, b) => ({ x1: W - o, y1: a, x2: W - o, y2: b, offset: -(o + step) }));
    dims.push(
      { x1: W, y1: 0, x2: W, y2: o, offset: -r2, shift: 'start' },
      { x1: W, y1: o, x2: W, y2: D - o, offset: -r2 },
      { x1: W, y1: D - o, x2: W, y2: D, offset: -r2 },
      { x1: W, y1: 0, x2: W, y2: D, offset: -r3 },
    );
    // üleval (sein 2) ja vasakul (sein A): ainult avade kett
    if (c2) segs(c2, (a, b) => ({ x1: a, y1: o, x2: b, y2: o, offset: -(o + step) }));
    if (cA) segs(cA, (a, b) => ({ x1: o, y1: a, x2: o, y2: b, offset: o + step }));

    // telgede tähised väljapoole ketti
    const ax = -(c2 || cA ? step + df * 2 : pad * 0.55);
    const labels = [
      { t: 'A', x: o + t / 2, y: c2 ? ax : -pad * 0.55 },
      { t: 'B', x: W - o - t / 2, y: c2 ? ax : -pad * 0.55 },
      { t: '2', x: cA ? ax : -pad * 0.55, y: o + t / 2 },
      { t: '1', x: cA ? ax : -pad * 0.55, y: D - o - t / 2 },
    ];
    const near = Math.max(pad, -ax + df * 1.5);
    const farX = r3 + df * 2;
    const farY = b3 + df * 2;
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
      viewBox: `${-near} ${-near} ${W + near + farX} ${D + near + farY}`,
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
   * Plaanist maja: seinad graafist (põranda- ja vundamendijoonise alus).
   * Koordinaadid = plaani koordinaadid (sõlmed palgi kesktelgedel).
   */
  protected readonly graph = computed(() => {
    const hp = this.v().plan;
    if (!hp) return null;
    const t = Math.max(this.v().logThickness, 1);
    let geo;
    try {
      geo = planGeometry(hp, t, DEFAULT_CONSTANTS);
    } catch {
      return null;
    }
    if (!geo.length) return null;
    const b = planBounds(geo);
    const W = b.x1 - b.x0;
    const D = b.y1 - b.y0;
    const m = Math.max(W, D);
    const fs = m * 0.035;
    const pad = m * 0.12;
    const walls = geo.map((g) => {
      const x0 = Math.min(g.a.x, g.b.x);
      const x1 = Math.max(g.a.x, g.b.x);
      const y0 = Math.min(g.a.y, g.b.y);
      const y1 = Math.max(g.a.y, g.b.y);
      const rect: Rect =
        g.dir === 'x'
          ? { x: x0 - (g.a.x < g.b.x ? g.startExt : g.endExt), y: g.a.y - t / 2, w: x1 - x0 + g.startExt + g.endExt, h: t }
          : { x: g.a.x - t / 2, y: y0 - (g.a.y < g.b.y ? g.startExt : g.endExt), w: t, h: y1 - y0 + g.startExt + g.endExt };
      const label =
        g.dir === 'x' ? { x: (x0 + x1) / 2, y: g.a.y - t / 2 - fs * 0.7 } : { x: g.a.x - t / 2 - fs * 0.7, y: (y0 + y1) / 2 };
      return { id: g.id, rect, label };
    });
    const dims: Dim[] = [
      { x1: b.x0, y1: b.y1, x2: b.x1, y2: b.y1, offset: fs * 2 },
      { x1: b.x1, y1: b.y1, x2: b.x1, y2: b.y0, offset: fs * 2 },
    ];
    return { walls, dims, fs, viewBox: `${b.x0 - pad} ${b.y0 - pad} ${W + 2 * pad} ${D + 2 * pad}` };
  });

  /** Plaanist maja: põrand ruumide kaupa (lauad iga osa ristkülikus) */
  protected readonly graphFloor = computed(() => {
    const g = this.graph();
    const fl = this.r().floor;
    if (!g || !fl?.parts) return null;
    const bw = Math.max(this.v().floorBoardWidth, 1);
    let boardsLeft = 3000;
    const parts = fl.parts.map((p, i) => {
      const bx = p.box;
      const boards: Rect[] = [];
      const n = Math.min(p.boardCount, boardsLeft);
      boardsLeft -= n;
      for (let k = 0; k < n; k++) {
        boards.push(
          p.along === 'x'
            ? { x: bx.x0, y: bx.y0 + k * bw, w: p.boardLength, h: bw }
            : { x: bx.x0 + k * bw, y: bx.y0, w: bw, h: p.boardLength },
        );
      }
      const mid = p.along === 'x' ? (bx.y0 + bx.y1) / 2 : (bx.x0 + bx.x1) / 2;
      const dim: Dim =
        p.along === 'x'
          ? { x1: bx.x0, y1: mid, x2: bx.x0 + p.boardLength, y2: mid, offset: -g.fs * 0.2 }
          : { x1: mid, y1: bx.y0, x2: mid, y2: bx.y0 + p.boardLength, offset: g.fs * 0.2 };
      return { clip: `${this.clipId}-f${i}`, box: toRect(bx), boards, dim, open: p.open };
    });
    const label = fl.parts.map((p) => (p.open ? 'terrass ' : '') + p.boardCount + ' × ' + Math.round(p.boardLength)).join(' + ');
    return { parts, dims: parts.map((p) => p.dim), label: label + ' mm' };
  });

  /** Plaanist maja: vundament lõikude kaupa */
  protected readonly graphFoundation = computed(() => {
    const g = this.graph();
    const f = this.r().foundation;
    if (!g || !f?.bays) return null;
    const ab = this.v().floorDirection === 'AB';
    const joists = f.bays.flatMap((b) => b.joists.map(toRect));
    const ring = f.bays.flatMap((b) => b.ring.map(toRect));
    const dims: Dim[] = [];
    for (const b of f.bays) {
      const j0 = b.joists[0];
      const j1 = b.joists[1];
      if (j0) {
        dims.push(
          ab
            ? { x1: j0.x0, y1: j0.y0, x2: j0.x0, y2: j0.y1, offset: g.fs * 1.4 }
            : { x1: j0.x0, y1: j0.y0, x2: j0.x1, y2: j0.y0, offset: -g.fs * 1.4 },
        );
      }
      if (j0 && j1) {
        dims.push(
          ab
            ? { x1: (j0.x0 + j0.x1) / 2, y1: j0.y0, x2: (j1.x0 + j1.x1) / 2, y2: j1.y0, offset: -g.fs * 1.4 }
            : { x1: j0.x0, y1: (j0.y0 + j0.y1) / 2, x2: j1.x0, y2: (j1.y0 + j1.y1) / 2, offset: g.fs * 1.4 },
        );
      }
    }
    const ringNote = f.ringPieces ? ' + ring ' + f.ringPieces.count + ' tk' : '';
    const lens = [...new Set(f.bays.map((b) => Math.round(b.joistLength)))].join(' / ');
    return { joists, ring, dims, label: f.joistCount + ' prussi (' + lens + ' mm)' + ringNote + ', ' + f.bays.length + ' lõiku' };
  });

  /** Plaan: avad kõigil seintel (mootori paigutus). Uks: ava + avanemiskaar sissepoole, aken: topeltjoon. */
  protected readonly planOpenings = computed(() => {
    const { W, D, o, t } = this.plan();
    return this.r().placedOpenings.map((u) => {
      const a = u.offset;
      const b = u.offset + u.width;
      // seina sise- ja väliserv ning sissepoole suund
      const horiz = u.wall === '1' || u.wall === '2';
      const inner = u.wall === '1' ? D - o - t : u.wall === '2' ? o + t : u.wall === 'A' ? o + t : W - o - t;
      const outer = u.wall === '1' ? D - o : u.wall === '2' ? o : u.wall === 'A' ? o : W - o;
      const dir = Math.sign(outer - inner) * -1; // sissepoole
      const gap = horiz
        ? { x: a, y: Math.min(inner, outer), w: u.width, h: t }
        : { x: Math.min(inner, outer), y: a, w: t, h: u.width };
      const leaf = inner + dir * u.width;
      const swing =
        u.kind !== 'door'
          ? null
          : horiz
            ? `M${a},${inner} L${a},${leaf} A${u.width},${u.width} 0 0 ${dir < 0 ? 1 : 0} ${b},${inner}`
            : `M${inner},${a} L${leaf},${a} A${u.width},${u.width} 0 0 ${dir > 0 ? 1 : 0} ${inner},${b}`;
      const q1 = inner + (outer - inner) / 3;
      const q2 = inner + ((outer - inner) * 2) / 3;
      const glass =
        u.kind !== 'window'
          ? null
          : horiz
            ? [{ x1: a, x2: b, y1: q1, y2: q1 }, { x1: a, x2: b, y1: q2, y2: q2 }]
            : [{ x1: q1, x2: q1, y1: a, y2: b }, { x1: q2, x2: q2, y1: a, y2: b }];
      return { kind: u.kind, gap, swing, glass };
    });
  });

  /** Eestvaade: sein 1 (viilkatusel koos viiluga, ühekaldelisel kõrge esisein) */
  protected readonly elev = computed(() => this.elevation('front'));
  /** Külgvaade (ühekaldelise kolmnurk) */
  /**
   * Külgvaated väljast vaadatuna: sein B (esisein vasakul) ja sein A (peegelpilt, tagasein vasakul).
   * Kui seintel A ja B on samad avad samades kohtades, näidatakse ainult üht.
   */
  protected readonly elevSides = computed(() => {
    const key = (w: WallId) =>
      this.r()
        .placedOpenings.filter((u) => u.wall === w)
        .map((u) => `${u.kind}:${Math.round(u.offset)}:${Math.round(u.width)}:${Math.round(u.sill)}:${Math.round(u.height)}`)
        .sort()
        .join('|');
    const same = key('A') === key('B');
    const b = this.elevation('sideB');
    if (same) return [{ ...b, caption: 'Külgvaade – sein B (sein A on sama, peegelpildis)' }];
    return [b, this.elevation('sideA')];
  });

  private elevation(kind: 'front' | 'sideB' | 'sideA') {
    const v = this.v();
    const r = this.r();
    const gable = v.roofType === 'gable';
    const side = kind !== 'front' && !gable;
    const sideWall: WallId = kind === 'sideA' ? 'A' : 'B';
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

    // uksed ja aknad mootori paigutusest: eestvaates sein 1, külgvaates sein B (A peegeldatakse lõpus)
    // (külgvaates on esisein vasakul; külgseina kaugus mõõdetakse plaanil ülevalt = tagaseina poolt)
    const openings = r.placedOpenings
      .filter((u) => u.wall === (side ? sideWall : '1'))
      .map((u) => {
        const h = Math.max(Math.min(u.height, wallH - u.sill), 0);
        const x = side ? D - u.offset - u.width : u.offset;
        return { kind: u.kind, x, y: Y(u.sill + h), w: u.width, h };
      });

    // Mõõtjooned
    const df = fs * 0.8;
    const d1 = df * 2.2;
    const d2 = df * 4.6;
    const Y0 = Y(0);
    // aluse all: avade kett (palgi otsast ava servadeni, nagu Revitis) ja kogupikkus
    const dims: Dim[] = [];
    let bottomFar = d1;
    if (openings.length) {
      const pts = [0, ...openings.flatMap((op) => [op.x, op.x + op.w]), L].sort((a, b) => a - b);
      const uniq = pts.filter((x, i) => i === 0 || x - pts[i - 1]! > 0.5);
      for (let i = 0; i + 1 < uniq.length; i++) dims.push({ x1: uniq[i]!, y1: Y0, x2: uniq[i + 1]!, y2: Y0, offset: d1 });
      bottomFar = d2;
    }
    dims.push({ x1: 0, y1: Y0, x2: L, y2: Y0, offset: bottomFar });
    // akende alumine serv ja kõrgus (vertikaalne kett ava paremal küljel)
    for (const op of openings) {
      if (op.kind !== 'window') continue;
      const xr = op.x + op.w;
      const ySill = op.y + op.h;
      dims.push(
        { x1: xr, y1: Y0, x2: xr, y2: ySill, offset: -df * 1.2 },
        { x1: xr, y1: ySill, x2: xr, y2: op.y, offset: -df * 1.2 },
      );
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
    const bottom = Y0 + bottomFar + df * 2;
    const topY = Y(Math.max(gable || side ? v.roofHeight : v.frontBackWallHeight, highest)) - df * 2;

    const result = {
      caption: gable
        ? 'Eestvaade – sein 1 (esisein ja viil)'
        : side
          ? `Külgvaade – sein ${sideWall}`
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
    return kind === 'sideA' ? mirrorElevation(result, D) : result;
  }
}

/** Külgvaate peegeldus (sein A väljast vaadatuna = sein B peegelpildis): x -> L - x. */
function mirrorElevation<
  T extends {
    viewBox: string;
    body: Rect;
    courses: Rect[];
    openings: (Rect & { kind: 'door' | 'window' })[];
    roof: string;
    clip: string;
    dims: Dim[];
    groundX1: number;
    groundX2: number;
  },
>(e: T, L: number): T {
  const fx = (x: number) => L - x;
  const rect = <R extends Rect>(r: R): R => ({ ...r, x: L - r.x - r.w });
  const pts = (p: string) =>
    p
      .trim()
      .split(/\s+/)
      .map((xy) => {
        const [x, y] = xy.split(',').map(Number);
        return `${fx(x!)},${y}`;
      })
      .join(' ');
  const dims = e.dims.map((d): Dim => {
    const vertical = Math.abs(d.x1 - d.x2) < 1e-6;
    const from = (f?: [number, number]): [number, number] | undefined => (f ? [fx(f[0]), f[1]] : undefined);
    if (vertical) {
      return { ...d, x1: fx(d.x1), x2: fx(d.x2), offset: -d.offset, from1: from(d.from1), from2: from(d.from2) };
    }
    // horisontaalne: suund vasakult paremale säilib -> punktid vahetuvad
    const shift = d.shift === 'start' ? 'end' : d.shift === 'end' ? 'start' : undefined;
    return {
      x1: fx(d.x2), y1: d.y2, x2: fx(d.x1), y2: d.y1, offset: d.offset,
      ...(shift ? { shift } : {}),
      ...(d.text !== undefined ? { text: d.text } : {}),
      ...(d.from2 ? { from1: from(d.from2) } : {}),
      ...(d.from1 ? { from2: from(d.from1) } : {}),
    };
  });
  const [vx, vy, vw, vh] = e.viewBox.split(' ').map(Number) as [number, number, number, number];
  return {
    ...e,
    viewBox: `${L - (vx + vw)} ${vy} ${vw} ${vh}`,
    body: rect(e.body),
    courses: e.courses.map(rect),
    openings: e.openings.map(rect),
    roof: pts(e.roof),
    clip: pts(e.clip),
    dims,
    groundX1: fx(e.groundX2),
    groundX2: fx(e.groundX1),
  };
}

function toRect(b: PlanBox): Rect {
  return { x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 };
}
