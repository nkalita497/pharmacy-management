import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { switchMap, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { ThemeService } from '../services/theme.service';
import { I18nService, Locale, SUPPORTED_LOCALES } from '../services/i18n.service';
import { PharmaBrandComponent } from '../shared/pharma-brand.component';
import { NavIconComponent } from '../shared/nav-icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, PharmaBrandComponent, NavIconComponent],
  template: `
    <div class="min-h-dvh overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-lab-white dark:bg-[#000000] transition-colors duration-500">

      <div class="w-full max-w-5xl flex flex-col border-8 border-[#0a0a0a] dark:border-[#333333]
                  rounded-3xl shadow-[12px_12px_0px_0px_#0a0a0a] dark:shadow-none
                  bg-white dark:bg-[#1a1a1a] my-4">

        <div class="flex items-center justify-between px-6 py-4 border-b-4 border-[#0a0a0a] dark:border-[#333333] bg-[#f8f8f8] dark:bg-[#111111]">
          <div class="flex gap-2">
            <div class="w-3 h-3 rounded-full bg-red-500 border border-[#0a0a0a]"></div>
            <div class="w-3 h-3 rounded-full bg-yellow-400 border border-[#0a0a0a]"></div>
            <div class="w-3 h-3 rounded-full bg-green-500 border border-[#0a0a0a]"></div>
          </div>
          <select
            [ngModel]="i18n.locale()"
            (ngModelChange)="setLocale($event)"
            class="border-2 border-[#0a0a0a] dark:border-[#333333] bg-white dark:bg-[#0a0a0a] px-2 py-1 font-black uppercase text-[10px] cursor-pointer"
          >
            @for (loc of locales; track loc) {
              <option [value]="loc">{{ i18n.t('lang.' + loc) }}</option>
            }
          </select>
        </div>

        <div class="flex flex-col md:flex-row flex-1">
          <div class="md:w-5/12 p-10 bg-neon-green flex flex-col justify-between border-b-8 md:border-b-0 md:border-r-8 border-[#0a0a0a] dark:border-[#333333]">
            <app-pharma-brand [hero]="true" />
            <p class="mt-8 text-xs font-black uppercase opacity-70 max-w-[16rem] leading-relaxed">
              {{ i18n.t('login.tagline') }}
            </p>
          </div>

          <div class="md:w-7/12 p-8 md:p-12 flex flex-col justify-center">
            <form (ngSubmit)="onSubmit()" class="space-y-5 w-full max-w-md mx-auto">
              <h2 class="text-2xl font-black uppercase tracking-tight border-b-4 border-[#0a0a0a] dark:border-neon-green/50 pb-3">
                {{ mfaStep ? i18n.t('login.mfa') : i18n.t('login.auth') }}
              </h2>

              @if (!mfaStep) {
                <input type="text" [(ngModel)]="username" name="username" required autocomplete="username" class="ph-input" [placeholder]="i18n.t('login.username')" />
                <input type="password" [(ngModel)]="password" name="password" required autocomplete="current-password" class="ph-input" [placeholder]="i18n.t('login.password')" />

                @if (captchaEnabled) {
                  <div class="flex flex-col sm:flex-row gap-3">
                    <div class="ph-captcha-box flex items-center justify-center bg-white dark:bg-[#0a0a0a] border-4 border-[#0a0a0a] dark:border-[#333333]" [innerHTML]="captchaSvg"></div>
                    <input [(ngModel)]="captchaText" name="captcha" required class="ph-input flex-1" [placeholder]="i18n.t('login.captcha')" />
                  </div>
                }
              } @else {
                <input [(ngModel)]="mfaCode" name="mfa" required class="ph-input text-center text-xl tracking-[0.35em]" [placeholder]="i18n.t('login.mfaCode')" />
              }

              @if (errorMessage) {
                <div class="flex items-start gap-2 bg-[#0a0a0a] text-neon-green font-black p-3 uppercase text-xs rounded-sm">
                  <app-nav-icon name="alert" [size]="16" class="shrink-0 mt-0.5" />
                  <span>{{ errorMessage }}</span>
                </div>
              }

              <button type="submit" [disabled]="isLoading" class="w-full ph-btn-primary py-4 text-sm font-black uppercase tracking-wide">
                {{ isLoading ? i18n.t('login.loading') : (mfaStep ? i18n.t('login.submitMfa') : i18n.t('login.submit')) }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  readonly locales = SUPPORTED_LOCALES;
  username = '';
  password = '';
  captchaText = '';
  captchaId = '';
  captchaEnabled = false;
  captchaSvg: SafeHtml = '';
  captchaLoadError = '';
  mfaStep = false;
  mfaCode = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private theme: ThemeService,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadCaptcha();
  }

  setLocale(loc: Locale): void {
    this.i18n.setLocale(loc, false);
  }

  loadCaptcha(): void {
    this.captchaLoadError = '';
    this.api.getCaptcha().subscribe({
      next: (c) => {
        this.captchaEnabled = c.enabled;
        this.captchaId = c.captchaId;
        this.captchaText = '';
        if (c.svg) {
          this.captchaSvg = this.sanitizer.bypassSecurityTrustHtml(c.svg);
        }
      },
      error: () => {
        this.captchaEnabled = false;
        this.captchaLoadError = this.i18n.t('login.captchaLoadError');
      }
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.isLoading = true;

    if (this.mfaStep) {
      this.auth
        .verifyMfa(this.mfaCode)
        .pipe(switchMap(() => this.auth.syncSessionAfterAuth()))
        .subscribe({
          next: (user) => {
            this.isLoading = false;
            if (user) {
              void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
            } else {
              this.errorMessage = this.i18n.t('login.failed');
            }
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err.error?.error || this.i18n.t('login.mfaError');
          }
        });
      return;
    }

    this.auth
      .login(this.username, this.password, this.captchaId, this.captchaText)
      .pipe(
        switchMap((res) => {
          if (this.auth.isMfaRequired(res)) {
            return of(res);
          }
          return this.auth.syncSessionAfterAuth().pipe(switchMap((user) => (user ? of(res) : of(null))));
        })
      )
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (!res) {
            this.errorMessage = this.i18n.t('login.failed');
            return;
          }
          if (this.auth.isMfaRequired(res)) {
            this.mfaStep = true;
            return;
          }
          void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage =
            err.status === 0
              ? this.i18n.t('login.apiError')
              : err.error?.error || err.error?.message || this.i18n.t('login.failed');
          if (this.captchaEnabled) this.loadCaptcha();
        }
      });
  }
}
