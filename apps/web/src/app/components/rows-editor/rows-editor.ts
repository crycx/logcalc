import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { buildRow, type RowForm } from '../../core/house-form';

/** Korduvate ridade (pikemad lauad, uksed, aknad) muutmine. */
@Component({
  selector: 'app-rows-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './rows-editor.html',
  styleUrl: './rows-editor.scss',
})
export class RowsEditor {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly rows = input.required<FormArray<RowForm>>();
  readonly aLabel = input('Laius');
  readonly bLabel = input('Kõrgus');
  readonly addLabel = input('Lisa');
  readonly emptyText = input('Pole lisatud.');

  add(): void {
    this.rows().push(buildRow(this.fb));
  }

  remove(i: number): void {
    this.rows().removeAt(i);
  }
}
