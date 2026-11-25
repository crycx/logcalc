import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DETAIL, extCut, type CalcResult, type EndCut, type HouseModel3D, type PieceDetail, type PlacedPiece, type Wall3D } from '@logcalc/calc-engine';
import { logProfile } from '../../helpers/log-profile';
import { roofAtFn, underRoof } from '../../helpers/roof-cut';
import { PieceInfo } from '../piece-info/piece-info';
import { DimLines, type Dim } from '../dim-lines/dim-lines';

/** Ühe detaili joonis (Revit „Details“): vaade küljelt mõõtudega + ristlõige */
interface Card {
  mark: string;
  sub: string;
  view: {
    viewBox: string;
    outline: string;
    /** mitu kontuuri (viilu koostejoonis) */
    polys?: string[];
    /** sälgud: valge täidis (fill, veidi üle serva) + lahtine U-kontuur (line) */
    notches: { fill: string; line: string }[];
    slots: { fill: string; line: string }[];
    dims: Dim[];
    fs: number;
    notes: { x: number; y: number; text: string }[];
  };
  prof: { viewBox: string; points: string; dims: Dim[]; fs: number } | null;
  /** viilu koostejoonis: read (ülevalt) ja tähised kõigilt sama kujuga viiludelt */
  rows?: string[];
}

interface Group {
  title: string;
  cards: Card[];
}

type Member = HouseModel3D['members'][number];

const WALL_NAMES: Record<string, string> = { '1': 'esisein', '2': 'tagasein', A: 'külgsein', B: 'külgsein' };

/**
 * Detailijoonised (Revit „Details“, Kolding 40 _D_ PDF): iga tähise kohta üks joonis – kontuur otsalõigetega, nurgaliite
 * sälgud peal ja all, pärlinite pilud, ukse kohal vajumisvaru, mõõdukett (otsast sälkudeni, sälkude vahed, kogupikkus)
 * ja ristlõige. Pärlinid: alt sälgud viiluseinte kohal, otsalõiked, harja terav tipp.
 */
@Component({
  selector: 'app-piece-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DimLines, PieceInfo],
  templateUrl: './piece-details.html',
  styleUrl: './piece-details.scss',
})
export class PieceDetails {
  readonly model = input.required<HouseModel3D>();
  readonly result = input.required<CalcResult>();
  readonly highlight = input<string | null>(null);
  readonly pick = output<string | null>();

