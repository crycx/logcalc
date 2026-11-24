import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DEFAULT_CONSTANTS, wallPieces, type WallSpec } from '@logcalc/calc-engine';
import { DimLines, type Dim } from '../dim-lines/dim-lines';

/**
 * Ühe seina vaade mudelist: palgitükid oma kohal (pool palki, viilupalgid), avad, lahtised osad,
 * liidete teljed ja pikkade palkide jätkukohad. Seina x kulgeb sõlmest a sõlme b poole.
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

  protected readonly view = computed(() => {
    const w = this.wall();
    const pieces = wallPieces(w, { maxLogLength: this.maxLogLength() });
    const xs = pieces.flatMap((p) => [p.x0, p.x1]);
    const x0 = Math.min(0, ...xs);
    const x1 = Math.max(w.length, ...xs);
    const H = Math.max(1, ...pieces.map((p) => p.y1));
    const m = Math.max(x1 - x0, H);
    const fs = m * 0.035;
    const pad = fs * 1.5;
    const Y = (y: number) => H - y; // SVG y alla
    const rects = pieces.map((p) => ({
      x: p.x0,
      y: Y(p.y1),
      w: p.x1 - p.x0,
      h: p.y1 - p.y0,
      kind: p.kind,
      notches: p.notches,
      spliceStart: p.spliceStart,
      spliceEnd: p.spliceEnd,
    }));
    const openings = w.openings.map((o) => ({ x: o.offset, y: Y(o.sill + o.height), w: o.width, h: o.height, kind: o.kind }));
    const joints = w.joints.map((j) => ({ x: j.x, wall: j.wall ?? '' }));
    const splices = rects.filter((r) => r.spliceEnd).map((r) => ({ x: r.x + r.w, y: r.y, h: r.h }));
    const dims: Dim[] = [{ x1: 0, y1: H, x2: w.length, y2: H, offset: fs * 2.2 }];
    return {
      viewBox: `${x0 - pad} ${-pad - fs * 1.4} ${x1 - x0 + 2 * pad} ${H + 2 * pad + fs * 4}`,
      rects,
      openings,
      joints,
      splices,
      dims,
      H,
      fs,
      labelY: -fs * 0.5,
    };
  });
}
