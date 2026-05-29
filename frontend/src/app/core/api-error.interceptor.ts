import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      if (err.status === 403) {
        return auth.refreshSession().pipe(switchMap(() => throwError(() => err)));
      }

      if (err.status !== 401) {
        return throwError(() => err);
      }

      const isAuthEndpoint = /\/auth(\/|$|\?)/.test(req.url);
      const isLogout = req.method === 'DELETE' && isAuthEndpoint;

      if (isLogout || isAuthEndpoint) {
        return throwError(() => err);
      }

      return auth.refreshSession().pipe(
        switchMap((user) => {
          if (user) {
            return throwError(() => err);
          }
          auth.clearSession();
          if (router.url !== '/') {
            void router.navigateByUrl('/', { replaceUrl: true });
          }
          return throwError(() => err);
        })
      );
    })
  );
};
