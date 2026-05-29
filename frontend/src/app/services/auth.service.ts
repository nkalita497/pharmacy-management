import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, shareReplay, finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, UserRole } from '../core/models';

export type LoginResult = User | { requiresMfa: true; username: string };

const SESSION_BROADCAST_KEY = 'pharma-session-ts';

function toUser(raw: LoginResult | User | null | undefined): User | null {
  if (!raw || typeof raw !== 'object') return null;
  if ('requiresMfa' in raw && raw.requiresMfa) return null;
  if ('role' in raw && raw.id != null && raw.username && raw.role) {
    return { id: raw.id, username: raw.username, role: raw.role as UserRole };
  }
  return null;
}

function usersEqual(a: User | null, b: User | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.role === b.role && a.username === b.username;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<User | null>(null);
  private sessionLoad$: Observable<User | null> | null = null;
  private crossTabSyncReady = false;

  /** Increments when session identity or role changes (other tab login, focus refresh, WS mismatch). */
  readonly sessionRevision = signal(0);

  readonly user = this.userSignal.asReadonly();
  readonly sessionReady = signal(false);
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  readonly role = computed(() => this.userSignal()?.role ?? null);

  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');
  readonly canManageMedicines = computed(() => this.hasRole('admin', 'pharmacist'));
  readonly canDeleteMedicines = computed(() => this.hasRole('admin'));
  readonly canRealizePrescriptions = computed(() => this.hasRole('admin', 'pharmacist'));
  readonly canDownloadSalesReport = computed(() => this.hasRole('admin', 'pharmacist'));
  readonly canEditSales = computed(() => this.hasRole('admin'));
  readonly canManagePatients = computed(() => this.hasRole('admin', 'pharmacist'));
  readonly canManageSuppliers = computed(() => this.hasRole('admin', 'pharmacist'));
  readonly canManagePrescriptions = computed(() => this.hasRole('admin', 'pharmacist'));
  readonly canCreateDeliveries = computed(() => this.hasRole('admin', 'pharmacist'));
  readonly canEditDeliveries = computed(() => this.hasRole('admin'));
  readonly canAccessAudit = computed(() => this.hasRole('admin', 'pharmacist'));

  private readonly authChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pharma-auth') : null;

  constructor(private http: HttpClient, private router: Router) {}

  initCrossTabSync(): void {
    if (this.crossTabSyncReady || typeof window === 'undefined') return;
    this.crossTabSyncReady = true;

    this.authChannel?.addEventListener('message', () => this.refreshSession().subscribe());

    window.addEventListener('storage', (ev) => {
      if (ev.key === SESSION_BROADCAST_KEY) {
        this.refreshSession().subscribe();
      }
    });

    window.addEventListener('focus', () => this.refreshSession().subscribe());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refreshSession().subscribe();
      }
    });
  }

  loadSession(): Observable<User | null> {
    if (!this.sessionLoad$) {
      this.sessionLoad$ = this.fetchSession().pipe(
        tap((user) => this.applySessionUser(user, false)),
        finalize(() => {
          this.sessionReady.set(true);
          this.sessionLoad$ = null;
        }),
        shareReplay(1)
      );
    }
    return this.sessionLoad$;
  }

  refreshSession(): Observable<User | null> {
    return this.fetchSession().pipe(
      tap((user) => this.applySessionUser(user, true))
    );
  }

  ensureSession(): Observable<User | null> {
    if (this.sessionReady()) {
      return of(this.userSignal());
    }
    return this.loadSession();
  }

  syncSessionAfterAuth(): Observable<User | null> {
    this.sessionReady.set(false);
    this.sessionLoad$ = null;
    return this.loadSession().pipe(tap(() => this.broadcastSessionChange()));
  }

  clearSession(resetReady = true): void {
    const hadUser = this.userSignal() !== null;
    this.userSignal.set(null);
    if (resetReady) {
      this.sessionReady.set(false);
      this.sessionLoad$ = null;
    }
    if (hadUser) {
      this.sessionRevision.update((n) => n + 1);
    }
  }

  login(
    username: string,
    password: string,
    captchaId?: string,
    captchaText?: string
  ): Observable<LoginResult> {
    return this.http
      .post<LoginResult>(`${environment.apiUrl}/auth`, {
        username,
        password,
        captchaId,
        captchaText
      })
      .pipe(tap((res) => this.applyUserFromAuthResponse(res)));
  }

  verifyMfa(code: string): Observable<User> {
    return this.http
      .post<User>(`${environment.apiUrl}/auth/mfa/verify`, { code })
      .pipe(tap((user) => {
        this.applySessionUser(toUser(user), true);
        this.broadcastSessionChange();
      }));
  }

  logout(): Observable<{ message: string } | null> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/auth`).pipe(
      catchError(() => of(null)),
      tap(() => {
        this.clearSession();
        this.broadcastSessionChange();
        void this.router.navigateByUrl('/', { replaceUrl: true });
      })
    );
  }

  isMfaRequired(res: LoginResult): res is { requiresMfa: true; username: string } {
    return 'requiresMfa' in res && !!res.requiresMfa;
  }

  canAccessRoute(path: string): boolean {
    if (path === '/audit') return this.canAccessAudit();
    return true;
  }

  matchesSession(profile: { id?: number; username?: string; role?: string }): boolean {
    const current = this.userSignal();
    if (!current || profile.id == null || !profile.role) return false;
    return current.id === profile.id && current.role === profile.role;
  }

  private fetchSession(): Observable<User | null> {
    return this.http.get<User | null>(`${environment.apiUrl}/auth`).pipe(
      catchError(() => of(null))
    );
  }

  private applySessionUser(user: User | null, allowRedirect: boolean): void {
    const prev = this.userSignal();
    this.userSignal.set(user);
    this.sessionReady.set(true);

    if (!usersEqual(prev, user)) {
      this.sessionRevision.update((n) => n + 1);
    }

    if (allowRedirect && prev && !user && this.router.url !== '/') {
      void this.router.navigateByUrl('/', { replaceUrl: true });
    }
  }

  private applyUserFromAuthResponse(res: LoginResult): void {
    const user = toUser(res);
    if (user) {
      this.applySessionUser(user, false);
      this.broadcastSessionChange();
    }
  }

  private broadcastSessionChange(): void {
    try {
      localStorage.setItem(SESSION_BROADCAST_KEY, String(Date.now()));
    } catch {
      /* private mode / storage blocked */
    }
    this.authChannel?.postMessage('session-changed');
  }

  private hasRole(...roles: UserRole[]): boolean {
    const r = this.userSignal()?.role;
    return r != null && roles.includes(r);
  }
}
