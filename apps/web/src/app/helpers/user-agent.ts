/** Brauseri päis -> lühike kirjeldus, nt "Chrome 142 · Windows". Tundmatu -> "". */
export function describeUserAgent(ua: string): string {
  if (!ua) return '';
  const browser =
    match(ua, /Edg(?:e|A|iOS)?\/(\d+)/, 'Edge') ??
    match(ua, /OPR\/(\d+)/, 'Opera') ??
    match(ua, /SamsungBrowser\/(\d+)/, 'Samsung') ??
    match(ua, /Firefox\/(\d+)/, 'Firefox') ??
    match(ua, /FxiOS\/(\d+)/, 'Firefox') ??
    match(ua, /CriOS\/(\d+)/, 'Chrome') ??
    match(ua, /Chrome\/(\d+)/, 'Chrome') ??
    (/Safari\//.test(ua) ? match(ua, /Version\/(\d+)/, 'Safari') ?? 'Safari' : null) ??
    (/curl\//i.test(ua) ? 'curl' : null);
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  return [browser, os].filter(Boolean).join(' · ');
}

function match(ua: string, re: RegExp, name: string): string | null {
  const m = re.exec(ua);
  return m ? `${name} ${m[1]}` : null;
}
