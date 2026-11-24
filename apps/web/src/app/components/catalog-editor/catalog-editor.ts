import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject, input } from '@angular/core';
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { buildCatalogItem, type CatalogItemForm } from '../../core/house-form';

/** Ettevõtte uste/akende kataloogi muutmine (nimi, mõõdud, hind tk kohta). */
@Component({
  selector: 'app-catalog-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './catalog-editor.html',
  styleUrl: './catalog-editor.scss',
})
export class CatalogEditor {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly items = input.required<FormArray<CatalogItemForm>>();

  readonly addLabel = input('Lisa');

  constructor() {
    // FormArray on sama objekt ka siis, kui read asendatakse (maja avamine) – OnPush vajab märguannet
    const cdr = inject(ChangeDetectorRef);
    effect((onCleanup) => {
      const sub = this.items().valueChanges.subscribe(() => cdr.markForCheck());
      onCleanup(() => sub.unsubscribe());
    });
  }

  add(): void {
    this.items().push(buildCatalogItem(this.fb));
  }

  remove(i: number): void {
    this.items().removeAt(i);
  }
}
