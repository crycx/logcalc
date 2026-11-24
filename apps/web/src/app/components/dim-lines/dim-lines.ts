import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Mõõt joonisel: mõõdetakse punktist (x1,y1) punktini (x2,y2).
 * offset = kaugus objektist risti mõõdetava suunaga (märk määrab poole: + = suuna "paremal" pool,
 * horisontaalsel vasakult paremale mõõdul = allapoole, vertikaalsel alt üles mõõdul = vasakule).
 */
export interface Dim {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  offset: number;
  /** Tekst; vaikimisi pikkus mm */
  text?: string;
  /** Kui lõik on tekstist lühem, nihuta tekst lõigu algusest/lõpust välja */
  shift?: 'start' | 'end';
  /** Abijoone alguspunkt objektil, kui see erineb mõõdetavast punktist (nt hari keskel) */
  from1?: [number, number];
  from2?: [number, number];
}

interface DrawnDim {
  ext1: [number, number, number, number];
  ext2: [number, number, number, number];
  line: [number, number, number, number];
  tick1: [number, number, number, number];
  tick2: [number, number, number, number];
  tx: number;
  ty: number;
  angle: number;
  text: string;
  value: number | null;
}

/**
 * Insenerimõõtjooned:  |/----- 2 950 -----/|
 * Abijooned objektist üle mõõtjoone, kaldkriipsud otstes, tekst joone kohal.
 * Kasutus SVG sees: <g lcDims [dims]="..." [fs]="..."></g>
 */
@Component({
  selector: 'g[lcDims]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  templateUrl: './dim-lines.html',
  styleUrl: './dim-lines.scss',
})
export class DimLines {
  readonly dims = input.required<Dim[]>();
  /** Teksti suurus joonise ühikutes (mm) */
  readonly fs = input.required<number>();

  protected readonly drawn = computed<DrawnDim[]>(() => {
    const fs = this.fs();
    const gap = fs * 0.25; // abijoone vahe objektist
    const over = fs * 0.35; // abijoon üle mõõtjoone
    const tick = fs * 0.32; // kaldkriipsu pool-pikkus
    return this.dims()
      .map((d) => {
        const dx = d.x2 - d.x1;
        const dy = d.y2 - d.y1;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) return null;
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;
        const s = Math.sign(d.offset) || 1;
        // mõõtjoone otspunktid (abijoonte ja mõõtjoone ristumiskohad)
        const ax = d.x1 + nx * d.offset;
        const ay = d.y1 + ny * d.offset;
        const bx = d.x2 + nx * d.offset;
        const by = d.y2 + ny * d.offset;
        // kaldkriips 45°, keskpunkt täpselt ristumiskohas -> läheb joontest läbi
        const kx = (ux - nx) * tick * Math.SQRT1_2;
        const ky = (uy - ny) * tick * Math.SQRT1_2;
        // tekst joone kohal; vertikaalsel loetav alt üles (-90°)
        let angle = (Math.atan2(uy, ux) * 180) / Math.PI;
        if (angle >= 90) angle -= 180;
        if (angle < -90) angle += 180;
        const rad = (angle * Math.PI) / 180;
        const upx = Math.sin(rad);
        const upy = -Math.cos(rad);
        const along = d.shift === 'start' ? -(len / 2 + fs * 1.5) : d.shift === 'end' ? len / 2 + fs * 1.5 : 0;
        const lift = fs * 0.22;
        const ext = (f: [number, number], px: number, py: number): [number, number, number, number] => {
          const vx = px - f[0];
          const vy = py - f[1];
          const vl = Math.hypot(vx, vy) || 1;
          return [f[0] + (vx / vl) * gap, f[1] + (vy / vl) * gap, px + (vx / vl) * over, py + (vy / vl) * over];
        };
        return {
          ext1: ext(d.from1 ?? [d.x1, d.y1], ax, ay),
          ext2: ext(d.from2 ?? [d.x2, d.y2], bx, by),
          line: [ax - ux * over, ay - uy * over, bx + ux * over, by + uy * over],
          tick1: [ax - kx, ay - ky, ax + kx, ay + ky],
          tick2: [bx - kx, by - ky, bx + kx, by + ky],
          tx: (ax + bx) / 2 + ux * along + upx * lift,
          ty: (ay + by) / 2 + uy * along + upy * lift,
          angle,
          text: d.text ?? '',
          value: d.text === undefined ? len : null,
        };
      })
      .filter((x): x is DrawnDim => x !== null);
  });
}
