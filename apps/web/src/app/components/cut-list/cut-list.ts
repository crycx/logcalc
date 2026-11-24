import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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

  protected readonly total = computed(() => this.walls().reduce((s, w) => s + w.totalJm, 0));
  protected readonly pieceCount = computed(() => this.walls().reduce((s, w) => s + w.pieces.reduce((a, p) => a + p.count, 0), 0));

  protected wallName(id: string): string {
    return WALL_NAMES[id] ?? `Sein ${id}`;
  }

  protected notchLabel(p: CutPiece): string {
    return p.kind === 'gable' ? 'viil' : p.notches === 2 ? '2 otsa' : p.notches === 1 ? '1 ots' : '–';
  }
}
