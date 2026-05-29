import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { I18nService, Locale, SUPPORTED_LOCALES } from '../services/i18n.service';
import { WebsocketService } from '../services/websocket.service';
import { SearchBarComponent } from '../shared/search-bar.component';
import { NavIconComponent, NavIconName } from '../shared/nav-icon.component';
import { PharmaBrandComponent } from '../shared/pharma-brand.component';

interface NavItem {
  path: string;
  labelKey: string;
  icon: NavIconName;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    SearchBarComponent,
    NavIconComponent,
    PharmaBrandComponent
  ],
  template: `
    <div class="ph-app-root">

      @if (mobileNav) {
        <div class="fixed inset-0 bg-[#0a0a0a]/50 z-40 lg:hidden" (click)="mobileNav = false"></div>
      }

      <div class="ph-app-frame">

        <aside
          class="fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r-8 border-[#0a0a0a] dark:border-[#333333]
                 bg-neon-green dark:bg-[#111810] flex flex-col shrink-0 transform transition-transform duration-200
                 -translate-x-full lg:translate-x-0 overflow-y-auto"
          [class.translate-x-0]="mobileNav"
        >
          <div class="p-6 border-b-8 border-[#0a0a0a] dark:border-[#333333]">
            <div class="flex gap-2 mb-6 hidden md:flex">
              <div class="w-4 h-4 rounded-full bg-red-500 border-2 border-[#0a0a0a] dark:border-red-900 shadow-sm"></div>
              <div class="w-4 h-4 rounded-full bg-yellow-400 border-2 border-[#0a0a0a] dark:border-yellow-700 shadow-sm"></div>
              <div class="w-4 h-4 rounded-full bg-green-500 border-2 border-[#0a0a0a] dark:border-green-800 shadow-sm"></div>
            </div>

            <app-pharma-brand />
          </div>

          <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
            @for (item of visibleNav; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="nav-link-active"
                (click)="mobileNav = false"
                class="nav-link group rounded-xl"
              >
                <span class="nav-icon-wrap rounded-lg">
                  <app-nav-icon [name]="item.icon" [size]="18" />
                </span>
                <span class="flex-1 min-w-0 truncate tracking-wide">{{ i18n.t(item.labelKey) }}</span>
              </a>
            }
          </nav>

          <div class="p-5 border-t-8 border-[#0a0a0a] dark:border-[#333333] bg-acid-lime/30 dark:bg-[#0a0a0a] shrink-0">
            <p class="font-black uppercase text-sm truncate dark:text-lab-white">{{ auth.user()?.username }}</p>
            <span class="inline-block mt-1 text-[10px] font-bold uppercase border-2 border-[#0a0a0a] px-2 py-0.5 bg-white dark:bg-[#1a1a1a] text-[#0a0a0a] dark:text-neon-green">
              {{ roleLabel }}
            </span>
            <button
              type="button"
              (click)="logout()"
              class="mt-4 w-full border-4 border-[#0a0a0a] dark:border-[#333333] bg-[#0a0a0a] text-neon-green font-black uppercase py-2.5 text-xs
                     hover:bg-neon-green hover:text-[#0a0a0a] dark:hover:bg-neon-green dark:hover:text-[#0a0a0a] transition-all duration-200"
            >
              {{ i18n.t('nav.logout') }}
            </button>
          </div>
        </aside>

        <div class="ph-app-column">

          <header class="ph-toolbar">
            <button
              type="button"
              class="ph-toolbar-btn lg:hidden rounded-lg order-1"
              (click)="mobileNav = !mobileNav"
              [attr.aria-label]="i18n.t('nav.menu')"
            >
              <app-nav-icon name="menu" [size]="20" />
            </button>

            <app-search-bar class="order-3 w-full lg:order-none lg:flex-1 lg:min-w-0 basis-full lg:basis-auto" />

            <div
              class="order-2 flex items-center gap-2 shrink-0 px-2 sm:px-3 py-2 border-2 border-[#0a0a0a] dark:border-[#333333] rounded-lg font-black text-[10px] uppercase tracking-widest transition-colors"
              [class.bg-neon-green]="ws.connected()"
              [class.text-deep-navy]="ws.connected()"
              [class.dark:bg-emerald-500]="ws.connected()"
              [class.dark:text-deep-navy]="ws.connected()"
              [class.bg-gray-100]="!ws.connected()"
              [class.text-gray-600]="!ws.connected()"
              [class.dark:bg-slate-800]="!ws.connected()"
              [class.dark:text-gray-400]="!ws.connected()"
              [attr.title]="ws.connected() ? i18n.t('nav.live') : i18n.t('nav.offline')"
            >
              <span
                class="w-2.5 h-2.5 rounded-full border border-current shrink-0"
                [class.bg-green-600]="ws.connected()"
                [class.animate-pulse]="ws.connected()"
                [class.bg-gray-400]="!ws.connected()"
                [class.dark:bg-gray-500]="!ws.connected()"
              ></span>
              {{ ws.connected() ? i18n.t('nav.live') : i18n.t('nav.offline') }}
            </div>

            <button
              type="button"
              (click)="toggleTheme()"
              class="ph-toolbar-btn rounded-lg order-4"
              [attr.aria-label]="theme.theme() === 'dark' ? i18n.t('theme.light') : i18n.t('theme.dark')"
            >
              <app-nav-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="18" />
            </button>

            <select
              [value]="i18n.locale()"
              (change)="setLang($event)"
              class="order-5 border-4 border-[#0a0a0a] dark:border-[#333333] px-2 sm:px-3 py-2.5 font-black text-xs uppercase bg-white dark:bg-[#0a0a0a] shrink-0 rounded-lg outline-none focus:border-neon-green transition-colors"
            >
              @for (loc of locales; track loc) {
                <option [value]="loc">{{ loc.toUpperCase() }}</option>
              }
            </select>

            <a
              routerLink="/settings"
              class="ph-toolbar-btn rounded-lg order-6"
              [attr.aria-label]="i18n.t('nav.settings')"
            >
              <app-nav-icon name="settings" [size]="18" />
            </a>
          </header>

          @if (ws.notifications().length) {
            <div class="shrink-0 border-b-4 border-[#0a0a0a] bg-acid-lime/50 dark:bg-emerald-900/40 px-4 sm:px-6 py-2 flex flex-wrap gap-2">
              @for (n of ws.notifications(); track n.id) {
                <span class="text-[10px] font-black uppercase border-2 border-[#0a0a0a] px-2 py-1 bg-white dark:bg-[#0a0a0a] max-w-full truncate rounded-md">
                  {{ n.message }}
                </span>
              }
            </div>
          }

          <main class="ph-app-main">
            <router-outlet />
          </main>
        </div>
      </div>
    </div>
  `
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  mobileNav = false;
  readonly locales = SUPPORTED_LOCALES;

  private readonly allNav: NavItem[] = [
    { path: '/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard' },
    { path: '/medicines', labelKey: 'nav.medicines', icon: 'medicines' },
    { path: '/suppliers', labelKey: 'nav.suppliers', icon: 'suppliers' },
    { path: '/patients', labelKey: 'nav.patients', icon: 'patients' },
    { path: '/prescriptions', labelKey: 'nav.prescriptions', icon: 'prescriptions' },
    { path: '/sales', labelKey: 'nav.sales', icon: 'sales' },
    { path: '/deliveries', labelKey: 'nav.deliveries', icon: 'deliveries' },
    { path: '/audit', labelKey: 'nav.audit', icon: 'audit' },
    { path: '/settings', labelKey: 'nav.settings', icon: 'settings' }
  ];

  get visibleNav(): NavItem[] {
    return this.allNav.filter((item) => this.auth.canAccessRoute(item.path));
  }

  constructor(
    public auth: AuthService,
    public theme: ThemeService,
    public i18n: I18nService,
    public ws: WebsocketService
  ) {
    effect(() => {
      this.auth.sessionRevision();
      this.ws.syncWithAuth();
    });
  }

  ngOnInit(): void {
    this.theme.loadFromServer();
    this.i18n.loadFromServer();
    this.auth.ensureSession().subscribe((user) => {
      if (user) this.ws.connect();
    });
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }

  get roleLabel(): string {
    const role = this.auth.user()?.role ?? '';
    const key = `role.${role}`;
    const label = this.i18n.t(key);
    return label !== key ? label : role;
  }

  toggleTheme(): void {
    this.theme.setTheme(this.theme.theme() === 'dark' ? 'light' : 'dark');
  }

  setLang(ev: Event): void {
    const v = (ev.target as HTMLSelectElement).value as Locale;
    this.i18n.setLocale(v);
  }

  logout(): void {
    this.mobileNav = false;
    this.ws.disconnect();
    this.auth.logout().subscribe();
  }
}
