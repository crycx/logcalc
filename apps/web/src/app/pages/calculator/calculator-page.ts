import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CalcInputError, calculateHouse, type CalcResult, type PriceList } from '@logcalc/calc-engine';
import { firstValueFrom, map } from 'rxjs';
import { Api, Session, type ProjectAccess } from '../../core/api';
import { formatPieces } from '../../helpers/format';
import { apiError } from '../../helpers/http';
import { stableStringify } from '../../helpers/json';
import { storageGet, storageSet } from '../../helpers/storage';
import { confirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog';
import { LoginDialog } from '../../dialogs/login-dialog/login-dialog';
import { NameDialog, type NameDialogData } from '../../dialogs/name-dialog/name-dialog';
import { ProjectsDialog } from '../../dialogs/projects-dialog/projects-dialog';
import { ShareDialog } from '../../dialogs/share-dialog/share-dialog';
import { HouseDrawing, type DrawingView } from '../../components/house-drawing/house-drawing';
import {
  DEFAULT_VALUE,
  PRICE_KEYS,
  buildHouseForm,
  setFormValue,
  toEngineInput,
  type HouseFormValue,
} from '../../core/house-form';
import { RowsEditor } from '../../components/rows-editor/rows-editor';

const STORAGE_KEY = 'logcalc.form.v1';
const PROJECT_KEY = 'logcalc.project.v1';

type CalcState = { ok: true; result: CalcResult } | { ok: false; message: string };
/** Majaga salvestatakse kõik peale hindade (hinnad tulevad kliendi hinnakirjast). */
type HouseData = Omit<HouseFormValue, 'prices'>;
interface OpenProject {
  id: number;
  name: string;
  access?: Pick<ProjectAccess, 'edit' | 'manage' | 'via'>;
}

/** Avalehe näidismaja (sisse logimata, ainult vaatamiseks): Bente IV 28 */
const DEMO: HouseFormValue = DEFAULT_VALUE;

function loadStored(): HouseFormValue | null {
  const v = storageGet<Partial<HouseFormValue>>(STORAGE_KEY);
  return v ? { ...DEFAULT_VALUE, ...v, prices: { ...DEFAULT_VALUE.prices, ...(v.prices ?? {}) } } : null;
}

/** Võrdluseks: vaikeväärtustega täiendatud, võtmete järjekorrast sõltumatu */
function canon(d: Partial<HouseData>): string {
  return stableStringify({ ...houseData(DEFAULT_VALUE), ...d });
}

function houseData(v: HouseFormValue): HouseData {
  const { prices: _prices, ...rest } = v;
  return rest;
}

@Component({
  selector: 'app-calculator-page',
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
    MatDividerModule,
    RowsEditor,
    HouseDrawing,
  ],
  templateUrl: './calculator-page.html',
  styleUrl: './calculator-page.scss',
})
export class CalculatorPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  protected readonly session = inject(Session);

  protected readonly priceKeys = PRICE_KEYS;
  protected readonly view = signal<DrawingView>('overview');

  protected readonly form = buildHouseForm(this.fb, DEMO);

  protected readonly formValue = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue() as HouseFormValue)), {
    initialValue: this.form.getRawValue() as HouseFormValue,
  });

  /** Avatud (serverisse salvestatud) maja */
  protected readonly project = signal<OpenProject | null>(storageGet<OpenProject>(PROJECT_KEY));
  /** Viimati salvestatud/avatud seis (JSON), et näidata salvestamata muudatusi */
  private readonly savedSnapshot = signal<string | null>(null);
  protected readonly dirty = computed(() => {
    const snap = this.savedSnapshot();
    return this.project() !== null && snap !== null && snap !== canon(houseData(this.formValue()));
  });
  protected readonly saving = signal(false);

  /** Sisse logimata: ainult näidismaja vaatamine, vähendatud info */
  protected readonly readonly = computed(() => !this.session.user());
  /** Avatud maja: kas tohib üle salvestada */
  protected readonly canOverwrite = computed(() => this.project()?.access?.edit ?? true);
  protected readonly canShare = computed(() => this.project()?.access?.manage ?? false);

  protected readonly isGable = computed(() => this.formValue().roofType === 'gable');

  protected readonly calc = computed<CalcState>(() => {
    const { input, options } = toEngineInput(this.formValue());
    const tenantConstants = this.session.tenant()?.settings.constants;
    if (tenantConstants) options.constants = { ...tenantConstants, ...options.constants };
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
    // sisse logimata -> näidismaja, vorm lukus; sisse logitud -> viimane oma mustand
    effect(() => {
      const ro = this.readonly();
      untracked(() => {
        if (ro) {
          setFormValue(this.fb, this.form, { ...DEMO, prices: this.form.getRawValue().prices });
          this.form.disable();
        } else {
          this.form.enable();
          const draft = loadStored();
          if (draft) setFormValue(this.fb, this.form, { ...draft, prices: this.form.getRawValue().prices });
        }
      });
    });
    effect(() => {
      const v = this.formValue();
      if (!untracked(this.readonly)) storageSet(STORAGE_KEY, v);
    });
    effect(() => storageSet(PROJECT_KEY, this.project()));
    void this.initSession();
  }

  private async initSession(): Promise<void> {
    await this.session.init();
    if (!this.session.user()) {
      this.project.set(null);
      return;
    }
    this.applyTenantPrices();
    const p = this.project();
    if (p) {
      // värskenda avatud maja serverist (kui see on vahepeal kustutatud, unusta)
      try {
        const full = await this.api.project<HouseData>(p.id);
        this.savedSnapshot.set(canon(full.data));
        this.project.set({ id: full.id, name: full.name, access: full.access });
      } catch {
        this.project.set(null);
      }
    }
  }

  /** Kliendi hinnakiri -> vormi hinnad */
  private applyTenantPrices(): void {
    const prices = this.session.tenant()?.settings.prices;
    if (!prices) return;
    const current = this.form.getRawValue().prices;
    const next = { ...current };
    for (const k of Object.keys(next) as (keyof PriceList)[]) {
      const v = prices[k];
      if (typeof v === 'number') next[k] = v;
    }
    this.form.controls.prices.patchValue(next);
  }

  // ------------------------------------------------------------ sisselogimine
  protected async openLogin(): Promise<void> {
    const ok = await firstValueFrom(this.dialog.open(LoginDialog, { width: '420px', maxWidth: '94vw', autoFocus: 'first-tabbable' }).afterClosed());
    if (ok) {
      this.applyTenantPrices();
      const u = this.session.user();
      this.snack.open(`Tere, ${u?.name || u?.email}!`, undefined, { duration: 2500 });
    }
  }

  protected async logout(): Promise<void> {
    await this.session.logout();
    this.project.set(null);
    this.savedSnapshot.set(null);
    this.snack.open('Oled välja logitud.', undefined, { duration: 2500 });
  }

  // ------------------------------------------------------------ majad
  /** Kui on salvestamata muudatusi, küsi kinnitust. */
  private async confirmDiscard(): Promise<boolean> {
    if (!this.dirty()) return true;
    return confirmDialog(this.dialog, {
      title: 'Salvestamata muudatused',
      message: `Majal „${this.project()?.name}“ on salvestamata muudatusi. Need lähevad kaduma.`,
      confirm: 'Jätka salvestamata',
      danger: true,
    });
  }

  protected async newHouse(): Promise<void> {
    if (!(await this.confirmDiscard())) return;
    this.project.set(null);
    this.savedSnapshot.set(null);
    this.reset();
  }

  protected async openProjects(): Promise<void> {
    if (!(await this.confirmDiscard())) return;
    const id = await firstValueFrom(
      this.dialog.open(ProjectsDialog, { width: '640px', maxWidth: '94vw', autoFocus: false }).afterClosed(),
    );
    if (typeof id !== 'number') return;
    try {
      const p = await this.api.project<HouseData>(id);
      const prices = this.form.getRawValue().prices;
      setFormValue(this.fb, this.form, { ...DEFAULT_VALUE, ...p.data, prices });
      this.project.set({ id: p.id, name: p.name, access: p.access });
      this.savedSnapshot.set(canon(p.data));
      this.snack.open(`Avatud: ${p.name}`, undefined, { duration: 2000 });
    } catch (e) {
      this.snack.open(apiError(e), 'OK', { duration: 5000 });
    }
  }

  protected async save(asNew = false): Promise<void> {
    const current = this.project();
    // ainult vaatamisõigusega maja -> salvesta koopiana
    if (current && !this.canOverwrite()) asNew = true;
    let name = current?.name ?? '';
    if (!current || asNew) {
      const data: NameDialogData = {
        title: asNew ? 'Salvesta uue majana' : 'Salvesta maja',
        name: asNew && current ? `${current.name} (koopia)` : name,
        action: 'Salvesta',
      };
      const res = await firstValueFrom(this.dialog.open(NameDialog, { data, width: '420px', maxWidth: '94vw' }).afterClosed());
      if (typeof res !== 'string' || !res.trim()) return;
      name = res;
    }
    const data = houseData(this.form.getRawValue() as HouseFormValue);
    this.saving.set(true);
    try {
      const p = current && !asNew ? await this.api.updateProject(current.id, { data }) : await this.api.createProject(name, data);
      this.project.set({ id: p.id, name: p.name, access: p.access });
      this.savedSnapshot.set(canon(data));
      this.snack.open(`Salvestatud: ${p.name}`, undefined, { duration: 2000 });
    } catch (e) {
      this.snack.open(apiError(e), 'OK', { duration: 5000 });
    } finally {
      this.saving.set(false);
    }
  }

  protected async rename(): Promise<void> {
    const current = this.project();
    if (!current) return;
    const data: NameDialogData = { title: 'Nimeta ümber', name: current.name, action: 'Salvesta' };
    const name = await firstValueFrom(this.dialog.open(NameDialog, { data, width: '420px', maxWidth: '94vw' }).afterClosed());
    if (typeof name !== 'string' || !name.trim() || name === current.name) return;
    try {
      const p = await this.api.updateProject(current.id, { name });
      this.project.set({ id: p.id, name: p.name, access: p.access });
    } catch (e) {
      this.snack.open(apiError(e), 'OK', { duration: 5000 });
    }
  }

  protected shareProject(): void {
    const p = this.project();
    if (!p) return;
    this.dialog.open(ShareDialog, { data: { id: p.id, name: p.name }, width: '600px', maxWidth: '94vw', autoFocus: 'first-tabbable' });
  }

  // ------------------------------------------------------------ hinnakiri
  protected async saveTenantPrices(): Promise<void> {
    const prices = this.form.getRawValue().prices;
    try {
      const t = await this.api.saveTenantSettings({ prices });
      this.session.tenant.set(t);
      this.snack.open(`Hinnakiri salvestatud kliendile ${t.name}`, undefined, { duration: 2500 });
    } catch (e) {
      this.snack.open(apiError(e), 'OK', { duration: 5000 });
    }
  }

  // ------------------------------------------------------------ muu
  protected reset(): void {
    const keepPrices = this.form.getRawValue().prices;
    setFormValue(this.fb, this.form, { ...DEFAULT_VALUE, prices: keepPrices });
  }

  protected readonly pieces = formatPieces;
}
