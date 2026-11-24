import { HttpErrorResponse } from '@angular/common/http';

/** Serveri veateade kasutajale näitamiseks. */
export function apiError(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Serveriga ei saa ühendust.';
    const msg = (e.error as { error?: unknown } | null)?.error;
    return typeof msg === 'string' ? msg : `Viga (${e.status}).`;
  }
  return 'Tundmatu viga.';
}
