import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CalculatorPage } from './calculator-page';
import { appConfig } from '../../app.config';

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
      expect(rows.some((t) => t.includes('×'))).toBe(false);
      expect(el.querySelector('table.bom tfoot')).toBeNull();
      expect(el.querySelector('.panel.details')).toBeNull();
      const toolbar = el.querySelector('mat-toolbar')?.textContent ?? '';
      expect(toolbar).toContain('Logi sisse');
      expect(toolbar).not.toContain('Salvesta');
      expect(toolbar).not.toContain('Näidismajad');
    });

    it('joonis: katus lõikab palgid ja vundamendivaade näitab 9 prussi', async () => {
      const fixture = await create();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-house-drawing clipPath polygon')).not.toBeNull();
      const toggle = Array.from(el.querySelectorAll('.view-bar button')).find((b) => b.textContent?.includes('Vundament')) as HTMLButtonElement;
      toggle.click();
      await fixture.whenStable();
      expect(el.querySelectorAll('app-house-drawing rect.joist').length).toBe(9);
    });
  });

  describe('sisse logitud', () => {
    it('täisvaade: tükid, hinnad, vahelehed; tabeli lahtrid ei ole display:block', async () => {
      const el: HTMLElement = (await create(ADMIN)).nativeElement;
      expect((el.querySelector('input[formcontrolname="width"]') as HTMLInputElement).disabled).toBe(false);
      expect(el.querySelector('.left mat-tab-group')).not.toBeNull();
      expect(bomRows(el).some((t) => t.includes('Vundamendi prussid') && t.includes('9 × 2750 mm'))).toBe(true);
      const cells = Array.from(el.querySelectorAll('table.bom td')) as HTMLElement[];
      expect(cells.every((td) => getComputedStyle(td).display !== 'block')).toBe(true);
      expect(el.querySelector('mat-toolbar')?.textContent).toContain('Salvesta');
    });

    it('ettevõtte hinnakiri jõuab arvutusse', async () => {
      const el: HTMLElement = (await create(ADMIN, { seinaLauad: 2 })).nativeElement;
      // 216,097 jm * 2 €/jm = 432,19 €
      expect(bomRows(el).find((t) => t.includes('Seinalauad'))).toContain('432,19');
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
