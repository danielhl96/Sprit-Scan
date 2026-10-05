import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { LoginFeatureService } from '../features/login/login-feature.service';
export const authGuard: CanActivateFn = () => {
  const auth = inject(LoginFeatureService);
  const router = inject(Router);

  return auth.authenticate().pipe(
    map(() => true),
    catchError(() => {
      console.log('User not authenticated, redirecting to login');
      return of(router.createUrlTree(['/login']));
    }),
  );
};
