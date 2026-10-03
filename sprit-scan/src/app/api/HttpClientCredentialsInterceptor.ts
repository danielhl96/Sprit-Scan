import { HttpHandlerFn, HttpRequest } from '@angular/common/http';

export function credentialsInterceptor(req: HttpRequest<any>, next: HttpHandlerFn) {
  return next(
    req.clone({
      withCredentials: true,
    }),
  );
}
