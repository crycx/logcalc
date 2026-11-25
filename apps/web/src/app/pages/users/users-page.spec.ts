import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { appConfig } from '../../app.config';
import type { AuthEvent, ManagedUser } from '../../core/api';
import { Session } from '../../core/api';
import { UsersPage } from './users-page';

const ADMIN = { id: 1, email: 'admin@firma.ee', name: 'Admin', role: 'admin', tenant: { id: 1, slug: 'f', name: 'Firma OÜ' } };
const tick = () => new Promise((r) => setTimeout(r));

const user = (p: Partial<ManagedUser>): ManagedUser => ({
  id: 2,
  email: 'mari@firma.ee',
  name: 'Mari',
  role: 'user',
  active: true,
  createdAt: '2026-11-01 10:00:00',
  lastLoginAt: '2026-11-24 12:30:00',
  tenant: { id: 1, name: 'Firma OÜ' },
  projectCount: 3,
  passwordSet: true,
  linkPending: false,
  ...p,
});

const USERS = [user({ id: 1, email: ADMIN.email, name: 'Admin', role: 'admin', projectCount: 5 }), user({}), user({ id: 3, email: 'jaan@firma.ee', name: 'Jaan', active: false, lastLoginAt: null })];

const EVENTS: AuthEvent[] = [
  {
    id: 12,
    type: 'login_failed',
    at: '2026-11-24 12:29:00',
    email: 'mari@firma.ee',
    ip: '193.40.1.2',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/142.0.0.0 Safari/537.36',
    detail: 'vale parool',
    user: { id: 2, name: 'Mari', email: 'mari@firma.ee' },
    actor: null,
    tenant: 'Firma OÜ',
  },
  {
    id: 11,
    type: 'user_updated',
    at: '2026-11-24 11:00:00',
    email: 'jaan@firma.ee',
    ip: '193.40.1.1',
    userAgent: '',
    detail: 'välja lülitatud',
    user: { id: 3, name: 'Jaan', email: 'jaan@firma.ee' },
    actor: { id: 1, name: 'Admin', email: ADMIN.email },
    tenant: 'Firma OÜ',
  },
];

async function create(): Promise<{ fixture: ComponentFixture<UsersPage>; http: HttpTestingController; el: HTMLElement }> {
  const http = TestBed.inject(HttpTestingController);
  const session = TestBed.inject(Session);
  const init = session.init();
  http.expectOne('/api/auth/me').flush({ user: ADMIN });
  await tick();
  http.expectOne('/api/tenant').flush({ tenant: { id: 1, slug: 'f', name: 'Firma OÜ', settings: {} } });
  await init;
  const fixture = TestBed.createComponent(UsersPage);
  http.expectOne('/api/users').flush({ users: USERS });
  http.expectOne((r) => r.url === '/api/auth-events').flush({ events: EVENTS, more: false });
  await tick();
  await fixture.whenStable();
  return { fixture, http, el: fixture.nativeElement };
}

const rows = (el: HTMLElement, cls: string) =>
  Array.from(el.querySelectorAll(`table.${cls} tbody tr`)).map((r) => (r.textContent ?? '').replace(/\s+/g, ' ').trim());

describe('UsersPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [...appConfig.providers, provideHttpClientTesting()],
    }).compileComponents();
  });

  it('näitab kasutajaid: roll, olek, viimane sisselogimine, majade arv; "sina" märge', async () => {
    const { el } = await create();
    const r = rows(el, 'users');
    expect(r.length).toBe(3);
    expect(r[0]).toContain('sina');
    expect(r[1]).toContain('Mari');
    expect(r[1]).toContain('Aktiivne');
    expect(r[1]).toMatch(/24\.11\.2026 \d\d:30/);
    expect(r[2]).toContain('Välja lülitatud');
    expect(r[2]).toContain('pole sisse loginud');
    // aktiivseid 2
    expect(el.querySelector('.count')?.textContent?.trim()).toBe('2');
    // ühe ettevõtte admin: ettevõtte veergu pole
    expect(Array.from(el.querySelectorAll('table.users th')).map((t) => t.textContent?.trim())).not.toContain('Ettevõte');
  });

  it('otsing ja välja lülitatute peitmine', async () => {
    const { fixture, el } = await create();
    const page = fixture.componentInstance as unknown as { search: { set(v: string): void }; showInactive: { set(v: boolean): void } };
    page.search.set('mari');
    await fixture.whenStable();
    expect(rows(el, 'users').length).toBe(1);
    page.search.set('');
    page.showInactive.set(false);
    await fixture.whenStable();
    expect(rows(el, 'users').map((t) => t.includes('Jaan'))).not.toContain(true);
  });

  it('logi: sündmus, põhjus, tegija, IP ja brauser', async () => {
    const { fixture, el } = await create();
    (fixture.componentInstance as unknown as { tab: { set(v: number): void } }).tab.set(1);
    await fixture.whenStable();
    await tick();
    await fixture.whenStable();
    const r = rows(el, 'events');
    expect(r[0]).toContain('Ebaõnnestunud sisselogimine');
    expect(r[0]).toContain('vale parool');
    expect(r[0]).toContain('193.40.1.2');
    expect(r[0]).toContain('Chrome 142 · Windows');
    expect(r[1]).toContain('Kasutaja muudetud');
    expect(r[1]).toContain('välja lülitatud · tegi Admin');
  });

  it('logi filter saadab tüübi ja kasutaja serverisse', async () => {
    const { fixture, http } = await create();
    const page = fixture.componentInstance as unknown as { setEventType(t: string): void; setEventUser(id: number | null): void };
    page.setEventType('failed');
    http.expectOne((r) => r.url === '/api/auth-events' && r.params.get('type') === 'failed').flush({ events: [], more: false });
    page.setEventUser(2);
    http.expectOne((r) => r.url === '/api/auth-events' && r.params.get('type') === 'failed' && r.params.get('userId') === '2').flush({ events: [], more: false });
    await fixture.whenStable();
  });

  it('väljalülitamine küsib kinnitust ja uuendab rida', async () => {
    const { fixture, http, el } = await create();
    const page = fixture.componentInstance as unknown as { toggleActive(u: ManagedUser): Promise<void> };
    const done = page.toggleActive(USERS[1]!);
    await tick();
    await fixture.whenStable();
    const confirm = Array.from(document.querySelectorAll('mat-dialog-container button')).find((b) => b.textContent?.includes('Lülita välja')) as HTMLButtonElement;
    expect(confirm).toBeTruthy();
    confirm.click();
    // dialoog sulgub asünkroonselt (animatsioon)
    let found: TestRequest[] = [];
    for (let i = 0; i < 20 && !found.length; i++) {
      await new Promise((r) => setTimeout(r, 20));
      await fixture.whenStable();
      found = http.match('/api/users/2');
    }
    expect(found.length).toBe(1);
    const req = found[0]!;
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ active: false });
    req.flush({ user: user({ active: false }) });
    await done;
    http.expectOne((r) => r.url === '/api/auth-events').flush({ events: [], more: false });
    await fixture.whenStable();
    expect(rows(el, 'users')[1]).toContain('Välja lülitatud');
  });
});
