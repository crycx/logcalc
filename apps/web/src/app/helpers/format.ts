/** Tükid kujul "9 × 2750 mm + 2 × 2800 mm" */
export function formatPieces(p: readonly { count: number; length: number }[] | undefined): string {
  if (!p?.length) return '';
  return p.map((x) => `${x.count} × ${Math.round(x.length)} mm`).join(' + ');
}
