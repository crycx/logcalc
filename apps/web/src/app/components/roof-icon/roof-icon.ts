import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RoofType } from '@logcalc/calc-engine';

/** Väike ikoon, mis näitab katuse kallet: viilkatus (^) või ühekalle (/). */
@Component({
  selector: 'app-roof-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './roof-icon.html',
  styleUrl: './roof-icon.scss',
  host: {
    role: 'img',
    '[attr.aria-label]': "roofType() === 'mono' ? 'Ühekaldeline katus' : 'Viilkatus'",
    '[style.--roof-icon-size.px]': 'size()',
  },
})
export class RoofIcon {
  readonly roofType = input.required<RoofType | null | undefined>();
  /** Ikooni suurus pikslites */
  readonly size = input(24);
}
