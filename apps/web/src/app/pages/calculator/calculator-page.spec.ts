import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CalculatorPage } from './calculator-page';
import { appConfig } from '../../app.config';
import { NonNullableFormBuilder } from '@angular/forms';
import { normalizeHouse, setFormValue, type HouseForm } from '../../core/house-form';

const ADMIN = { id: 1, email: 'a@b.ee', name: 'Admin', role: 'admin', tenant: { id: 1, slug: 't', name: 'Test OÜ' } };
const tick = () => new Promise((r) => setTimeout(r));

/** Loob App-i ja vastab /api/auth/me (+ /api/tenant) päringutele. */
async function create(user: unknown = null, prices: Record<string, number> = {}): Promise<ComponentFixture<CalculatorPage>> {
  const fixture = TestBed.createComponent(CalculatorPage);
  const http = TestBed.inject(HttpTestingController);
  const me = http.expectOne('/api/auth/me');
  expect(me.request.headers.get('X-Requested-With')).toBe('logcalc');
  me.flush({ user });
  if (user) {
    await tick();
    http.expectOne('/api/tenant').flush({ tenant: { id: 1, slug: 't', name: 'Test OÜ', settings: { prices } } });
  }
  await tick();
  await fixture.whenStable();
  return fixture;
}

const bomRows = (el: HTMLElement) => Array.from(el.querySelectorAll('table.bom tbody tr')).map((r) => r.textContent ?? '');

