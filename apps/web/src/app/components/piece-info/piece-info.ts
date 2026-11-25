import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DETAIL, type CalcResult, type EndCut, type HouseModel3D } from '@logcalc/calc-engine';

interface Fact {
  k: string;
  v: string;
}

interface Info {
  title: string;
  facts: Fact[];
  cuts: string[];
}

const KIND: Record<string, string> = {
  half: 'Pool palki (alumine rida)',
  log: 'Seinapalk',
  top: 'Ülemine palk / kate',
  gable: 'Viilupalk',
};

const END: Record<EndCut, string> = {
  log: `nurgaliite ots, nurgad faasitud ${DETAIL.endChamfer} mm`,
  ext: `pikendatud ots: ${DETAIL.extVertical} mm püsti + 45°`,
  plain: 'sirge (jätk / vahesein / ava)',
};

const nf = new Intl.NumberFormat('et-EE', { maximumFractionDigits: 1 });
const mm = (v: number) => `${nf.format(Math.round(v))} mm`;

/**
 * Valitud tähise info (lõikenimekiri + mudel): liik, sein, kogus, pikkus, profiil, kõrgused, otsalõiked, sälgud ja
 * pilud. Seinapalgid tulevad lõikenimekirjast, muu puit materjalide lõikenimekirjast.
 */
@Component({
  selector: 'app-piece-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './piece-info.html',
  styleUrl: './piece-info.scss',
})
export class PieceInfo {
  readonly mark = input.required<string>();
  readonly result = input.required<CalcResult>();
  readonly model = input<HouseModel3D | null>(null);
  /** detailijoonise nupp (vaade Detailid) */
  readonly showDetails = input(true);
  readonly clear = output<void>();
  readonly details = output<void>();

  protected readonly info = computed<Info | null>(() => this.wallInfo() ?? this.materialInfo());

  private wallInfo(): Info | null {
    const mark = this.mark();
    const r = this.result();
    const hits = r.cutList.flatMap((w) => w.pieces.filter((p) => p.mark === mark).map((p) => ({ wall: w.wall, p })));
    if (!hits.length) return null;
    const cp = hits[0]!.p;
    const count = hits.reduce((s, h) => s + h.p.count, 0);
    const walls = [...new Set(hits.map((h) => h.wall))];
    const facts: Fact[] = [
      { k: walls.length > 1 ? 'Seinad' : 'Sein', v: walls.join(', ') },
      { k: 'Kogus', v: `${count} tk` },
      { k: 'Pikkus', v: mm(cp.length) },
      { k: 'Profiil', v: cp.profile },
      { k: 'Kokku', v: `${nf.format((count * cp.length) / 1000)} jm` },
    ];
    const cuts: string[] = [];
    const w = this.model()?.walls.find((x) => x.marks.includes(mark));
    if (w) {
      const idx = w.marks.flatMap((x, i) => (x === mark ? [i] : []));
      const i = idx[0]!;
      const p = w.pieces[i]!;
      const det = w.details[i];
      const heights = [...new Set(idx.map((j) => Math.round(w.pieces[j]!.y0)))].sort((a, b) => a - b);
      facts.push({
        k: heights.length > 1 ? 'Kõrgused (alt)' : 'Kõrgus (alt)',
        v: `${heights.slice(0, 8).map((h) => nf.format(h)).join(' · ')}${heights.length > 8 ? ' …' : ''} mm`,
      });
      if (det) {
        if (p.kind === 'gable') cuts.push('Otsad kaldu katusejoone järgi');
        else if (det.start === det.end) cuts.push(`Otsad: ${END[det.start]}`);
        else cuts.push(`Algus: ${END[det.start]} · lõpp: ${END[det.end]}`);
        const corner = det.notches.filter((n) => n.kind === 'corner');
        const top = corner.filter((n) => n.side === 'top').length;
        const bottom = corner.filter((n) => n.side === 'bottom').length;
        if (corner.length) {
          const parts = [top ? `${top} peal` : '', bottom ? `${bottom} all` : ''].filter(Boolean).join(', ');
          const n0 = corner[0]!;
          cuts.push(`Nurgaliite sälgud: ${parts} (${nf.format(n0.w)} × ${nf.format(n0.depth)} mm)`);
        }
        for (const d of det.notches.filter((n) => n.kind === 'door')) cuts.push(`Ukse vajumisvaru: alt ${nf.format(d.depth)} mm, ${mm(d.w)} laiuselt`);
        if (det.slots.length) cuts.push(`Pärlinite pilud: ${det.slots.length} (pealt, pärlini kohal)`);
        if (!det.notches.length && !det.slots.length && p.kind !== 'gable') cuts.push('Sälke pole');
      }
    }
    return { title: KIND[cp.kind] ?? 'Palk', facts, cuts };
  }

  private materialInfo(): Info | null {
    const mark = this.mark();
    for (const g of this.result().materials) {
      const row = g.rows.find((x) => x.mark === mark);
      if (!row) continue;
      const facts: Fact[] = [
        { k: 'Profiil', v: g.profile },
        { k: 'Kogus', v: `${row.count} tk` },
        { k: 'Pikkus', v: mm(row.length) },
      ];
      if (row.cut) facts.push({ k: 'Lõigata', v: mm(row.cut) });
      facts.push({ k: 'Kokku', v: `${nf.format((row.count * row.length) / 1000)} jm` });
      const cuts: string[] = [];
      const d = this.model()?.members.find((x) => x.mark === mark && x.detail)?.detail;
      if (d) {
        if (d.notches.length) cuts.push(`Alt sälgud viiluseinte kohal: ${d.notches.length} (${nf.format(d.notches[0]!.w)} × ${nf.format(d.notches[0]!.depth)} mm)`);
        if (d.cut > 0) cuts.push(`Otsad: alumine nurk 45° (ülevalt ${DETAIL.extVertical} mm püsti)`);
        if (d.pointedSide) cuts.push('Harjapärlin: pealt terav (katuse kalde järgi)');
      }
      return { title: g.label, facts, cuts };
    }
    return null;
  }
}
