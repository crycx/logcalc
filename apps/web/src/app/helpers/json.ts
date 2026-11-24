/**
 * JSON võtmete järjekorrast sõltumatu stringiks teisendus (võrdlemiseks).
 * {b:1,a:2} ja {a:2,b:1} annavad sama tulemuse.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}
