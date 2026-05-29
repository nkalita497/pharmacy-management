import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { apiErrorInterceptor } from './core/api-error.interceptor';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

function initAuth(auth: AuthService) {
  return () => {
    auth.initCrossTabSync();
    return firstValueFrom(auth.loadSession());
  };
}

function initTheme(theme: ThemeService) {
  return () => {
    theme.apply(theme.theme());
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withEnabledBlockingInitialNavigation(),
      withRouterConfig({ onSameUrlNavigation: 'reload' })
    ),
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initTheme,
      deps: [ThemeService],
      multi: true
    }
  ]
};
