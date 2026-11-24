import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject, input } from '@angular/core';
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { PlacedOpening, WallId } from '@logcalc/calc-engine';
import { buildRow, type CatalogItem, type RowForm } from '../../core/house-form';

/** Korduvate ridade (pikemad lauad, uksed, aknad) muutmine; uste/akende puhul valik kataloogist. */
@Component({
  selector: 'app-rows-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './rows-editor.html',
  styleUrl: './rows-editor.scss',
})
export class RowsEditor {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly rows = input.required<FormArray<RowForm>>();

  /** Ettevõtte kataloog (uksed/aknad). Tühi = ainult oma mõõdud. */
  readonly catalog = input<CatalogItem[]>([]);
  readonly aLabel = input('Laius');
  readonly bLabel = input('Kõrgus');
  readonly addLabel = input('Lisa');
  readonly emptyText = input('Pole lisatud.');
  /** Uksed/aknad: näita asukoha välju (sein, kaugus, alumine serv) */
  readonly placement = input(false);
  /** Mootori paigutatud avad (selle tüübi omad, ridade järjekorras, kogus lahti laotud) – automaatsete väärtuste vihjeks */
  readonly placed = input<PlacedOpening[]>([]);
  protected readonly wallIds: WallId[] = ['1', '2', 'A', 'B'];

  constructor() {
    // FormArray on sama objekt ka siis, kui read asendatakse (maja avamine) – OnPush vajab märguannet
    const cdr = inject(ChangeDetectorRef);
    effect((onCleanup) => {
      const sub = this.rows().valueChanges.subscribe(() => cdr.markForCheck());
      onCleanup(() => sub.unsubscribe());
    });
  }

  add(): void {
    this.rows().push(buildRow(this.fb));
  }

  remove(i: number): void {
    this.rows().removeAt(i);
  }

  /** Kataloogist valik -> mõõdud, nimi ja hind; tühi valik = oma mõõdud */
  pick(row: RowForm, name: string): void {
    const item = this.catalog().find((c) => c.name === name);
    if (item) {
      row.patchValue({ name: item.name, a: item.width, b: item.height, price: item.price });
    } else {
      row.patchValue({ name: '', price: 0 });
    }
  }

  /** Rea esimese koopia paigutus (automaatse väärtuse vihje) */
  autoOf(i: number): PlacedOpening | undefined {
    const rows = this.rows().getRawValue();
    const start = rows.slice(0, i).reduce((s, r) => s + Math.max(0, Math.floor(r.count || 0)), 0);
    return this.placed()[start];
  }

  /** Kas rea mõõdud vastavad endiselt valitud mudelile */
  isCustomized(row: RowForm): boolean {
    const v = row.getRawValue();
    const item = this.catalog().find((c) => c.name === v.name);
    return !!item && (item.width !== v.a || item.height !== v.b);
  }
}
