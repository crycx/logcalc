/** Juhuslik parool (ilma sarnaste märkideta: 0/O, 1/l/I), vaikimisi 14 märki. */
export function generatePassword(length = 14): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const out: string[] = [];
  const buf = new Uint32Array(1);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    // tagasilükkamine, et jaotus oleks ühtlane
    const v = buf[0]!;
    if (v >= Math.floor(0x1_0000_0000 / chars.length) * chars.length) continue;
    out.push(chars[v % chars.length]!);
  }
  return out.join('');
}