  protected readonly groups = computed((): Group[] => {
    const m = this.model();
    const r = this.result();
    const groups: Group[] = [];
    // viilud (Revit Details 1): sama kujuga viilud kokku, read ülevalt
    const gables = new Map<string, { w: Wall3D; idx: number[]; walls: { w: Wall3D; idx: number[] }[] }>();
    for (const w of m.walls) {
      const idx = w.pieces.map((p, i) => (p.kind === 'gable' ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) continue;
      const key = idx.map((i) => Math.round(w.pieces[i]!.x1 - w.pieces[i]!.x0)).join(',') + '|' + w.notches.length;
      const g = gables.get(key);
      if (g) g.walls.push({ w, idx });
      else gables.set(key, { w, idx, walls: [{ w, idx }] });
    }
    const gCards = [...gables.values()].map((g) => gableCard(g.w, g.idx, g.walls));
    if (gCards.length) groups.push({ title: 'Viilud (koostejoonis)', cards: gCards });
    for (const cl of r.cutList) {
      const w = m.walls.find((x) => x.id === cl.wall);
      if (!w) continue;
      const cards: Card[] = [];
      for (const cp of cl.pieces) {
        const i = w.marks.indexOf(cp.mark);
        if (i < 0) continue;
        cards.push(wallCard(w, w.pieces[i]!, w.details[i] ?? null, cp.mark, `${cp.profile} · ${cp.count} tk · ${Math.round(cp.length)} mm`));
      }
      groups.push({ title: `Sein ${cl.wall}${WALL_NAMES[cl.wall] ? ' · ' + WALL_NAMES[cl.wall] : ''}`, cards });
    }
    // pärlinid ja hari
    const pr = r.materials.find((g) => g.key === 'parlinid');
    if (pr) {
      const cards: Card[] = [];
      for (const row of pr.rows) {
        const same = m.members.filter((x) => x.key === 'parlinid' && x.mark === row.mark && x.detail);
        const plain = same.find((x) => !x.detail!.pointedSide);
        const ridge = same.find((x) => x.detail!.pointedSide);
        const nPlain = same.filter((x) => !x.detail!.pointedSide).length;
        if (plain) cards.push(purlinCard(row.mark, plain, `${Math.round(plain.size[1])}x${Math.round(plain.size[2])} · ${nPlain} tk · ${row.length} mm`));
        if (ridge) cards.push(purlinCard(`${row.mark} hari`, ridge, `${Math.round(ridge.size[1])}x${Math.round(ridge.size[2])} terav tipp · 1 tk · ${row.length} mm`));
      }
      if (cards.length) groups.push({ title: 'Pärlinid ja hari', cards });
    }
    return groups;
  });

  protected isSel(mark: string): boolean {
    return this.highlight() === mark.replace(/ hari$/, '');
  }

  protected toggle(mark: string): void {
    const base = mark.replace(/ hari$/, '');
    this.pick.emit(this.highlight() === base ? null : base);
  }
}

/**
 * Viilu koostejoonis (Revit Kolding Details 1): viilupalgid oma kohal, pärlinite pilud, liidete sälgud; mõõdud piki
 * kallet (nurgast pilu servani, pilu, harjani), all liidete kett, katuse nurk; read ülevalt kõigi sama viilu tähistega.
 */
function gableCard(w: Wall3D, idx: number[], walls: { w: Wall3D; idx: number[] }[]): Card {
  const line = w.roofLine;
  const roofAt = line ? roofAtFn(line) : () => Infinity;
  const parts = idx.map((i) => {
    const p = w.pieces[i]!;
    const cut = line ? underRoof(p, line, roofAt) : null;
    return { p, det: w.details[i] ?? null, poly: cut && cut !== 'none' ? cut : ([[p.x0, p.y0], [p.x1, p.y0], [p.x1, p.y1], [p.x0, p.y1]] as [number, number][]) };
  });
  const xs = parts.flatMap((q) => q.poly.map((v) => v[0]));
  const zs = parts.flatMap((q) => q.poly.map((v) => v[1]));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const zTop = Math.max(...zs);
  const X = (x: number) => x - x0;
  const Y = (z: number) => zTop - z;
  const L = x1 - x0;
  const fs = Math.max(L, 600) * 0.022;
  const outline = parts.map((q) => pts(q.poly.map(([x, z]) => [X(x), Y(z)] as [number, number])));
  const notches = parts.flatMap((q) =>
    (q.det?.notches ?? []).filter((n) => n.side === 'bottom').map((n) => uNotch(X(n.x) - n.w / 2, n.w, Y(q.p.y0), -n.depth, fs)),
  );
  const slots = w.notches.map((n) => slotShape(n.pts.map(([x, z]) => [X(x), Y(z)] as [number, number]), fs));
  const dims: Dim[] = [];
  // all: alumise viilurea liidete kett
  const bottom = parts.reduce((a, b) => (b.p.y0 < a.p.y0 ? b : a));
  const corner = (bottom.det?.notches ?? []).filter((n) => n.kind === 'corner');
  dims.push(...chain([X(bottom.p.x0), X(bottom.p.x1), ...corner.flatMap((n) => [X(n.x) - n.w / 2, X(n.x) + n.w / 2])], Y(z0), fs * 1.8, fs));
  // piki kallet: nurk -> pilude servad -> hari (mõlemal poolel), mõõtjoon katuse kohal
  const apexX = line ? line.reduce((a, b) => (b[1] > a[1] ? b : a))[0] : (x0 + x1) / 2;
  const edges = w.notches.flatMap((n) => {
    const top = [...n.pts].sort((a, b) => b[1] - a[1]).slice(0, 2);
    return top.map((v) => v[0]);
  });
  const left = [bottom.p.x0, ...edges.filter((x) => x < apexX), apexX].sort((a, b) => a - b);
  const right = [apexX, ...edges.filter((x) => x > apexX), bottom.p.x1].sort((a, b) => a - b);
  for (const side of [left, right]) {
    for (let i = 1; i < side.length; i++) {
      const a = side[i - 1]!;
      const b = side[i]!;
      if (b - a < 1) continue;
      dims.push({ x1: X(a), y1: Y(Math.min(roofAt(a), zTop)), x2: X(b), y2: Y(Math.min(roofAt(b), zTop)), offset: -fs * 1.6 });
    }
  }
  // katuse nurk
  const notes: Card['view']['notes'] = [];
  if (line && line.length > 1) {
    const xa = bottom.p.x0 + 200;
    const k = (roofAt(xa + 100) - roofAt(xa)) / 100;
    notes.push({ x: X(bottom.p.x0) + fs * 4, y: Y(z0) - fs * 0.6, text: `${Math.round((Math.atan(Math.abs(k)) * 180) / Math.PI)}°` });
  }
  // read ülevalt: tähised kõigilt sama kujuga viiludelt
  const rowYs = [...new Set(parts.map((q) => Math.round(q.p.y0)))].sort((a, b) => b - a);
  const rows = rowYs.map((y) =>
    walls
      .map(({ w: ww, idx: ii }) => ii.filter((i) => Math.round(ww.pieces[i]!.y0) === y).map((i) => ww.marks[i]).join(' + '))
      .filter(Boolean)
      .join(' / '),
  );
  const viewBox = `${-fs * 3} ${-fs * 4} ${L + fs * 6} ${zTop - z0 + fs * 8}`;
  return {
    mark: `viil-${walls.map((x) => x.w.id).join('-')}`,
    sub: `seinad ${walls.map((x) => x.w.id).join(', ')} · ${parts.length} palki`,
    view: { viewBox, outline: '', polys: outline, notches, slots, dims, fs, notes },
    prof: null,
    rows,
  };
}

/**
 * Sälk servas (SVG): x, laius w, serva y; d > 0 = sälk alla (ülaserv), d < 0 = üles (alaserv). Täidis ulatub veidi
 * üle serva (katab palgi kontuuri), kontuur lahtine U – välisservale joont pole.
 */
function uNotch(x: number, w: number, y: number, d: number, fs: number): { fill: string; line: string } {
  const e = fs * 0.06 * Math.sign(d);
  const inner = y + d;
  return {
    fill: pts([[x, y - e], [x + w, y - e], [x + w, inner], [x, inner]]),
    line: pts([[x, y], [x, inner], [x + w, inner], [x + w, y]]),
  };
}

/** Pilu (pärlin) viilupalgis: 4 nurka [all, all, üleval, üleval] – ülemine serv (katusejoon) lahtine */
function slotShape(q: [number, number][], fs: number): { fill: string; line: string } {
  const [a, b, c, d] = q as [[number, number], [number, number], [number, number], [number, number]];
  // täidis veidi üle katusejoone
  const up = (p: [number, number], from: [number, number]): [number, number] => {
    const dx = p[0] - from[0];
    const dy = p[1] - from[1];
    const l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / l) * fs * 0.06, p[1] + (dy / l) * fs * 0.06];
  };
  return { fill: pts([a, b, up(c, b), up(d, a)]), line: pts([d, a, b, c]) };
}

