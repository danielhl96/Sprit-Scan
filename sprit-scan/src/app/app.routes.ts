import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../features/login/login-feature').then((m) => m.LoginFeature),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('../features/register/register-feature').then((m) => m.RegisterFeature),
  },

  {
    path: 'home',
    loadComponent: () => import('../features/home/home-feature').then((m) => m.HomeFeature),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
