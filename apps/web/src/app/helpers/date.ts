/** Serveri UTC aeg "YYYY-MM-DD HH:MM:SS" -> Date */
export function serverDate(s: string): Date {
  return new Date(s.replace(' ', 'T') + 'Z');
}
