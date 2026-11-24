import type { Routes } from '@angular/router';
import { CalculatorPage } from './pages/calculator/calculator-page';

export const routes: Routes = [
  { path: '', component: CalculatorPage, title: 'LogCalc' },
  { path: '**', redirectTo: '' },
];
