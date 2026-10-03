import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export function errorInterceptor(req: HttpRequest<any>, next: HttpHandlerFn) {
  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        // Handle unauthorized error (e.g., redirect to login)
        console.error('Unauthorized request. Redirecting to login.');
        return throwError(() => new Error('Unauthorized request. Redirecting to login.'));
      } else if (error.status === 403) {
        // Handle forbidden error (e.g., show access denied message)
        console.error('Access denied. You do not have permission to access this resource.');
        return throwError(
          () => new Error('Access denied. You do not have permission to access this resource.'),
        );
      } else if (error.status === 409) {
        // Handle conflict error (e.g., duplicate resource)
        console.error('Conflict error:', error);
        return throwError(() => new Error('The User already exists.'));
      }
      return throwError(() => new Error('An error occurred.'));
    }),
  );
}
