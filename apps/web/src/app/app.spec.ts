import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App], providers: appConfig.providers }).compileComponents();
  });

  it('näitab vaikemaja (Bente IV) seinalaudu 216,10 jm ja materjalitabelit', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.hero .value')?.textContent).toContain('216,10');
    const rows = Array.from(el.querySelectorAll('table.bom tbody tr')).map((r) => r.textContent ?? '');
    expect(rows.some((t) => t.includes('Seinalauad'))).toBe(true);
    expect(rows.some((t) => t.includes('Vundamendi prussid') && t.includes('9 × 2750 mm'))).toBe(true);
    // ükski tabeli lahter ei tohi olla display:block (lõhub tabeli paigutuse)
    const cells = Array.from(el.querySelectorAll('table.bom td')) as HTMLElement[];
    expect(cells.every((td) => getComputedStyle(td).display !== 'block')).toBe(true);
  });

  it('joonis: katus lõikab palgid (clipPath) ja vundamendivaade näitab 9 prussi', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-house-drawing clipPath polygon')).not.toBeNull();
    const toggle = Array.from(el.querySelectorAll('.view-bar button')).find((b) => b.textContent?.includes('Vundament')) as HTMLButtonElement;
    toggle.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('app-house-drawing rect.joist').length).toBe(9);
  });

  it('arvutab ümber, kui sisend muutub, ja näitab viga vigase sisendi korral', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input[formcontrolname="logHeight"]') as HTMLInputElement;
    input.value = '0';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('Palgi kõrgus');
  });
});
