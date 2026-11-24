import type { Routes } from '@angular/router';
import { adminGuard } from './core/guards';
import { CalculatorPage } from './pages/calculator/calculator-page';

export const routes: Routes = [
  { path: '', component: CalculatorPage, title: 'LogCalc' },
  {
    path: 'kasutajad',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/users/users-page').then((m) => m.UsersPage),
    title: 'Kasutajad – LogCalc',
  },
  { path: '**', redirectTo: '' },
];
