import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DEFAULT_CONSTANTS, DETAIL, endCutOf, extCut, wallPieces, type PieceDetail, type PlacedPiece, type WallSpec } from '@logcalc/calc-engine';
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
  /** palgitükid ja nende tähised mudelist (Wall3D.pieces/marks) – sama järjekord mis lõikenimekirjas */
  readonly pieces = input<PlacedPiece[] | null>(null);
  readonly marks = input<string[]>([]);
  /** esiletõstetud tähis (lõikenimekirjast); klõps palgil -> pick */
  readonly highlight = input<string | null>(null);
  readonly pick = output<string | null>();
  /** palgi paksus (nurgaliite sälgu laius); 0 = sälke ei joonistata */
  readonly thickness = input(0);
  /** räästa kaldlõige (Wall3D.roofCross) – ülemise palgi faasi joon */
  readonly cross = input<{ x0: number; x1: number; z0: number; k: number }[]>([]);
  /** pärlinite sälgud viilupalkides (Wall3D.notches) */
  readonly notches = input<{ pts: [number, number][] }[]>([]);
  /** tükkide detailid mootorist (Wall3D.details): otsalõiked, sälgud, ukse vajumisvaru */
  readonly details = input<PieceDetail[] | null>(null);

  protected readonly Math = Math;

  protected readonly view = computed(() => {
    const w = this.wall();
    const line = this.roofLine();
    const roofAt = line ? roofAtFn(line) : null;
    const pieces = this.pieces() ?? wallPieces(w, { maxLogLength: this.maxLogLength() });
    const marks = this.marks();
    const hl = this.highlight();
    const xs = pieces.flatMap((p) => [p.x0, p.x1]);
    const x0 = Math.min(0, ...xs);
    const x1 = Math.max(w.length, ...xs);

    // palgid: viilupalgid (ja muud katusest kõrgemad) katusejoone järgi hulknurgaks
    type Shape = { kind: string; poly: [number, number][] | null; rect: { x0: number; x1: number; y0: number; y1: number } };
    const dets = this.details();
    const shapes: (Shape & { piece: PlacedPiece; mark: string; det: PieceDetail | null })[] = [];
    pieces.forEach((p, i) => {
      const cut = line && roofAt && p.kind === 'gable' ? underRoof(p, line, roofAt) : null;
      if (cut === 'none') return;
      shapes.push({ kind: p.kind, poly: cut, rect: p, piece: p, mark: marks[i] ?? '', det: dets?.[i] ?? null });
    });
    // esiletõstmine: valitud tähis oranž, teised hallimad
    const cls = (s: { kind: string; mark: string }) => `log ${s.kind}${hl ? (s.mark === hl ? ' hi' : ' dim') : ''}`;
    const hiCount = hl ? shapes.filter((s) => s.mark === hl).length : 0;
    const top = (s: Shape) => (s.poly ? Math.max(...s.poly.map((q) => q[1])) : s.rect.y1);
    const H = Math.max(1, ...shapes.map(top));
    const eave = Math.max(0, ...shapes.filter((s) => s.kind !== 'gable').map((s) => s.rect.y1));
    const m = Math.max(x1 - x0, H);
    const fs = m * 0.035;
    const Y = (y: number) => H - y; // SVG y alla

    // palgi otsad (Revit Details): seina otsas nurgafaas ~12 mm (ridade vahel V), pikendatud ots ülevalt 65 püsti
    // + 45°, avade/jätkude kohal sirge – mootori detailidest (puudumisel samad reeglid siin)
    const outline = (s: (typeof shapes)[number]): [number, number][] => {
      const { x0: a, x1: b, y0, y1 } = s.rect;
      const c = Math.min(DETAIL.endChamfer, (y1 - y0) * 0.2);
      const d = extCut(y1 - y0);
      const L = s.det?.start ?? endCutOf(w, s.piece, true);
      const R = s.det?.end ?? endCutOf(w, s.piece, false);
      const left: [number, number][] = L === 'log' ? [[a + c, y1], [a, y1 - c], [a, y0 + c], [a + c, y0]] : L === 'ext' ? [[a, y1], [a, y0 + d], [a + d, y0]] : [[a, y1], [a, y0]];
      const right: [number, number][] = R === 'log' ? [[b - c, y0], [b, y0 + c], [b, y1 - c], [b - c, y1]] : R === 'ext' ? [[b - d, y0], [b, y0 + d], [b, y1]] : [[b, y0], [b, y1]];
      return [...left, ...right];
    };
    const pts = (p: [number, number][]) => p.map(([x, y]) => `${x},${Y(y)}`).join(' ');
    const rects: { x: number; y: number; w: number; h: number; cls: string; mark: string }[] = [];
    const polys = shapes.map((s) => ({ cls: cls(s), mark: s.mark, points: pts(s.poly ?? outline(s)) }));

    // sälgud (Revit): nurgaliide laius = palgi paksus, sügavus h/4 peal ja all (naaberpalkide sälgud = ruut rea
    // vahel); ukse kohal alt vajumisvaru 12 mm
    const t = this.thickness();
    const notchRects: { x: number; y: number; w: number; h: number }[] = [];
    const spans: [number, number, number, number][] = []; // x, w, y0, y1
    if (t > 0) {
      for (const s of shapes) {
        const { y0, y1 } = s.rect;
        const list = s.det?.notches ?? [];
        for (const n of list) spans.push(n.side === 'top' ? [n.x, n.w, y1 - n.depth, y1] : [n.x, n.w, y0, y0 + n.depth]);
      }
      // naaberpalkide pooled üheks (sama x ja laius, kõrgused kokku)
      spans.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
      for (let i = 0; i < spans.length; ) {
        const [x, wd, a] = spans[i]!;
        let b = spans[i]![3];
        let k = i + 1;
        while (k < spans.length && Math.abs(spans[k]![0] - x) < 0.5 && Math.abs(spans[k]![1] - wd) < 0.5 && spans[k]![2] <= b + 0.5) b = Math.max(b, spans[k++]![3]);
        notchRects.push({ x: x - wd / 2, y: Y(b), w: wd, h: b - a });
        i = k;
      }
    }
    // pärlinite sälgud
    const purlinNotches = this.notches().map((n) => pts(n.pts));
    // ülemise palgi kaldlõige: välispinna ülemine serv (katus toetub siseservale)
    const bevels: { x1: number; x2: number; y: number }[] = [];
    for (const r of this.cross()) {
      const zLow = r.z0 - (Math.abs(r.k) * (t || 0)) / 2;
      for (const s of shapes) {
        if (s.poly || s.rect.y1 <= zLow + 1 || s.rect.y0 >= zLow) continue;
        // kaldlõige kogu palgi pikkuses (ka varikatuse osa), kui palk on räästa lõigu kohal
        if (Math.min(s.rect.x1, r.x1) - Math.max(s.rect.x0, r.x0) > 1) bevels.push({ x1: s.rect.x0, x2: s.rect.x1, y: Y(zLow) });
      }
    }
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
    const splices = shapes.filter((s) => s.piece.spliceEnd).map((s) => ({ x: s.rect.x1, y: Y(s.rect.y1), h: s.rect.y1 - s.rect.y0 }));

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
      hiCount,
      notchRects,
      purlinNotches,
      bevels,
    };
  });

  /** klõps palgil: selle tähis (sama uuesti = tühista) */
  protected onPick(mark: string): void {
    if (!mark) return;
    this.pick.emit(this.highlight() === mark ? null : mark);
  }
}