const pts = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** Otsalõigetega kontuur (detaili koordinaadid: x 0…L, z 0…h) */
function outline(L: number, h: number, start: EndCut, end: EndCut): [number, number][] {
  const c = Math.min(DETAIL.endChamfer, h * 0.2);
  const d = extCut(h);
  const left: [number, number][] = start === 'log' ? [[c, h], [0, h - c], [0, c], [c, 0]] : start === 'ext' ? [[0, h], [0, d], [d, 0]] : [[0, h], [0, 0]];
  const right: [number, number][] = end === 'log' ? [[L - c, 0], [L, c], [L, h - c], [L - c, h]] : end === 'ext' ? [[L - d, 0], [L, d], [L, h]] : [[L, 0], [L, h]];
  return [...left, ...right];
}

/** Mõõdukett x-punktide vahel kõrgusel y (SVG), nihe off */
function chain(xs: number[], y: number, off: number, fs: number): Dim[] {
  const v = [...new Set(xs.map((x) => Math.round(x * 10) / 10))].sort((a, b) => a - b);
  const len = v.slice(1).map((b, i) => b - v[i]!);
  return v.slice(1).map((b, i) => {
    const a = v[i]!;
    // lühike lõik: tekst välja pikema naabri poole (esimene vasakule, viimane paremale)
    const left = i > 0 ? len[i - 1]! : Infinity;
    const right = i < len.length - 1 ? len[i + 1]! : Infinity;
    const shift: Dim['shift'] = b - a < fs * 2.4 ? (left >= right ? 'start' : 'end') : undefined;
    return { x1: a, y1: y, x2: b, y2: y, offset: off, shift };
  });
}

