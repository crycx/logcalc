import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  DEFAULT_CONSTANTS,
  PLAN_TEMPLATES,
  addWall,
  deleteWall,
  moveWall,
  planBounds,
  planGeometry,
  planTemplate,
  renumberWalls,
  reverseWall,
  roofVolumes,
  setWallSpan,
  updateWall,
  wallLine,
  type HousePlan,
  type OpenSection,
  type PlacedOpening,
  type PlanTemplateKind,
  type PlanWall,
  type Railing,
  type WallGeometry,
  type WallSpec,
} from '@logcalc/calc-engine';
import { confirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog';
import { DimLines, type Dim } from '../dim-lines/dim-lines';
import { WallView } from '../wall-view/wall-view';

interface Pt {
  x: number;
  y: number;
}

type Tool = 'select' | 'wall';
type WallType = 'full' | 'top' | 'height';

const C = DEFAULT_CONSTANTS;
const GRID = 10; // mm

/**
 * Põhiplaani editor (WALL-GRAPH.md, etapp 3): seinad graafina plaanil.
 * - „Vali“: seina valimine ja lohistamine risti oma suunaga (ühendatud seinad pikenevad).
 * - „Sein“: joonista klõpsuga algus ja lõpp (täisnurk, haaramine sõlmedele/seintele, 10 mm samm);
 *   jätkab viimasest punktist, Esc lõpetab.
 * - Paneel: valitud seina täpsed mõõdud ja ehitus (ainult ülemised read, kõrgus, viil, lahtised osad, piirded).
 */
@Component({
  selector: 'app-plan-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    DimLines,
    WallView,
    MatButtonModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './plan-editor.html',
  styleUrl: './plan-editor.scss',
  host: { '(keydown)': 'onKey($event)', tabindex: '0' },
})
export class PlanEditor {
  private readonly dialog = inject(MatDialog);

  readonly plan = input<HousePlan | null>(null);
  readonly planChange = output<HousePlan | null>();
  /** seinte tähised muutusid (vana -> uus); uksed/aknad viitavad tähisele */
  readonly renamed = output<Record<string, string>>();
  /** lisa valitud seinale uks või aken (vanem lisab rea uste/akende loetellu) */
  readonly addOpening = output<{ kind: 'door' | 'window'; wall: string }>();
  readonly thickness = input.required<number>();
  /** palgi pikkused malli jaoks (praegused mõõdud) */
  readonly size = input.required<{ width: number; depth: number }>();
  /** seinamudel (valitud seina vaade) */
  readonly walls = input<WallSpec[]>([]);
  readonly openings = input<PlacedOpening[]>([]);
  readonly readonly = input(false);
  /** ainult plaan (ülevaatejoonis): ilma tööriistade ja paneelita */
  readonly compact = input(false);

  protected readonly templates = PLAN_TEMPLATES;
  protected readonly tool = signal<Tool>('select');
  protected readonly selected = signal<string | null>(null);
  protected readonly draft = signal<{ from: Pt; to: Pt } | null>(null);
  protected readonly message = signal('');
  /** lohistamise ajal näidatav plaan */
  private readonly live = signal<HousePlan | null>(null);
  private past: HousePlan[] = [];
  private future: (HousePlan | null)[] = [];
  protected readonly canUndo = signal(false);
  protected readonly canRedo = signal(false);
  private drag: { id: string; dir: 'x' | 'y'; start: Pt; base: HousePlan; moved: boolean } | null = null;

  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('svg');

  protected readonly current = computed(() => this.live() ?? this.plan());
  protected readonly draftLen = computed(() => {
    const d = this.draft();
    return d ? Math.abs(d.to.x - d.from.x) + Math.abs(d.to.y - d.from.y) : 0;
  });

  protected readonly geo = computed((): { walls: WallGeometry[]; error: string } => {
    const p = this.current();
    if (!p || !p.walls.length) return { walls: [], error: '' };
    try {
      return { walls: planGeometry(p, this.thickness(), C), error: '' };
    } catch (e) {
      return { walls: [], error: e instanceof Error ? e.message : 'Vigane plaan.' };
    }
  });

  protected readonly view = computed(() => {
    const p = this.current();
    const geo = this.geo().walls;
    const t = Math.max(this.thickness(), 1);
    const pts = p?.nodes ?? [];
    const b = geo.length
      ? planBounds(geo)
      : pts.length
        ? { x0: Math.min(...pts.map((n) => n.x)), y0: Math.min(...pts.map((n) => n.y)), x1: Math.max(...pts.map((n) => n.x)), y1: Math.max(...pts.map((n) => n.y)) }
        : { x0: 0, y0: 0, x1: this.size().width, y1: this.size().depth };
    const W = Math.max(b.x1 - b.x0, 1000);
    const D = Math.max(b.y1 - b.y0, 1000);
    const m = Math.max(W, D);
    const fs = m * 0.03;
    const pad = m * 0.17;
    const tv = Math.max(t, m * 0.012); // nähtav paksus
    const sel = this.selected();
    const walls = geo.map((g) => {
      const ux = (g.b.x - g.a.x) / g.span;
      const uy = (g.b.y - g.a.y) / g.span;
      const s = { x: g.a.x - ux * g.startExt, y: g.a.y - uy * g.startExt };
      const e = { x: g.b.x + ux * g.endExt, y: g.b.y + uy * g.endExt };
      const pw = p!.walls.find((w) => w.id === g.id)!;
      const at = (x: number) => ({ x: s.x + ux * x, y: s.y + uy * x });
      const seg = (x0: number, x1: number) => {
        const p0 = at(Math.max(0, x0));
        const p1 = at(Math.min(g.length, x1));
        return g.dir === 'x'
          ? { x: Math.min(p0.x, p1.x), y: g.a.y - tv / 2, w: Math.abs(p1.x - p0.x), h: tv }
          : { x: g.a.x - tv / 2, y: Math.min(p0.y, p1.y), w: tv, h: Math.abs(p1.y - p0.y) };
      };
      const mid = at(g.length / 2);
      const label = g.dir === 'x' ? { x: mid.x, y: mid.y - tv / 2 - fs * 0.6 } : { x: mid.x - tv / 2 - fs * 0.6, y: mid.y + fs * 0.35 };
      return {
        id: g.id,
        dir: g.dir,
        rect: seg(0, g.length),
        hit: { x1: s.x, y1: s.y, x2: e.x, y2: e.y },
        open: (pw.open ?? []).map((o) => seg(o.x0, o.x1)),
        railings: (pw.railings ?? []).map((r) => seg(r.x0, r.x1)),
        openings: this.openings()
          .filter((o) => o.wall === g.id)
          .map((o) => ({ ...seg(o.offset, o.offset + o.width), kind: o.kind })),
        partial: pw.topOnly !== undefined || pw.height !== undefined,
        label,
        anchor: g.dir === 'x' ? 'middle' : 'end',
        selected: g.id === sel,
        length: g.length,
      };
    });
    // mõõdukett: seinte kesktelgede vahed (kõik sõlmed projitseeritud alumisele ja paremale servale), väljas üldmõõt
    const uniq = (v: number[]) => [...new Set(v.map((x) => Math.round(x)))].sort((a, c) => a - c);
    const used = new Set(geo.flatMap((g) => [`${g.a.x},${g.a.y}`, `${g.b.x},${g.b.y}`]));
    const usedPts = pts.filter((n) => used.has(`${n.x},${n.y}`));
    const xs = uniq(usedPts.map((n) => n.x));
    const ys = uniq(usedPts.map((n) => n.y));
    const chain = (v: number[], dir: 'x' | 'y'): Dim[] =>
      v.slice(1).map((c, i) => {
        const a = v[i]!;
        const shift: Dim['shift'] = c - a < fs * 2.6 ? (i === v.length - 2 ? 'end' : 'start') : undefined;
        return dir === 'x'
          ? { x1: a, y1: b.y1, x2: c, y2: b.y1, offset: fs * 1.9, shift }
          : { x1: b.x1, y1: c, x2: b.x1, y2: a, offset: fs * 1.9, shift };
      });
    const cx = xs.length > 2 ? chain(xs, 'x') : [];
    const cy = ys.length > 2 ? chain(ys, 'y') : [];
    const dims: Dim[] = [
      ...cx,
      ...cy,
      { x1: b.x0, y1: b.y1, x2: b.x1, y2: b.y1, offset: fs * (cx.length ? 3.6 : 2.2) },
      { x1: b.x1, y1: b.y1, x2: b.x1, y2: b.y0, offset: fs * (cy.length ? 3.6 : 2.2) },
    ];
    const sw = sel ? geo.find((g) => g.id === sel) : undefined;
    if (sw) {
      // valitud seina kesktelgede vahe
      const o = fs * 1.4;
      dims.push(
        sw.dir === 'x'
          ? { x1: Math.min(sw.a.x, sw.b.x), y1: sw.a.y, x2: Math.max(sw.a.x, sw.b.x), y2: sw.a.y, offset: -o }
          : { x1: sw.a.x, y1: Math.max(sw.a.y, sw.b.y), x2: sw.a.x, y2: Math.min(sw.a.y, sw.b.y), offset: o },
      );
    }
    // katuse harjad (katusemahud plaanist)
    let ridges: { x1: number; y1: number; x2: number; y2: number }[] = [];
    if (p && geo.length) {
      try {
        ridges = roofVolumes(p, geo).map((r) =>
          r.ridge === 'y'
            ? { x1: (r.x0 + r.x1) / 2, y1: r.y0, x2: (r.x0 + r.x1) / 2, y2: r.y1 }
            : { x1: r.x0, y1: (r.y0 + r.y1) / 2, x2: r.x1, y2: (r.y0 + r.y1) / 2 },
        );
      } catch {
        ridges = [];
      }
    }
    return {
      viewBox: `${b.x0 - pad} ${b.y0 - pad} ${W + 2 * pad} ${D + 2 * pad}`,
      ridges,
      walls,
      nodes: pts,
      dims,
      fs,
      nodeR: fs * 0.22,
      t: tv,
    };
  });

  /** valitud sein: plaanist, geomeetriast ja mudelist */
  protected readonly sel = computed(() => {
    const id = this.selected();
    const p = this.plan();
    if (!id || !p) return null;
    const w = p.walls.find((x) => x.id === id);
    const g = this.geo().walls.find((x) => x.id === id);
    if (!w || !g) return null;
    const l = wallLine(p, id);
    const lines = p.walls.map((x) => wallLine(p, x.id)).filter((x) => x.dir === l.dir);
    const base = Math.min(...lines.map((x) => x.at));
    const type: WallType = w.height !== undefined ? 'height' : w.topOnly !== undefined ? 'top' : 'full';
    return {
      w,
      g,
      span: l.to - l.from,
      position: l.at - base,
      type,
      gable: w.gable === undefined ? 'auto' : w.gable ? 'yes' : 'no',
      model: this.walls().find((x) => x.id === id) ?? null,
    };
  });

  // ------------------------------------------------------------ ajalugu
  private commit(next: HousePlan | null, msg = ''): void {
    const cur = this.plan();
    if (cur) this.past.push(cur);
    else this.past.push({ nodes: [], walls: [] });
    if (this.past.length > 100) this.past.shift();
    this.future = [];
    this.sync();
    this.message.set(msg);
    this.planChange.emit(next);
  }

  private sync(): void {
    this.canUndo.set(this.past.length > 0);
    this.canRedo.set(this.future.length > 0);
  }

  protected undo(): void {
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push(this.plan());
    this.sync();
    this.planChange.emit(prev.walls.length || prev.nodes.length ? prev : null);
  }

  protected redo(): void {
    if (!this.future.length) return;
    const next = this.future.pop()!;
    const cur = this.plan();
    if (cur) this.past.push(cur);
    this.sync();
    this.planChange.emit(next);
  }

  /**
   * Muuda plaani; vea korral sõnum, plaan jääb samaks.
   * structural: seinte asend/arv muutus -> automaatne nummerdus (kui pole käsitsi välja lülitatud).
   * Tagastab vana -> uus tähiste kaardi (või null vea korral).
   */
  private apply(fn: (p: HousePlan) => HousePlan, msg = '', structural = false): Record<string, string> | null {
    const p = this.plan();
    if (!p) return null;
    try {
      let next = fn(p);
      planGeometry(next, this.thickness(), C); // kontroll
      let map: Record<string, string> = {};
      if (structural && next.autoIds !== false) {
        const r = renumberWalls(next);
        next = r.plan;
        map = r.map;
      }
      const changed = Object.fromEntries(Object.entries(map).filter(([a, b]) => a !== b));
      const sel = this.selected();
      if (sel && changed[sel]) this.selected.set(changed[sel]!);
      this.commit(next, msg);
      if (Object.keys(changed).length) this.renamed.emit(changed);
      return map;
    } catch (e) {
      this.message.set(e instanceof Error ? e.message : 'Ei saanud muuta.');
      return null;
    }
  }

  /** Automaatne nummerdus uuesti sisse (numbrid eest taha, tähed vasakult paremale) */
  protected renumber(): void {
    this.apply(
      (p) => {
        const next = { ...p };
        delete next.autoIds;
        return next;
      },
      'Seinad nummerdatud: numbrid eest taha, tähed vasakult paremale.',
      true,
    );
  }

  protected setRidge(v: 'x' | 'y'): void {
    this.apply((p) => ({ ...p, ridge: v === 'y' ? undefined : v }));
  }

  /** Uks/aken valitud seinale */
  protected addOpeningHere(kind: 'door' | 'window'): void {
    const id = this.selected();
    if (!id) return;
    this.addOpening.emit({ kind, wall: id });
    this.message.set(`${kind === 'door' ? 'Uks' : 'Aken'} lisatud seinale ${id} – mõõdud ja asukoht vasakul „Seinad“ all.`);
  }

  // ------------------------------------------------------------ mallid
  protected async useTemplate(kind: PlanTemplateKind): Promise<void> {
    if (this.plan()) {
      const ok = await confirmDialog(this.dialog, {
        title: 'Asenda plaan malliga?',
        message: 'Praegune plaan asendatakse. Saad selle „Võta tagasi“ nupuga tagasi.',
        confirm: 'Asenda',
      });
      if (!ok) return;
    }
    const { width, depth } = this.size();
    this.selected.set(null);
    const next = planTemplate(kind, width, depth, this.thickness(), C);
    this.commit(next, `Mall: ${PLAN_TEMPLATES.find((t) => t.kind === kind)?.name}`);
    // uksed/aknad ristküliku seintelt (1 ees, 2 taga, A vasak, B parem) malli vastavatele seintele:
    // esisein = kõige eesmine täissein (terrassi/veranda raam pole ruumi sein), tagasein = kõige tagumine
    const map = templateWallMap(next, this.thickness());
    if (Object.keys(map).length) this.renamed.emit(map);
  }

  protected async clearPlan(): Promise<void> {
    const ok = await confirmDialog(this.dialog, {
      title: 'Eemalda plaan?',
      message: 'Maja arvutatakse jälle lihtsa ristkülikuna laiuse ja pikkuse järgi. Saad selle „Võta tagasi“ nupuga tagasi.',
      confirm: 'Eemalda',
    });
    if (!ok) return;
    this.selected.set(null);
    this.commit(null);
  }

  // ------------------------------------------------------------ hiir
  private toMm(e: PointerEvent | MouseEvent): Pt {
    const svg = this.svg()!.nativeElement;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }

  /** haaramise raadius mm-des (~12 px) */
  private tol(): number {
    const ctm = this.svg()?.nativeElement.getScreenCTM();
    return ctm && ctm.a ? 12 / ctm.a : 100;
  }

  /** Haara: sõlmed, seinte jooned, teiste sõlmede x/y joondus, 10 mm samm */
  private snap(p: Pt, from?: Pt): Pt {
    const plan = this.plan();
    const tol = this.tol();
    const nodes = plan?.nodes ?? [];
    const g = (v: number) => Math.round(v / GRID) * GRID;
    if (from) {
      // täisnurk alguspunktist
      const horiz = Math.abs(p.x - from.x) >= Math.abs(p.y - from.y);
      const along = horiz ? p.x : p.y;
      const cands = [...nodes.map((n) => (horiz ? n.x : n.y)), ...this.lineCoords(horiz ? 'y' : 'x')];
      const hit = cands.find((c) => Math.abs(c - along) <= tol);
      const v = hit ?? from[horiz ? 'x' : 'y'] + g(along - from[horiz ? 'x' : 'y']);
      return horiz ? { x: v, y: from.y } : { x: from.x, y: v };
    }
    const node = nodes.find((n) => Math.abs(n.x - p.x) <= tol && Math.abs(n.y - p.y) <= tol);
    if (node) return { x: node.x, y: node.y };
    // seina joonele
    if (plan) {
      for (const w of plan.walls) {
        const l = wallLine(plan, w.id);
        const at = l.dir === 'x' ? p.y : p.x;
        const along = l.dir === 'x' ? p.x : p.y;
        if (Math.abs(at - l.at) <= tol && along >= l.from - tol && along <= l.to + tol) {
          const v = Math.min(Math.max(along, l.from), l.to);
          const snappedAlong = nodes.map((n) => (l.dir === 'x' ? n.x : n.y)).find((c) => Math.abs(c - v) <= tol) ?? g(v);
          return l.dir === 'x' ? { x: snappedAlong, y: l.at } : { x: l.at, y: snappedAlong };
        }
      }
    }
    const sx = nodes.map((n) => n.x).find((c) => Math.abs(c - p.x) <= tol);
    const sy = nodes.map((n) => n.y).find((c) => Math.abs(c - p.y) <= tol);
    return { x: sx ?? g(p.x), y: sy ?? g(p.y) };
  }

  /** seinte joonte koordinaadid (x-suunas seinte y või y-suunas seinte x) */
  private lineCoords(dir: 'x' | 'y'): number[] {
    const plan = this.plan();
    if (!plan) return [];
    return plan.walls.map((w) => wallLine(plan, w.id)).filter((l) => l.dir === dir).map((l) => l.at);
  }

  protected onDown(e: PointerEvent): void {
    if (this.readonly() || e.button !== 0) return;
    const p = this.toMm(e);
    const target = (e.target as Element).closest('[data-wall]');
    if (this.tool() === 'wall') {
      const d = this.draft();
      if (!this.plan()) {
        this.message.set('Alusta mallist (nt ristkülik) ja lisa seinad juurde.');
        return;
      }
      if (!d) {
        const s = this.snap(p);
        this.draft.set({ from: s, to: s });
        return;
      }
      const end = this.snap(p, d.from);
      if (Math.abs(end.x - d.from.x) + Math.abs(end.y - d.from.y) < GRID) return;
      let newId = '';
      const map = this.apply(
        (plan) => {
          const r = addWall(plan, d.from, end);
          newId = r.id;
          return r.plan;
        },
        '',
        true,
      );
      if (map) {
        newId = map[newId] ?? newId;
        this.selected.set(newId);
        this.message.set(`Sein ${newId} lisatud. Jätka klõpsuga, Esc lõpetab.`);
        this.draft.set({ from: end, to: end });
      }
      return;
    }
    // vali / lohista
    const id = target?.getAttribute('data-wall') ?? null;
    this.selected.set(id);
    if (id && this.plan()) {
      const l = wallLine(this.plan()!, id);
      this.drag = { id, dir: l.dir, start: p, base: this.plan()!, moved: false };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    }
  }

  protected onMove(e: PointerEvent): void {
    const p = this.toMm(e);
    const d = this.draft();
    if (d) {
      this.draft.set({ from: d.from, to: this.snap(p, d.from) });
      return;
    }
    if (this.drag) {
      const raw = this.drag.dir === 'x' ? p.y - this.drag.start.y : p.x - this.drag.start.x;
      const delta = Math.round(raw / GRID) * GRID;
      if (!this.drag.moved && Math.abs(raw) < this.tol() / 2) return;
      this.drag.moved = true;
      try {
        const next = moveWall(this.drag.base, this.drag.id, delta);
        planGeometry(next, this.thickness(), C);
        this.live.set(next);
      } catch {
        /* vigane asend: jäta eelmine */
      }
    }
  }

  protected onUp(): void {
    if (this.drag?.moved && this.live()) {
      const next = this.live()!;
      this.live.set(null);
      this.apply(() => next, '', true);
    }
    this.live.set(null);
    this.drag = null;
  }

  protected setTool(t: Tool): void {
    this.tool.set(t);
    this.draft.set(null);
    this.message.set(t === 'wall' ? 'Klõpsa seina algus ja lõpp. Haarab sõlmedele ja seintele; Esc lõpetab.' : '');
  }

  onKey(e: KeyboardEvent): void {
    const inField = (e.target as HTMLElement).closest('input, textarea, mat-select');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !inField) {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !inField) {
      e.preventDefault();
      this.redo();
      return;
    }
    if (inField || this.readonly()) return;
    if (e.key === 'Escape') {
      if (this.draft()) this.draft.set(null);
      else this.selected.set(null);
      this.message.set('');
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected()) {
      e.preventDefault();
      this.remove();
    } else if (e.key === 'w' || e.key === 'W') {
      this.setTool('wall');
    } else if (e.key === 'v' || e.key === 'V') {
      this.setTool('select');
    }
  }

  // ------------------------------------------------------------ paneel
  private num(e: Event): number | null {
    const v = (e.target as HTMLInputElement).valueAsNumber;
    return Number.isFinite(v) ? v : null;
  }

  protected setSpan(e: Event): void {
    const v = this.num(e);
    const id = this.selected();
    if (v === null || !id || v <= 0) return;
    this.apply((p) => setWallSpan(p, id, v), '', true);
  }

  protected setPosition(e: Event): void {
    const v = this.num(e);
    const s = this.sel();
    if (v === null || !s) return;
    this.apply((p) => moveWall(p, s.w.id, v - s.position), '', true);
  }

  protected rename(e: Event): void {
    const to = (e.target as HTMLInputElement).value.trim().toUpperCase();
    const from = this.selected();
    if (!from || !to || to === from) return;
    const ok = this.apply(
      (p) => ({ ...updateWall(p, from, { id: to }), autoIds: false }),
      'Käsitsi tähis – automaatne nummerdus on välja lülitatud (nupp „Nummerda“ taastab).',
    );
    if (ok) {
      this.selected.set(to);
      this.renamed.emit({ [from]: to });
    } else {
      (e.target as HTMLInputElement).value = from;
    }
  }

  protected setType(type: WallType): void {
    const id = this.selected();
    if (!id) return;
    const patch: Partial<PlanWall> =
      type === 'full' ? { topOnly: undefined, height: undefined } : type === 'top' ? { topOnly: 1, height: undefined } : { height: 741, topOnly: undefined };
    this.apply((p) => updateWall(p, id, patch));
  }

  protected setTopOnly(e: Event): void {
    const v = this.num(e);
    const id = this.selected();
    if (v === null || !id || v < 1) return;
    this.apply((p) => updateWall(p, id, { topOnly: Math.round(v) }));
  }

  protected setHeight(e: Event): void {
    const v = this.num(e);
    const id = this.selected();
    if (v === null || !id || v <= 0) return;
    this.apply((p) => updateWall(p, id, { height: v }));
  }

  protected setGable(v: 'auto' | 'yes' | 'no'): void {
    const id = this.selected();
    if (!id) return;
    this.apply((p) => updateWall(p, id, { gable: v === 'auto' ? undefined : v === 'yes' }));
  }

  protected setHalfStart(v: 'x' | 'y'): void {
    this.apply((p) => ({ ...p, halfStart: v === 'x' ? undefined : v }));
  }

  // lahtised osad
  protected addOpen(): void {
    const s = this.sel();
    if (!s) return;
    const L = s.g.length;
    const list = [...(s.w.open ?? []), { x0: Math.round(L * 0.3), x1: Math.round(L * 0.7), topRows: 2 }];
    this.apply((p) => updateWall(p, s.w.id, { open: list }));
  }

  protected setOpen(i: number, key: keyof OpenSection, e: Event): void {
    const s = this.sel();
    const v = this.num(e);
    if (!s || v === null) return;
    const list = (s.w.open ?? []).map((o, k) => (k === i ? { ...o, [key]: Math.max(0, v) } : o));
    this.apply((p) => updateWall(p, s.w.id, { open: list }));
  }

  protected removeOpen(i: number): void {
    const s = this.sel();
    if (!s) return;
    const list = (s.w.open ?? []).filter((_, k) => k !== i);
    this.apply((p) => updateWall(p, s.w.id, { open: list.length ? list : undefined }));
  }

  // piirded
  protected addRailing(): void {
    const s = this.sel();
    if (!s) return;
    const L = s.g.length;
    const x0 = 0;
    const x1 = Math.round(Math.min(L, 1200));
    const list = [...(s.w.railings ?? []), { x0, x1, rows: 7, spacers: [x0, x1 - 300] }];
    this.apply((p) => updateWall(p, s.w.id, { railings: list }));
  }

  protected setRailing(i: number, key: 'x0' | 'x1' | 'rows', e: Event): void {
    const s = this.sel();
    const v = this.num(e);
    if (!s || v === null) return;
    const list = (s.w.railings ?? []).map((r, k) => (k === i ? { ...r, [key]: Math.max(0, key === 'rows' ? Math.round(v) : v) } : r));
    this.apply((p) => updateWall(p, s.w.id, { railings: list }));
  }

  protected setSpacers(i: number, e: Event): void {
    const s = this.sel();
    if (!s) return;
    const spacers = (e.target as HTMLInputElement).value
      .split(/[;,\s]+/)
      .map(Number)
      .filter((x) => Number.isFinite(x) && x >= 0);
    const list = (s.w.railings ?? []).map((r, k): Railing => (k === i ? { ...r, spacers } : r));
    this.apply((p) => updateWall(p, s.w.id, { railings: list }));
  }

  protected removeRailing(i: number): void {
    const s = this.sel();
    if (!s) return;
    const list = (s.w.railings ?? []).filter((_, k) => k !== i);
    this.apply((p) => updateWall(p, s.w.id, { railings: list.length ? list : undefined }));
  }

  protected spacersText(r: Railing): string {
    return r.spacers.join(', ');
  }

  protected reverse(): void {
    const id = this.selected();
    if (id) this.apply((p) => reverseWall(p, id), 'Seina suund pööratud: kaugused mõõdetakse nüüd teisest otsast.');
  }

  protected remove(): void {
    const id = this.selected();
    if (!id) return;
    this.selected.set(null);
    this.apply((p) => deleteWall(p, id), `Sein ${id} kustutatud.`, true);
  }

  protected select(id: string): void {
    this.selected.set(id);
    this.tool.set('select');
    this.draft.set(null);
  }
}

