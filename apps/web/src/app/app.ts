import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CalcInputError, calculateHouse, type CalcResult } from '@logcalc/calc-engine';
import { map } from 'rxjs';
import {
  DEFAULT_VALUE,
  EXAMPLES,
  PRICE_KEYS,
  buildHouseForm,
  setFormValue,
  toEngineInput,
  type Example,
  type HouseFormValue,
} from './house-form';
import { HouseDrawing, type DrawingView } from './house-drawing';
import { RowsEditor } from './rows-editor';

const STORAGE_KEY = 'logcalc.form.v1';

type CalcState = { ok: true; result: CalcResult } | { ok: false; message: string };

function loadStored(): HouseFormValue | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<HouseFormValue>;
    return { ...DEFAULT_VALUE, ...v, prices: { ...DEFAULT_VALUE.prices, ...(v.prices ?? {}) } };
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatTabsModule,
    MatMenuModule,
    MatTooltipModule,
    RowsEditor,
    HouseDrawing,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly examples = EXAMPLES;
  protected readonly priceKeys = PRICE_KEYS;
  protected readonly view = signal<DrawingView>('overview');

  protected readonly form = buildHouseForm(this.fb, loadStored() ?? DEFAULT_VALUE);

  protected readonly formValue = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue() as HouseFormValue)), {
    initialValue: this.form.getRawValue() as HouseFormValue,
  });

  protected readonly isGable = computed(() => this.formValue().roofType === 'gable');

  protected readonly calc = computed<CalcState>(() => {
    const { input, options } = toEngineInput(this.formValue());
    try {
      return { ok: true, result: calculateHouse(input, options) };
    } catch (e) {
      return { ok: false, message: e instanceof CalcInputError ? e.message : 'Arvutus ebaõnnestus.' };
    }
  });

  protected readonly result = computed(() => {
    const c = this.calc();
    return c.ok ? c.result : null;
  });

  protected readonly errorMessage = computed(() => {
    const c = this.calc();
    return c.ok ? '' : c.message;
  });

  protected readonly hasPrices = computed(() => (this.result()?.totalPrice ?? 0) > 0);

  constructor() {
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
    effect(() => {
      const v = this.formValue();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
      } catch {
        /* privaatne aken vms – salvestamine pole kriitiline */
      }
    });
  }

  protected loadExample(ex: Example): void {
    const keepPrices = this.form.getRawValue().prices;
    setFormValue(this.fb, this.form, { ...DEFAULT_VALUE, ...ex.value, prices: keepPrices });
  }

  protected reset(): void {
    const keepPrices = this.form.getRawValue().prices;
    setFormValue(this.fb, this.form, { ...DEFAULT_VALUE, prices: keepPrices });
  }

  protected pieces(p: { count: number; length: number }[] | undefined): string {
    if (!p?.length) return '';
    return p.map((x) => `${x.count} × ${Math.round(x.length)} mm`).join(' + ');
  }
}
