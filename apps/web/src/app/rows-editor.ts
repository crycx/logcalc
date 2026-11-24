import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { buildRow, type RowForm } from './house-form';

/** Korduvate ridade (pikemad lauad, uksed, aknad) muutmine. */
@Component({
  selector: 'app-rows-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    @for (row of rows().controls; track row; let i = $index) {
      <div class="row">
        <mat-form-field>
          <mat-label>{{ aLabel() }}, mm</mat-label>
          <input matInput type="number" min="0" [formControl]="row.controls.a" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>{{ bLabel() }}, mm</mat-label>
          <input matInput type="number" min="0" [formControl]="row.controls.b" />
        </mat-form-field>
        <mat-form-field class="count">
          <mat-label>Tk</mat-label>
          <input matInput type="number" min="0" [formControl]="row.controls.count" />
        </mat-form-field>
        <button mat-icon-button type="button" (click)="remove(i)" matTooltip="Eemalda" [attr.aria-label]="'Eemalda rida ' + (i + 1)">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    } @empty {
      <p class="empty">{{ emptyText() }}</p>
    }
    <button mat-button type="button" (click)="add()">
      <mat-icon>add</mat-icon> {{ addLabel() }}
    </button>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .row { display: grid; grid-template-columns: 1fr 1fr 64px 40px; gap: 6px; align-items: center; width: 100%; }
    .empty { margin: 0; color: var(--mat-sys-on-surface-variant); font: var(--mat-sys-body-small); }
    @media (max-width: 480px) { .row { grid-template-columns: 1fr 1fr 72px 40px; } }
  `,
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
