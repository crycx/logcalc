/**
 * Ukse avanemiskaar plaanil (SVG path): ava algus S ja lõpp E seina pinnal, n = ühikvektor seinaga risti
 * avanemise poole. Ühepoolsel uksel tiib hingest (S või E) risti seinaga + veerandkaar teise servani;
 * topeltuksel kaks poole laiusega tiiba, mis kohtuvad keskel.
 */
interface P {
  x: number;
  y: number;
}

function leaf(h: P, f: P, n: P): string {
  const w = Math.hypot(f.x - h.x, f.y - h.y);
  const l = { x: h.x + n.x * w, y: h.y + n.y * w };
  // SVG sweep = 1: positiivne nurga suund (y alla) – kaar tiivast (h→l) vaba servani (h→f)
  const cross = (l.x - h.x) * (f.y - h.y) - (l.y - h.y) * (f.x - h.x);
  return `M${h.x},${h.y} L${l.x},${l.y} A${w},${w} 0 0 ${cross > 0 ? 1 : 0} ${f.x},${f.y}`;
}

export function doorSwingPath(s: P, e: P, n: P, leaves: 1 | 2, hinge: 'start' | 'end'): string {
  if (leaves === 2) {
    const m = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
    return `${leaf(s, m, n)} ${leaf(e, m, n)}`;
  }
  return hinge === 'end' ? leaf(e, s, n) : leaf(s, e, n);
}
