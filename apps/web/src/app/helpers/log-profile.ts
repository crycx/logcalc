/** Palgi ristlõige (Revit „Log Profile“) – 3D ja detailijoonis. */
/**
 * Palgi ristlõige (a, z): a = risti seinaga (−t/2 … t/2), z = kõrgus. Revit 40x114: kaks punni peal ja kaks soont
 * all (laius ~12 % paksusest, kõrgus ≤ 10 mm, keskkohad ±20 % paksusest), servad faasitud 45° (~4,5 mm).
 * `top` = kaldlõikega ülemine serv (räästa palk) – siis punne pole.
 */
export function logProfile(
  t: number,
  y0: number,
  y1: number,
  o: { grooves: boolean; tongues: boolean; top?: (a: number) => number },
): [number, number][] {
  const h = y1 - y0;
  // faas 45°: Revit „Log Profile“ 40x114 mõõdetud ~4,5 × 4,5 mm (≈ 11 % paksusest)
  const cx = Math.min(4.5, t * 0.11, h * 0.05);
  const cz = cx;
  const tw = Math.max(3, t * 0.12);
  const th = Math.min(10, h * 0.09);
  const g = [-t * 0.2, t * 0.2];
  const pts: [number, number][] = [[-t / 2, y0 + cz], [-t / 2 + cx, y0]];
  if (o.grooves) for (const x of g) pts.push([x - tw / 2, y0], [x - tw / 2, y0 + th], [x + tw / 2, y0 + th], [x + tw / 2, y0]);
  pts.push([t / 2 - cx, y0], [t / 2, y0 + cz]);
  if (o.top) {
    pts.push([t / 2, o.top(t / 2)], [-t / 2, o.top(-t / 2)]);
    return pts;
  }
  pts.push([t / 2, y1 - cz], [t / 2 - cx, y1]);
  if (o.tongues) for (const x of [...g].reverse()) pts.push([x + tw / 2, y1], [x + tw / 2, y1 + th], [x - tw / 2, y1 + th], [x - tw / 2, y1]);
  pts.push([-t / 2 + cx, y1], [-t / 2, y1 - cz]);
  return pts;
}

