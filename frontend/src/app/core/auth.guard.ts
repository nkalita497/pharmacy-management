import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureSession().pipe(map((user) => (user ? true : router.createUrlTree(['/']))));
};

export const auditGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureSession()
    .pipe(map(() => (auth.canAccessAudit() ? true : router.createUrlTree(['/dashboard']))));
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth
    .ensureSession()
    .pipe(map((user) => (user ? router.createUrlTree(['/dashboard']) : true)));
};
