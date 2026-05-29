import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ThemeService, ThemeMode } from '../../services/theme.service';
import { I18nService, Locale, SUPPORTED_LOCALES } from '../../services/i18n.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="i18n.t('settings.title')" [subtitle]="i18n.t('settings.subtitle')"></app-page-header>

    <div class="ph-page-body max-w-3xl space-y-8">

      <!-- KOMUNIKATY (ALERTY) -->
      @if (message()) {
        <div class="p-4 font-black bg-acid-lime dark:bg-neon-green text-deep-navy border-4 border-deep-navy shadow-[4px_4px_0_0_#0f172a] uppercase text-sm tracking-wide">
          {{ message() }}
        </div>
      }

      <!-- MOTYW -->
      <section class="ph-card bg-white dark:bg-slate-900 p-6 sm:p-8 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)]">
        <h2 class="font-black uppercase mb-6 pb-2 border-b-4 border-deep-navy dark:border-neon-green/60 text-xl text-deep-navy dark:text-lab-white tracking-wide">
          {{ i18n.t('settings.theme') }}
        </h2>
        <div class="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            (click)="setTheme('light')"
            class="flex-1 border-2 border-deep-navy dark:border-neon-green py-4 font-black uppercase tracking-widest shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] hover:-translate-y-1 transition-all"
            [class.bg-acid-lime]="theme.theme() === 'light'"
            [class.text-deep-navy]="theme.theme() === 'light'"
            [class.bg-white]="theme.theme() !== 'light'"
            [class.dark:bg-slate-800]="theme.theme() !== 'light'"
            [class.dark:text-lab-white]="theme.theme() !== 'light'">
            {{ i18n.t('theme.light') }}
          </button>

          <button
            type="button"
            (click)="setTheme('dark')"
            class="flex-1 border-2 border-deep-navy dark:border-neon-green py-4 font-black uppercase tracking-widest shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] hover:-translate-y-1 transition-all"
            [class.bg-deep-navy]="theme.theme() === 'dark'"
            [class.text-neon-green]="theme.theme() === 'dark'"
            [class.bg-white]="theme.theme() !== 'dark'"
            [class.dark:bg-slate-800]="theme.theme() !== 'dark'"
            [class.text-deep-navy]="theme.theme() !== 'dark'"
            [class.dark:text-lab-white]="theme.theme() !== 'dark'">
            {{ i18n.t('theme.dark') }}
          </button>
        </div>
      </section>

      <!-- JĘZYK -->
      <section class="ph-card bg-white dark:bg-slate-900 p-6 sm:p-8 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)]">
        <h2 class="font-black uppercase mb-6 pb-2 border-b-4 border-deep-navy dark:border-neon-green/60 text-xl text-deep-navy dark:text-lab-white tracking-wide">
          {{ i18n.t('settings.lang') }}
        </h2>
        <select [(ngModel)]="locale" (ngModelChange)="setLocale($event)" class="w-full p-4 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white cursor-pointer text-lg">
          @for (loc of locales; track loc) {
            <option [value]="loc">{{ i18n.t('lang.' + loc) }}</option>
          }
        </select>
      </section>

      <!-- MFA -->
      <section class="ph-card bg-white dark:bg-slate-900 p-6 sm:p-8 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)]">
        <h2 class="font-black uppercase mb-6 pb-2 border-b-4 border-deep-navy dark:border-neon-green/60 text-xl text-deep-navy dark:text-lab-white tracking-wide">
          {{ i18n.t('settings.mfa') }}
        </h2>

        @if (qrCode()) {
          <div class="bg-gray-50 dark:bg-slate-800 p-6 sm:p-8 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] mb-6 flex flex-col items-center gap-6">
            <img [src]="qrCode()" alt="MFA QR" class="border-4 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] w-48 h-48 bg-white p-2">

            <div class="w-full max-w-sm space-y-4">
              <input [(ngModel)]="mfaCode" [placeholder]="i18n.t('settings.mfaCodePlaceholder')" class="w-full p-4 font-bold bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white text-center text-xl tracking-[0.25em]">

              <button type="button" (click)="enableMfa()" class="w-full bg-acid-lime text-deep-navy dark:bg-neon-green dark:text-deep-navy py-4 uppercase font-black tracking-widest border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#0f172a] dark:hover:shadow-[6px_6px_0_0_#39ff14] transition-all">
                {{ i18n.t('settings.mfaEnable') }}
              </button>
            </div>
          </div>
        } @else {
          <button type="button" (click)="setupMfa()" class="bg-deep-navy text-white dark:bg-slate-800 dark:text-white px-8 py-4 uppercase font-black tracking-widest border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] hover:-translate-y-1 hover:bg-acid-lime hover:text-deep-navy dark:hover:bg-neon-green dark:hover:text-deep-navy transition-all inline-block">
            {{ i18n.t('settings.mfaSetup') }}
          </button>
        }

        <div class="mt-8 pt-6 border-t-4 border-deep-navy/10 dark:border-neon-green/20">
          <button type="button" (click)="disableMfa()" class="text-red-600 dark:text-red-400 font-black uppercase text-xs tracking-widest hover:underline hover:text-red-800 dark:hover:text-red-300 transition-colors">
            {{ i18n.t('settings.mfaDisable') }}
          </button>
        </div>
      </section>

    </div>
  `
})
export class SettingsComponent implements OnInit {
  locale: Locale = 'pl';
  readonly locales = SUPPORTED_LOCALES;
  mfaCode = '';

  qrCode = signal('');
  message = signal('');

  constructor(
    public theme: ThemeService,
    public i18n: I18nService,
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.locale = this.i18n.locale();
    this.theme.loadFromServer();
    this.i18n.loadFromServer();
  }

  setTheme(t: ThemeMode): void {
    this.theme.setTheme(t);
  }

  setLocale(l: Locale): void {
    this.i18n.setLocale(l);
  }

  setupMfa(): void {
    this.api.mfaSetup().subscribe({
      next: (r) => {
        this.qrCode.set(r.qrCode);
        this.message.set(this.i18n.t('settings.mfaQr'));
      }
    });
  }

  enableMfa(): void {
    this.api.mfaEnable(this.mfaCode).subscribe({
      next: () => {
        this.message.set(this.i18n.t('settings.mfaEnabled'));
        this.qrCode.set('');
      },
      error: (e) => this.message.set(e.error?.error || this.i18n.t('common.saveError'))
    });
  }

  disableMfa(): void {
    const password = prompt(this.i18n.t('settings.mfaPassword'));
    if (!password) return;
    this.api.mfaDisable(password).subscribe({
      next: () => this.message.set(this.i18n.t('settings.mfaDisabled')),
      error: (e) => this.message.set(e.error?.error || this.i18n.t('common.saveError'))
    });
  }
}
