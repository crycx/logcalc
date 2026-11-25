import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DETAIL, extCut, type CalcResult, type EndCut, type HouseModel3D, type PieceDetail, type PlacedPiece, type Wall3D } from '@logcalc/calc-engine';
import { logProfile } from '../../helpers/log-profile';
import { roofAtFn, underRoof } from '../../helpers/roof-cut';
import { DimLines, type Dim } from '../dim-lines/dim-lines';

/** Ühe detaili joonis (Revit „Details“): vaade küljelt mõõtudega + ristlõige */
interface Card {
  mark: string;
  sub: string;
  view: {
    viewBox: string;
    outline: string;
    notches: { x: number; y: number; w: number; h: number }[];
    slots: string[];
    dims: Dim[];
    fs: number;
    notes: { x: number; y: number; text: string }[];
  };
  prof: { viewBox: string; points: string; dims: Dim[]; fs: number };
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
  imports: [DimLines],
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
  const notches = (det?.notches ?? []).map((n) => {
    const x = X(n.x) - n.w / 2;
    return n.side === 'top' ? { x, y: Y(h), w: n.w, h: n.depth } : { x, y: Y(n.depth), w: n.w, h: n.depth };
  });
  const slots = (det?.slots ?? []).map((s) => pts(s.map(([x, z]) => [X(x), Y(z - p.y0)] as [number, number])));
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
  const notches = det.notches.map((n) => ({ x: n.x - n.w / 2, y: Y(n.depth), w: n.w, h: n.depth }));
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