function wallCard(w: Wall3D, p: PlacedPiece, det: PieceDetail | null, mark: string, sub: string): Card {
  const L = p.x1 - p.x0;
  const h = p.y1 - p.y0;
  const t = w.thickness;
  const X = (x: number) => x - p.x0;
  // kontuur: viilupalk katusejoone järgi, muidu otsalõigetega
  let shape: [number, number][];
  const line = w.roofLine;
  const cut = p.kind === 'gable' && line ? underRoof(p, line, roofAtFn(line)) : null;
  if (cut && cut !== 'none') shape = cut.map(([x, z]) => [X(x), z - p.y0] as [number, number]);
  else shape = outline(L, h, det?.start ?? 'plain', det?.end ?? 'plain');
  const zTop = Math.max(h, ...shape.map((q) => q[1]));
  const Y = (z: number) => zTop - z;
  const fs = Math.max(L, 600) * 0.022;
  const notches = (det?.notches ?? []).map((n) => uNotch(X(n.x) - n.w / 2, n.w, n.side === 'top' ? Y(h) : Y(0), n.side === 'top' ? n.depth : -n.depth, fs));
  const slots = (det?.slots ?? []).map((s) => slotShape(s.map(([x, z]) => [X(x), Y(z - p.y0)] as [number, number]), fs));
  // mõõdud: all nurgaliite sälgud, üleval ukse vajumisvaru, kogupikkus
  const corner = (det?.notches ?? []).filter((n) => n.kind === 'corner');
  const door = (det?.notches ?? []).filter((n) => n.kind === 'door');
  const dims: Dim[] = [];
  const below = chain([0, L, ...corner.flatMap((n) => [X(n.x) - n.w / 2, X(n.x) + n.w / 2])], Y(0), fs * 1.8, fs);
  dims.push(...below);
  dims.push({ x1: 0, y1: Y(0), x2: L, y2: Y(0), offset: fs * (below.length > 1 ? 3.8 : 1.8) });
  if (door.length) dims.push(...chain([0, L, ...door.flatMap((n) => [X(n.x) - n.w / 2, X(n.x) + n.w / 2])], Y(zTop), -fs * 1.8, fs));
  const notes: Card['view']['notes'] = [];
  for (const n of door) notes.push({ x: X(n.x), y: Y(0) - fs * 0.4, text: `sisselõige ${n.depth} mm` });
  for (const [e, x] of [[det?.start, 0], [det?.end, L]] as const) {
    if (e === 'ext') notes.push({ x: x === 0 ? fs * 2.5 : L - fs * 2.5, y: Y(zTop) - fs * 0.5, text: `45° · ${DETAIL.extVertical}` });
  }
  const bottomRows = below.length > 1 ? 5 : 3;
  const top = door.length ? 4 : 2;
  const viewBox = `${-fs * 2} ${-fs * top} ${L + fs * 4} ${zTop + fs * (bottomRows + top)}`;

  // ristlõige: profiil (kaldlõikega TL räästa lõigus)
  const rc = p.kind === 'gable' ? undefined : w.roofCross.find((s) => Math.min(p.x1, s.x1) - Math.max(p.x0, s.x0) > 1);
  const bevel = !!rc && p.y1 > Math.min(rc.z0 - rc.k * (t / 2), rc.z0 + rc.k * (t / 2)) + 0.5;
  const zs = (s: number) => (rc ? Math.max(p.y0, Math.min(p.y1, rc.z0 + rc.k * s)) - p.y0 : h);
  const ring = logProfile(t, 0, h, bevel ? { grooves: true, tongues: false, top: (a) => zs(-a) } : { grooves: p.kind !== 'half', tongues: p.kind !== 'gable' });
  return { mark, sub, view: { viewBox, outline: pts(shape.map(([x, z]) => [x, Y(z)] as [number, number])), notches, slots, dims, fs, notes }, prof: profile(ring, t, bevel ? [zs(t / 2), zs(-t / 2)] : null, h) };
}

