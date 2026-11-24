/**
 * Palkide lõikamine katusejoone järgi (3D vaade ja seinajoonis): katusejoon = mootori `Wall3D.roofLine`
 * (seina koordinaadid X, Z). Viilupalgid ja viilu täisrea otsad nurkades lõigatakse kaldu.
 */

/** Katuse kõrgus seina kohal X (lineaarne murdjoon, otstes konstantne) */
export function roofAtFn(line: [number, number][]): (X: number) => number {
  return (X) => {
    if (X <= line[0]![0]) return line[0]![1];
    for (let i = 1; i < line.length; i++) {
      const [x1, z1] = line[i]!;
      const [x0, z0] = line[i - 1]!;
      if (X <= x1) return x1 - x0 < 1e-6 ? z1 : z0 + ((X - x0) / (x1 - x0)) * (z1 - z0);
    }
    return line[line.length - 1]![1];
  };
}

/**
 * Palgi ristkülik [x0,x1]×[y0,y1] katusejoone all (z ≤ katus(x)): hulknurk (alumine serv, siis ülemine
 * murdjoon paremalt vasakule) või null, kui katus palki ei lõika, 'none', kui palk on täielikult katuse kohal.
 * Murdepunktid: palgi otsad, katusejoone tipud ning kohad, kus katus lõikab palgi alumist/ülemist serva.
 */
export function underRoof(
  p: { x0: number; x1: number; y0: number; y1: number },
  line: [number, number][],
  roofAt: (x: number) => number = roofAtFn(line),
): [number, number][] | null | 'none' {
  const xs = new Set<number>([p.x0, p.x1]);
  for (const [x] of line) if (x > p.x0 && x < p.x1) xs.add(x);
  for (let i = 1; i < line.length; i++) {
    const [xa, za] = line[i - 1]!;
    const [xb, zb] = line[i]!;
    if (Math.abs(zb - za) < 1e-9) continue;
    for (const lvl of [p.y0, p.y1]) {
      const f = (lvl - za) / (zb - za);
      if (f > 0 && f < 1) {
        const x = xa + f * (xb - xa);
        if (x > p.x0 && x < p.x1) xs.add(x);
      }
    }
  }
  const pts = [...xs].sort((a, b) => a - b).map((x) => [x, roofAt(x)] as const);
  if (pts.every(([, z]) => z >= p.y1 - 0.5)) return null;
  const inside = pts.filter(([, z]) => z >= p.y0 - 0.5);
  if (inside.length < 2 || inside[inside.length - 1]![0] - inside[0]![0] < 1) return 'none';
  const xa = inside[0]![0];
  const xb = inside[inside.length - 1]![0];
  const top = inside.map(([x, z]) => [x, Math.min(p.y1, Math.max(p.y0, z))] as [number, number]).reverse();
  return [[xa, p.y0], [xb, p.y0], ...top];
}
