import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'operator',
    pathMatch: 'full'
  },
  {
    path: 'operator',
    loadComponent: () =>
      import('./components/baguet/baguet.component')
        .then(m => m.BaguetComponent)
  },

    {
    path: 'supervisor',
    loadComponent: () =>
      import('./pages/supervisor/supervisor.component')
        .then(m => m.SupervisorComponent)
  },
];
