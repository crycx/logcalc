import type { AuthEventType, Role } from '../core/api';

/** Sündmuse tüübi nimi ja ikoon (Material Symbols) */
export const AUTH_EVENT_INFO: Record<AuthEventType, { label: string; icon: string; tone: 'ok' | 'warn' | 'bad' | 'info' }> = {
  login: { label: 'Sisselogimine', icon: 'login', tone: 'ok' },
  login_failed: { label: 'Ebaõnnestunud sisselogimine', icon: 'error', tone: 'warn' },
  login_blocked: { label: 'Blokeeritud', icon: 'block', tone: 'bad' },
  logout: { label: 'Väljalogimine', icon: 'logout', tone: 'info' },
  password_changed: { label: 'Parool muudetud', icon: 'key', tone: 'info' },
  password_reset: { label: 'Parool lähtestatud', icon: 'lock_reset', tone: 'info' },
  user_created: { label: 'Kasutaja loodud', icon: 'person_add', tone: 'info' },
  user_updated: { label: 'Kasutaja muudetud', icon: 'manage_accounts', tone: 'info' },
};

export const ROLE_LABELS: Record<Role, string> = {
  user: 'Kasutaja',
  admin: 'Admin',
  superadmin: 'Superadmin',
};
