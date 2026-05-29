import { HttpErrorResponse } from '@angular/common/http';
import { I18nService } from '../services/i18n.service';

export function apiErrorMessage(err: unknown, fallback: string, i18n?: I18nService): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return i18n?.t('error.apiOffline') ?? fallback;
    }
    if (err.status === 401) {
      return i18n?.t('error.sessionExpired') ?? fallback;
    }
    if (err.status === 403) {
      return i18n?.t('error.forbidden') ?? fallback;
    }
    const body = err.error as { error?: string; message?: string } | null;
    return body?.error || body?.message || fallback;
  }
  return fallback;
}
