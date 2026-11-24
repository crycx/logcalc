/**
 * localStorage abi. Privaatses aknas või blokeeritud salvestuse korral ei viska erindit –
 * salvestamine on ainult mugavus, mitte kriitiline.
 */
export function storageGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* privaatne aken vms */
  }
}