/** Ristküliku tähised (1, 2, A, B) -> malli ruumi esi-, taga-, vasak- ja parempoolne sein (ainult erinevad) */
function templateWallMap(plan: HousePlan, thickness: number): Record<string, string> {
  let geo: WallGeometry[];
  try {
    geo = planGeometry(plan, thickness, C);
  } catch {
    return {};
  }
  const pw = new Map(plan.walls.map((w) => [w.id, w]));
  const solid = (id: string) => {
    const w = pw.get(id);
    return !!w && w.topOnly === undefined && !(w.open?.length) && !(w.railings?.length);
  };
  const xs = geo.filter((g) => g.dir === 'x').sort((a, b) => b.a.y - a.a.y || b.length - a.length);
  const ys = geo.filter((g) => g.dir === 'y');
  const front = xs.find((g) => solid(g.id)) ?? xs[0];
  const back = [...xs].sort((a, b) => a.a.y - b.a.y || b.length - a.length)[0];
  const left = [...ys].sort((a, b) => a.a.x - b.a.x || b.length - a.length)[0];
  const right = [...ys].sort((a, b) => b.a.x - a.a.x || b.length - a.length)[0];
  const map: Record<string, string> = {};
  const set = (from: string, to: WallGeometry | undefined) => {
    if (to && to.id !== from) map[from] = to.id;
  };
  set('1', front);
  set('2', back);
  set('A', left);
  set('B', right);
  return map;
}
