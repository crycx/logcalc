import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DEFAULT_CONSTANTS, wallPieces, type WallSpec } from '@logcalc/calc-engine';
import { roofAtFn, underRoof } from '../../helpers/roof-cut';
import { DimLines, type Dim } from '../dim-lines/dim-lines';

/**
 * Ühe seina vaade mudelist: palgitükid oma kohal (pool palki, viilupalgid), avad, lahtised osad,
 * liidete teljed ja pikkade palkide jätkukohad. Seina x kulgeb sõlmest a sõlme b poole.
 * Katusejoonega (3D mudelist) lõigatakse viilupalgid kaldu ja lisanduvad kõrgusmõõdud.
 */
@Component({
  selector: 'app-wall-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DimLines],
  templateUrl: './wall-view.html',
  styleUrl: './wall-view.scss',
})
export class WallView {
  readonly wall = input.required<WallSpec>();
  readonly maxLogLength = input(DEFAULT_CONSTANTS.maxLogLength);
  /** Katuse alumine pind seina kohal (Wall3D.roofLine); null = palgid ristkülikutena */
  readonly roofLine = input<[number, number][] | null>(null);
  /** Mõõdud: avade kett, kõrgused (seinte vaates); kompaktses vaates ainult pikkus */
  readonly dimensions = input(false);

  protected readonly Math = Math;

  protected readonly view = computed(() => {
    const w = this.wall();
    const line = this.roofLine();
    const roofAt = line ? roofAtFn(line) : null;
    const pieces = wallPieces(w, { maxLogLength: this.maxLogLength() });
    const xs = pieces.flatMap((p) => [p.x0, p.x1]);
    const x0 = Math.min(0, ...xs);
    const x1 = Math.max(w.length, ...xs);

    // palgid: viilupalgid (ja muud katusest kõrgemad) katusejoone järgi hulknurgaks
    type Shape = { kind: string; poly: [number, number][] | null; rect: { x0: number; x1: number; y0: number; y1: number } };
    const shapes: (Shape & { spliceStart: boolean; spliceEnd: boolean })[] = [];
    for (const p of pieces) {
      const cut = line && roofAt && p.kind === 'gable' ? underRoof(p, line, roofAt) : null;
      if (cut === 'none') continue;
      shapes.push({ kind: p.kind, poly: cut, rect: p, spliceStart: p.spliceStart, spliceEnd: p.spliceEnd });
    }
    const top = (s: Shape) => (s.poly ? Math.max(...s.poly.map((q) => q[1])) : s.rect.y1);
    const H = Math.max(1, ...shapes.map(top));
    const eave = Math.max(0, ...shapes.filter((s) => s.kind !== 'gable').map((s) => s.rect.y1));
    const m = Math.max(x1 - x0, H);
    const fs = m * 0.035;
    const Y = (y: number) => H - y; // SVG y alla

    const rects = shapes
      .filter((s) => !s.poly)
      .map((s) => ({ x: s.rect.x0, y: Y(s.rect.y1), w: s.rect.x1 - s.rect.x0, h: s.rect.y1 - s.rect.y0, kind: s.kind }));
    const polys = shapes.filter((s) => s.poly).map((s) => ({ kind: s.kind, points: s.poly!.map(([x, y]) => `${x},${Y(y)}`).join(' ') }));
    const openings = w.openings.map((o) => {
      const x = o.offset;
      // uks: tiivad (topelt = kaks poolt, käepidemed keskel), ühepoolsel käepide hingede vastas
      const n = o.kind === 'door' ? (o.leaves ?? 1) : 0;
      const lw = n ? o.width / n : 0;
      const leaves = Array.from({ length: n }, (_, i) => {
        const lx = x + i * lw;
        const handleLeft = n === 2 ? i === 1 : o.hinge === 'end';
        return { x: lx, w: lw, hx: handleLeft ? lx + lw * 0.14 : lx + lw * 0.86 };
      });
      return { x, y: Y(o.sill + o.height), w: o.width, h: o.height, kind: o.kind, leaves };
    });
    const joints = w.joints.map((j) => ({ x: j.x, wall: j.wall ?? '' }));
    const splices = shapes.filter((s) => s.spliceEnd).map((s) => ({ x: s.rect.x1, y: Y(s.rect.y1), h: s.rect.y1 - s.rect.y0 }));

    const dims: Dim[] = [];
    const full = this.dimensions();
    const ops = [...w.openings].sort((a, b) => a.offset - b.offset);
    // all: avade kett (palgi otsast -> ava -> ... -> palgi otsani), siis kogupikkus
    let level = 2.2;
    if (full && ops.length) {
      const pts = [0, ...ops.flatMap((o) => [o.offset, o.offset + o.width]), w.length]
        .map((x) => Math.min(Math.max(x, 0), w.length))
        .sort((a, b) => a - b)
        .filter((x, i, arr) => i === 0 || x - arr[i - 1]! > 0.5);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        dims.push({ x1: a, y1: H, x2: b, y2: H, offset: fs * level, shift: b - a < fs * 2.6 ? (i === pts.length - 1 ? 'end' : 'start') : undefined });
      }
      level += 2;
    }
    dims.push({ x1: 0, y1: H, x2: w.length, y2: H, offset: fs * level });
    const bottom = level;

    let left = 0;
    if (full) {
      // vasakul kõrgused: sein (räästas / viilu alus) ja kogu kõrgus (hari)
      const lx = x0;
      dims.push({ x1: lx, y1: Y(0), x2: lx, y2: Y(eave), offset: -fs * 2.2 });
      if (H - eave > 1) {
        dims.push({ x1: lx, y1: Y(eave), x2: lx, y2: Y(H), offset: -fs * 2.2 });
        dims.push({ x1: lx, y1: Y(0), x2: lx, y2: Y(H), offset: -fs * 4.2 });
        left = 4.2;
      } else {
        left = 2.2;
      }
      // avad: kõrgus ava paremal serval (väljaspool ava), alumine serv põrandast
      for (const o of ops) {
        const xr = o.offset + o.width;
        dims.push({ x1: xr, y1: Y(o.sill), x2: xr, y2: Y(o.sill + o.height), offset: fs * 0.9 });
        if (o.sill > 1) dims.push({ x1: xr, y1: Y(0), x2: xr, y2: Y(o.sill), offset: fs * 0.9 });
      }
    }
    const padL = fs * (1.5 + left + (left ? 1.2 : 0));
    const padR = fs * 1.5;
    const padT = fs * 2;
    const padB = fs * (bottom + 2);
    return {
      viewBox: `${x0 - padL} ${-padT} ${x1 - x0 + padL + padR} ${H + padT + padB}`,
      rects,
      polys,
      openings,
      joints,
      splices,
      dims,
      H,
      fs,
    };
  });
}