describe('CalculatorPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CalculatorPage],
      providers: [...appConfig.providers, provideHttpClientTesting()],
    }).compileComponents();
  });

  describe('sisse logimata (avaleht)', () => {
    it('näitab näidismaja Bente IV ainult vaatamiseks ja vähendatud infoga', async () => {
      const el: HTMLElement = (await create()).nativeElement;
      expect(el.querySelector('.hero .value')?.textContent).toContain('216,10');
      // mõõdud lukus, vahelehtede asemel kutse sisse logida
      expect((el.querySelector('input[formcontrolname="width"]') as HTMLInputElement).disabled).toBe(true);
      expect(el.querySelector('.cta')).not.toBeNull();
      expect(el.querySelector('.left mat-tab-group')).toBeNull();
      // materjalid ilma tükkide ja hindadeta, detailide paneeli pole
      const rows = bomRows(el);
      expect(rows.some((t) => t.includes('Vundamendi prussid'))).toBe(true);
      expect(rows.some((t) => /\d × \d+ mm/.test(t))).toBe(false); // tükkide pikkusi pole
      expect(rows.some((t) => t.includes('Uks'))).toBe(true); // uks tükireana on näha
      expect(el.querySelector('table.bom tfoot')).toBeNull();
      expect(el.querySelector('.panel.details')).toBeNull();
      const toolbar = el.querySelector('mat-toolbar')?.textContent ?? '';
      expect(toolbar).toContain('Logi sisse');
      expect(toolbar).not.toContain('Salvesta');
      expect(toolbar).not.toContain('Näidismajad');
    });

    it('joonis: katus lõikab palgid ja vundamendivaade näitab 7 prussi', async () => {
      const fixture = await create();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-house-drawing clipPath polygon')).not.toBeNull();
      const toggle = Array.from(el.querySelectorAll('.view-bar button')).find((b) => b.textContent?.includes('Vundament')) as HTMLButtonElement;
      toggle.click();
      await fixture.whenStable();
      expect(el.querySelectorAll('app-house-drawing rect.joist').length).toBe(7);
    });
  });

  describe('sisse logitud', () => {
    it('täisvaade: tükid, hinnad, vahelehed; tabeli lahtrid ei ole display:block', async () => {
      const el: HTMLElement = (await create(ADMIN)).nativeElement;
      expect((el.querySelector('input[formcontrolname="width"]') as HTMLInputElement).disabled).toBe(false);
      expect(el.querySelector('.left mat-tab-group')).not.toBeNull();
      // Revit-kalibreeritud: max vahe 600, pruss 5 mm otstest lühem -> 7 × 2740 mm
      expect(bomRows(el).some((t) => t.includes('Vundamendi prussid') && t.includes('7 × 2740 mm'))).toBe(true);
      const cells = Array.from(el.querySelectorAll('table.bom td')) as HTMLElement[];
      expect(cells.every((td) => getComputedStyle(td).display !== 'block')).toBe(true);
      expect(el.querySelector('mat-toolbar')?.textContent).toContain('Salvesta');
    });

    it('ettevõtte hinnakiri jõuab arvutusse', async () => {
      const el: HTMLElement = (await create(ADMIN, { seinaLauad: 2 })).nativeElement;
      // 216,097 jm * 2 €/jm = 432,19 €
      expect(bomRows(el).find((t) => t.includes('Seinalauad'))).toContain('432,19');
    });

    it('K5: esi/tagaseina kõrgus = küljesein − ½ palki, lülitiga käsitsi', async () => {
      const fixture = await create(ADMIN);
      const el: HTMLElement = fixture.nativeElement;
      const fb = () => el.querySelector('input[formcontrolname="frontBackWallHeight"]') as HTMLInputElement;
      expect(fb().disabled).toBe(true);
      expect(fb().value).toBe('1767'); // 1824 − 57
      const side = el.querySelector('input[formcontrolname="sideWallHeight"]') as HTMLInputElement;
      side.value = '1938';
      side.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(fb().value).toBe('1881');
      (el.querySelector('.auto-btn') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(fb().disabled).toBe(false);
    });

    it('K7: ettevõtte kataloogist uks koos hinnaga materjalide nimekirjas', async () => {
      const fixture = TestBed.createComponent(CalculatorPage);
      const http = TestBed.inject(HttpTestingController);
      http.expectOne('/api/auth/me').flush({ user: ADMIN });
      await tick();
      http.expectOne('/api/tenant').flush({
        tenant: { id: 1, slug: 't', name: 'Test OÜ', settings: { catalog: { doors: [{ name: 'D2 topeltuks', width: 1440, height: 1824, price: 450 }], windows: [] } } },
      });
      await tick();
      await fixture.whenStable();
      const page = fixture.componentInstance as unknown as { form: { controls: { doors: { at(i: number): { patchValue(v: object): void } } } } };
      page.form.controls.doors.at(0).patchValue({ name: 'D2 topeltuks', price: 450 });
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('mat-select')).not.toBeNull();
      const door = bomRows(el).find((t) => t.includes('Uks D2 topeltuks'));
      expect(door).toContain('450,00');
    });

    it('maja avamisel uuenevad ka pikemate laudade read; ühekalle: uks eestvaates ja plaanil', async () => {
      const fixture = await create(ADMIN);
      const page = fixture.componentInstance as unknown as { form: HouseForm };
      const fb = TestBed.inject(NonNullableFormBuilder);
      setFormValue(fb, page.form, normalizeHouse({
        roofType: 'mono', width: 3553, depth: 2943, frontBackWallHeight: 2223, roofHeight: 1881, logThickness: 28,
        longBoards: [{ a: 3753, b: 114, count: 2 }], doors: [{ a: 1440, b: 1995, count: 1 }], windows: [{ a: 920, b: 456, count: 1 }],
      }));
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      const firstRowInput = el.querySelector('app-rows-editor input') as HTMLInputElement;
      expect(firstRowInput.value).toBe('3753');
      // eestvaade = sein 1 koos uksega ja aknaga
      expect(el.querySelector('app-house-drawing figcaption:last-of-type')?.textContent ?? '').toBeTruthy();
      expect(el.querySelectorAll('app-house-drawing rect.door').length).toBe(1);
      expect(el.querySelectorAll('app-house-drawing rect.window').length).toBe(1);
      expect(el.querySelectorAll('app-house-drawing path.plan-swing').length).toBe(1);
      const captions = Array.from(el.querySelectorAll('app-house-drawing figcaption')).map((c) => c.textContent ?? '');
      expect(captions.some((c) => c.includes('Eestvaade – sein 1'))).toBe(true);
      // uks materjalides tükkides, mitte jm
      expect(bomRows(el).find((t) => t.includes('Uks 1440'))).toContain('1 tk');
    });

    it('arvutab ümber ja näitab viga vigase sisendi korral', async () => {
      const fixture = await create(ADMIN);
      const input = fixture.nativeElement.querySelector('input[formcontrolname="logHeight"]') as HTMLInputElement;
      input.value = '0';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('Palgi kõrgus');
    });
  });
});
