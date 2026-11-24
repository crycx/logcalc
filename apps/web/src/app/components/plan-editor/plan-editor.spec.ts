import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { planGeometry, rectanglePlan, type HousePlan } from '@logcalc/calc-engine';
import { appConfig } from '../../app.config';
import { PlanEditor } from './plan-editor';

const C = { cornerOverhang: 100 };
const tick = () => new Promise((r) => setTimeout(r));

interface Api {
  select(id: string): void;
  setSpan(e: Event): void;
  rename(e: Event): void;
  setType(t: 'full' | 'top' | 'height'): void;
  addOpen(): void;
  undo(): void;
  remove(): void;
}

describe('PlanEditor', () => {
  let fixture: ComponentFixture<PlanEditor>;
  let emitted: (HousePlan | null)[];
  let renamed: { from: string; to: string }[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PlanEditor], providers: [...appConfig.providers] }).compileComponents();
    fixture = TestBed.createComponent(PlanEditor);
    fixture.componentRef.setInput('thickness', 40);
    fixture.componentRef.setInput('size', { width: 4000, depth: 6000 });
    emitted = [];
    renamed = [];
    // nagu vanem: väljund -> sisend
    fixture.componentInstance.planChange.subscribe((p) => {
      emitted.push(p);
      fixture.componentRef.setInput('plan', p);
    });
    fixture.componentInstance.renamed.subscribe((r) => renamed.push(r));
    await fixture.whenStable();
  });

  const api = () => fixture.componentInstance as unknown as Api;
  const ev = (value: string | number) => ({ target: Object.assign(document.createElement('input'), { type: typeof value === 'number' ? 'number' : 'text', value: String(value) }) }) as unknown as Event;
  const last = () => emitted.at(-1)!;

  it('ilma plaanita: mallid; mall „Vaheseinaga“ loob 5 seinaga plaani praeguste mõõtudega', async () => {
    const el: HTMLElement = fixture.nativeElement;
    const cards = Array.from(el.querySelectorAll('button.card')) as HTMLButtonElement[];
    expect(cards.map((c) => c.querySelector('.card-name')?.textContent)).toContain('Vaheseinaga');
    cards.find((c) => c.textContent?.includes('Vaheseinaga'))!.click();
    await fixture.whenStable();
    expect(last()!.walls.map((w) => w.id)).toEqual(['1', '2', 'A', 'B', 'C']);
    const g = planGeometry(last()!, 40, C);
    expect(g.find((w) => w.id === '1')!.length).toBe(4000);
    expect(el.querySelectorAll('svg.canvas [data-wall]').length).toBe(5);
  });

  it('pikkuse muutmine, ümbernimetamine (uksed järgivad), ehitus, tagasivõtmine', async () => {
    fixture.componentRef.setInput('plan', rectanglePlan(4000, 6000, 40, C));
    await fixture.whenStable();
    api().select('1');
    api().setSpan(ev(3000));
    expect(planGeometry(last()!, 40, C).find((w) => w.id === '2')!.length).toBe(3240);

    api().rename(ev('c'));
    expect(last()!.walls.map((w) => w.id)).toContain('C');
    expect(renamed).toEqual([{ from: '1', to: 'C' }]);

    api().setType('top');
    expect(last()!.walls.find((w) => w.id === 'C')!.topOnly).toBe(1);
    api().addOpen();
    expect(last()!.walls.find((w) => w.id === 'C')!.open!.length).toBe(1);

    api().undo();
    api().undo();
    expect(last()!.walls.find((w) => w.id === 'C')!.topOnly).toBeUndefined();
  });

  it('kustutamine; vale tähis jääb muutmata ja annab teate', async () => {
    fixture.componentRef.setInput('plan', rectanglePlan(4000, 6000, 40, C));
    await fixture.whenStable();
    api().select('A');
    api().rename(ev('B'));
    await tick();
    expect(emitted.length).toBe(0);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.msg')?.textContent).toContain('kasutusel');
    api().remove();
    expect(last()!.walls.length).toBe(3);
  });
});
