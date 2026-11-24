import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Session } from './api';

/** Ainult admin/superadmin; teised suunatakse kalkulaatorisse. */
export const adminGuard: CanActivateFn = async () => {
  // inject() ainult enne await-i (süstimise kontekst)
  const session = inject(Session);
  const router = inject(Router);
  await session.init();
  return session.isAdmin() ? true : router.createUrlTree(['/']);
};
