import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { CutPiece, WallCutList } from '@logcalc/calc-engine';

const WALL_NAMES: Record<string, string> = {
  '1': 'Sein 1 · esisein',
  '2': 'Sein 2 · tagasein',
  A: 'Sein A · külgsein',
  B: 'Sein B · külgsein',
};

/** Seinte lõikenimekiri (seinamudelist): tähis, profiil, tk, pikkus, sälgud – nagu Revitis. */
@Component({
  selector: 'app-cut-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatTooltipModule],
  templateUrl: './cut-list.html',
  styleUrl: './cut-list.scss',
})
export class CutList {
  readonly walls = input.required<WallCutList[]>();
  /** valitud tähis (esiletõstetud 3D vaates) */
  readonly selected = input<string | null>(null);
  /** klõps real: tähis (sama rida uuesti = null) */
  readonly select = output<string | null>();
  /** kas valikul on mõju (3D vaade avatud) – vihje kasutajale */
  readonly linked = input(false);

  constructor() {
    // 3D-s valitud tükk: rida nähtavale
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    effect(() => {
      const m = this.selected();
      // ainult 3D-st tulnud valik (loendis klõpsatud rida on juba nähtaval)
      if (!m || m === this.clicked) return;
      queueMicrotask(() => host.nativeElement.querySelector(`tr[data-mark="${CSS.escape(m)}"]`)?.scrollIntoView({ block: 'nearest' }));
    });
  }

  private clicked: string | null = null;

  protected toggle(mark: string): void {
    const next = this.selected() === mark ? null : mark;
    this.clicked = next;
    this.select.emit(next);
  }

  protected readonly total = computed(() => this.walls().reduce((s, w) => s + w.totalJm, 0));
  protected readonly pieceCount = computed(() => this.walls().reduce((s, w) => s + w.pieces.reduce((a, p) => a + p.count, 0), 0));

  protected wallName(id: string): string {
    return WALL_NAMES[id] ?? `Sein ${id}`;
  }

  protected notchLabel(p: CutPiece): string {
    return p.kind === 'gable' ? 'viil' : p.notches >= 3 ? `${p.notches} sälku` : p.notches === 2 ? '2 otsa' : p.notches === 1 ? '1 ots' : '–';
  }
}
