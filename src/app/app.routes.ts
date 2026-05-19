import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'baguet',
    pathMatch: 'full'
  },
  {
    path: 'baguet',
    loadComponent: () =>
      import('./components/baguet/baguet.component')
        .then(m => m.BaguetComponent)
  },
   {
    path: 'scan',
    loadComponent: () =>
      import('./components/baguet/scann-code/scann-code.component')
        .then(m => m.ScannCodeComponent)
  }
];
