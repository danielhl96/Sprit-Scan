import { Routes } from '@angular/router';
import { authGuard } from '../guards/AuthGuard';

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
    canActivate: [authGuard],
    path: 'home',
    loadComponent: () => import('../features/home/home-feature').then((m) => m.HomeFeature),
  },
  {
    canActivate: [authGuard],
    path: 'profile',
    loadComponent: () =>
      import('../features/profile/profile-feature').then((m) => m.ProfileFeature),
  },
  {
    canActivate: [authGuard],
    path: 'history',
    loadComponent: () =>
      import('../features/history/history-feature').then((m) => m.HistoryFeature),
  },
  {
    canActivate: [authGuard],
    path: 'ai-expert',
    loadComponent: () =>
      import('../features/ai-expert/ai-expert-feature').then((m) => m.AiExpertFeature),
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
