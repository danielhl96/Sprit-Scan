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
    path: 'profile',
    loadComponent: () =>
      import('../features/profile/profile-feature').then((m) => m.ProfileFeature),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('../features/history/history-feature').then((m) => m.HistoryFeature),
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