/** Ristlõike joonis: laius all, kõrgus(ed) küljel (kaldlõikel mõlemad) */
function profile(ring: [number, number][], wd: number, sides: [number, number] | null, nominal: number): Card['prof'] {
  const ph = Math.max(...ring.map((q) => q[1]));
  const pfs = Math.max(ph, 100) * 0.12;
  const PY = (z: number) => ph - z;
  // nimikõrgus (punnid ei loe – Revit 40x114)
  const left = sides ? sides[0] : nominal;
  const dims: Dim[] = [
    { x1: -wd / 2, y1: PY(0), x2: wd / 2, y2: PY(0), offset: pfs * 1.4 },
    // üles mõõdetaval vertikaalil negatiivne nihe = vasakule
    { x1: -wd / 2, y1: PY(0), x2: -wd / 2, y2: PY(left), offset: -pfs * 1.4 },
  ];
  if (sides) dims.push({ x1: wd / 2, y1: PY(0), x2: wd / 2, y2: PY(sides[1]), offset: pfs * 1.4 });
  return {
    viewBox: `${-wd / 2 - pfs * 3.2} ${-pfs * 1.2} ${wd + pfs * (sides ? 6.4 : 4.6)} ${ph + pfs * 3.6}`,
    points: pts(ring.map(([a, z]) => [a, PY(z)] as [number, number])),
    dims,
    fs: pfs,
  };
}

function purlinCard(mark: string, mb: Member, sub: string): Card {
  const det = mb.detail!;
  const [L, wd, h] = mb.size;
  const fs = Math.max(L, 600) * 0.022;
  const d = det.cut;
  const shape: [number, number][] = d > 0 ? [[0, h], [0, d], [d, 0], [L - d, 0], [L, d], [L, h]] : [[0, h], [0, 0], [L, 0], [L, h]];
  const Y = (z: number) => h - z;
  const notches = det.notches.map((n) => uNotch(n.x - n.w / 2, n.w, Y(0), -n.depth, fs));
  const below = chain([0, L, ...det.notches.flatMap((n) => [n.x - n.w / 2, n.x + n.w / 2])], Y(0), fs * 1.8, fs);
  const dims: Dim[] = [...below, { x1: 0, y1: Y(0), x2: L, y2: Y(0), offset: fs * 3.8 }];
  const n0 = det.notches[0];
  if (n0) dims.push({ x1: n0.x + n0.w / 2, y1: Y(0), x2: n0.x + n0.w / 2, y2: Y(n0.depth), offset: fs * 1.2 });
  const notes = d > 0 ? [{ x: fs * 2.5, y: Y(h) - fs * 0.5, text: `45° · ${DETAIL.extVertical}` }] : [];
  const viewBox = `${-fs * 2} ${-fs * 2} ${L + fs * 4} ${h + fs * 7}`;
  const side = det.pointedSide;
  const ring: [number, number][] = side ? [[-wd / 2, 0], [wd / 2, 0], [wd / 2, side], [0, h], [-wd / 2, side]] : [[-wd / 2, 0], [wd / 2, 0], [wd / 2, h], [-wd / 2, h]];
  return {
    mark,
    sub,
    view: { viewBox, outline: pts(shape.map(([x, z]) => [x, Y(z)] as [number, number])), notches, slots: [], dims, fs, notes },
    prof: profile(ring, wd, side ? [side, h] : null, h),
  };
}
