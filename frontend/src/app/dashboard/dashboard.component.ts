import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart } from 'chart.js';
import { PageHeaderComponent } from '../shared/page-header.component';
import { NavIconComponent, NavIconName } from '../shared/nav-icon.component';
import {
  baseCartesianOptions,
  baseDoughnutOptions,
  chartPalette,
  ensureChartJs,
  stockBarColor
} from '../shared/chart-theme';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { I18nService } from '../services/i18n.service';
import { ThemeService } from '../services/theme.service';
import { DashboardAlerts, ExpiryAlert, LowStockAlert, Medicine } from '../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, RouterModule, NavIconComponent],
  template: `
    <app-page-header [title]="i18n.t('dashboard.title')" [subtitle]="i18n.t('dashboard.subtitle')">
      <div actions class="ph-page-actions">
        @if (auth.canDownloadSalesReport()) {
          <button type="button" (click)="downloadPdf()" class="ph-btn-primary">
            {{ i18n.t('dashboard.pdfReport') }}
          </button>
        }
        <a routerLink="/sales" class="ph-btn-secondary">
          + {{ i18n.t('dashboard.newSale') }}
        </a>
      </div>
    </app-page-header>

    <div class="ph-page-body grid grid-cols-1 lg:grid-cols-3 gap-6">

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:col-span-3">
        @for (stat of stats(); track stat.labelKey) {
          <div class="ph-stat-card bg-white dark:bg-slate-800 p-4 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] hover:-translate-y-1 transition-transform">
            <div class="flex items-start justify-between gap-2 min-w-0 border-b-2 border-deep-navy/10 dark:border-neon-green/20 pb-2">
              <p class="text-[11px] font-black uppercase tracking-wider opacity-80 leading-tight min-w-0">{{ i18n.t(stat.labelKey) }}</p>
              <span class="nav-icon-wrap w-8 h-8 flex items-center justify-center bg-acid-lime/20 dark:bg-emerald-900/40 border-2 border-deep-navy dark:border-neon-green rounded-sm">
                <app-nav-icon [name]="stat.icon" [size]="16" />
              </span>
            </div>
            <p class="mt-3 font-black tabular-nums leading-none truncate text-deep-navy dark:text-neon-green" [class]="stat.large ? 'text-4xl' : 'text-2xl'">
              {{ stat.value }}
            </p>
          </div>
        }
      </div>

      <div class="ph-card bg-white dark:bg-slate-900 p-5 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)] flex flex-col">
        <h2 class="ph-section-title flex items-center gap-2 pb-3 mb-4 border-b-4 border-deep-navy dark:border-neon-green/60 uppercase font-black text-sm">
          <app-nav-icon name="alert" [size]="20" />
          {{ i18n.t('dashboard.lowStockTitle') }}
        </h2>
        @if (lowStockAlerts().length === 0 && fallbackLowStock().length === 0) {
          <p class="ph-empty !p-0 font-bold opacity-50">{{ i18n.t('dashboard.noAlerts') }}</p>
        } @else {
          <ul class="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            @for (item of displayLowStock(); track item.name) {
              <li class="flex items-center justify-between font-bold border-2 border-deep-navy dark:border-neon-green/40 p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-acid-lime/20 dark:hover:bg-slate-700 transition-colors">
                <span class="bg-acid-lime dark:bg-emerald-800 text-deep-navy dark:text-lab-white px-2 py-1 text-xs border border-deep-navy dark:border-neon-green">{{ item.name }}</span>
                <span class="text-red-600 dark:text-red-400 font-black bg-red-100 dark:bg-red-950 px-2 py-1 border border-red-600 dark:border-red-400 text-xs">
                  {{ item.stock }} {{ i18n.t('dashboard.units') }}
                </span>
              </li>
            }
          </ul>
        }
      </div>

      <div class="ph-card bg-white dark:bg-slate-900 p-5 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)] flex flex-col">
        <h2 class="ph-section-title flex items-center gap-2 pb-3 mb-4 border-b-4 border-deep-navy dark:border-neon-green/60 uppercase font-black text-sm">
          <app-nav-icon name="calendar" [size]="20" />
          {{ i18n.t('dashboard.expiryTitle') }}
        </h2>
        @if (expiryAlerts().length === 0 && fallbackExpiry().length === 0) {
          <p class="ph-empty !p-0 font-bold opacity-50">{{ i18n.t('dashboard.noAlerts') }}</p>
        } @else {
          <ul class="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            @for (item of displayExpiry(); track item.key) {
              <li class="flex flex-col sm:flex-row sm:items-center justify-between font-bold text-sm border-2 border-deep-navy dark:border-neon-green/40 p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-acid-lime/20 dark:hover:bg-slate-700 transition-colors gap-2">
                <span class="truncate">{{ item.name }}</span>
                <span class="font-mono text-xs bg-deep-navy text-white dark:bg-neon-green dark:text-deep-navy px-2 py-1 shrink-0">
                  {{ item.date }}
                </span>
              </li>
            }
          </ul>
        }
      </div>

      <div class="ph-card-accent bg-acid-lime/20 dark:bg-slate-900 p-5 border-2 border-deep-navy dark:border-neon-green shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#39ff14] flex flex-col">
        <h2 class="ph-section-title flex items-center gap-2 pb-3 mb-4 border-b-4 border-deep-navy dark:border-neon-green/60 uppercase font-black text-sm">
          <app-nav-icon name="bolt" [size]="20" />
          {{ i18n.t('dashboard.quickActions') }}
        </h2>
        <div class="space-y-4 mt-auto">
          <a routerLink="/medicines" class="block w-full text-center border-2 border-deep-navy dark:border-neon-green bg-white dark:bg-slate-800 dark:text-lab-white font-black uppercase text-xs py-3 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] hover:bg-acid-lime dark:hover:bg-slate-700 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#0f172a] dark:hover:shadow-[6px_6px_0_0_#39ff14] transition-all">
            {{ i18n.t('dashboard.toMedicines') }}
          </a>
          <a routerLink="/prescriptions" class="block w-full text-center border-2 border-deep-navy dark:border-neon-green bg-white dark:bg-slate-800 dark:text-lab-white font-black uppercase text-xs py-3 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] hover:bg-acid-lime dark:hover:bg-slate-700 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#0f172a] dark:hover:shadow-[6px_6px_0_0_#39ff14] transition-all">
            {{ i18n.t('dashboard.toPrescriptions') }}
          </a>
          @if (auth.canManageMedicines()) {
            <a routerLink="/medicines" fragment="import" class="block w-full text-center border-2 border-deep-navy dark:border-neon-green bg-deep-navy text-neon-green font-black uppercase text-xs py-3 shadow-[4px_4px_0_0_#39ff14] dark:shadow-[4px_4px_0_0_#0f172a] hover:bg-neon-green hover:text-deep-navy hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#39ff14] dark:hover:shadow-[6px_6px_0_0_#0f172a] transition-all">
              {{ i18n.t('dashboard.importCsv') }}
            </a>
          }
        </div>
      </div>

      <div class="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="ph-card bg-white dark:bg-slate-900 p-5 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)]">
          <h2 class="ph-section-title flex items-center gap-2 pb-3 mb-4 border-b-4 border-deep-navy dark:border-neon-green/60 uppercase font-black text-sm">
            <app-nav-icon name="chart" [size]="20" />
            {{ i18n.t('dashboard.stockChart') }}
          </h2>
          <div class="relative h-72 w-full min-h-[16rem] p-2 border-2 border-dashed border-deep-navy/20 dark:border-neon-green/20">
            <canvas #stockCanvas aria-label="Stock levels chart"></canvas>
          </div>
        </div>

        <div class="ph-card bg-white dark:bg-slate-900 p-5 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)]">
          <h2 class="ph-section-title flex items-center gap-2 pb-3 mb-4 border-b-4 border-deep-navy dark:border-neon-green/60 uppercase font-black text-sm">
            <app-nav-icon name="alert" [size]="20" />
            {{ i18n.t('dashboard.alertsChart') }}
          </h2>
          <div class="relative h-72 w-full min-h-[16rem] flex items-center justify-center p-2 border-2 border-dashed border-deep-navy/20 dark:border-neon-green/20">
            <canvas #alertsCanvas aria-label="Alerts summary chart"></canvas>
          </div>
        </div>
      </div>

    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  // ... reszta logiki komponentu bez zmian ...
  @ViewChild('stockCanvas') stockCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('alertsCanvas') alertsCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly theme = inject(ThemeService);

  expiryAlerts = signal<ExpiryAlert[]>([]);
  lowStockAlerts = signal<LowStockAlert[]>([]);
  fallbackLowStock = signal<{ name: string; stock: number }[]>([]);
  fallbackExpiry = signal<{ name: string; date: string; key: string }[]>([]);
  medicinesCount = signal<number>(0);
  stockBars = signal<Medicine[]>([]);

  private stockChart?: Chart<'bar'>;
  private alertsChart?: Chart<'doughnut'>;
  private viewReady = false;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    public i18n: I18nService
  ) {
    ensureChartJs();
    effect(() => {
      this.theme.theme();
      this.i18n.locale();
      this.refreshCharts();
    });
  }

  expiryCount = computed(() => this.expiryAlerts().length || this.fallbackExpiry().length);
  lowStockCount = computed(() => this.lowStockAlerts().length || this.fallbackLowStock().length);

  stats = computed(() => [
    { labelKey: 'dashboard.expiryAlerts', value: this.expiryCount(), icon: 'calendar' as NavIconName, large: true },
    { labelKey: 'dashboard.lowStock', value: this.lowStockCount(), icon: 'alert' as NavIconName, large: true },
    { labelKey: 'dashboard.catalog', value: this.medicinesCount(), icon: 'medicines' as NavIconName, large: true },
    { labelKey: 'dashboard.sessionRole', value: this.roleLabel, icon: 'patients' as NavIconName, large: false }
  ]);

  displayLowStock = computed(() => {
    const alerts = this.lowStockAlerts();
    if (alerts.length) {
      return alerts.map((a) => ({
        name: a.medicine_name,
        stock: a.total_stock ?? 0
      }));
    }
    return this.fallbackLowStock();
  });

  displayExpiry = computed(() => {
    const alerts = this.expiryAlerts();
    if (alerts.length) {
      return alerts.map((a) => ({
        name: a.medicine_name,
        date: a.expiry_date,
        key: String(a.batch_id)
      }));
    }
    return this.fallbackExpiry();
  });

  get roleLabel(): string {
    const role = this.auth.user()?.role ?? '';
    const key = `role.${role}`;
    const label = this.i18n.t(key);
    return label !== key ? label : role;
  }

  ngOnInit(): void {
    this.api.getDashboardAlerts().subscribe({
      next: (data: DashboardAlerts) => {
        this.expiryAlerts.set(data.expiryAlerts ?? []);
        this.lowStockAlerts.set(data.lowStockAlerts ?? []);
        this.refreshCharts();
      },
      error: () => {
        this.expiryAlerts.set([]);
        this.lowStockAlerts.set([]);
        this.refreshCharts();
      }
    });

    this.api.getMedicines().subscribe({
      next: (meds) => {
        this.medicinesCount.set(meds.length);
        const sorted = [...meds].sort((a, b) => b.stock - a.stock);
        this.stockBars.set(sorted.slice(0, 8));

        const soon = new Date();
        soon.setDate(soon.getDate() + 90);

        this.fallbackLowStock.set(
          meds.filter((m) => m.stock < 10).map((m) => ({ name: m.name, stock: m.stock }))
        );
        this.fallbackExpiry.set(
          meds
            .filter((m) => m.expiry_date && new Date(m.expiry_date) <= soon)
            .map((m) => ({ name: m.name, date: m.expiry_date!, key: `m-${m.id}` }))
        );

        this.refreshCharts();
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.refreshCharts();
  }

  ngOnDestroy(): void {
    this.stockChart?.destroy();
    this.alertsChart?.destroy();
  }

  private refreshCharts(): void {
    if (!this.viewReady) return;
    this.renderStockChart();
    this.renderAlertsChart();
  }

  private renderStockChart(): void {
    const canvas = this.stockCanvas?.nativeElement;
    if (!canvas) return;

    const palette = chartPalette(this.theme.theme());
    const labels = this.stockBars().map((m) => m.name);
    const values = this.stockBars().map((m) => m.stock);
    const colors = values.map((v) => stockBarColor(v, palette));

    if (!this.stockChart) {
      this.stockChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: this.i18n.t('dashboard.chartStockLabel'),
              data: values,
              backgroundColor: colors,
              borderColor: palette.border,
              borderWidth: 2,
              borderRadius: 2
            }
          ]
        },
        options: {
          ...baseCartesianOptions(palette, 'y'),
          plugins: {
            ...baseCartesianOptions(palette, 'y').plugins,
            legend: { display: false }
          }
        }
      });
      return;
    }

    this.stockChart.data.labels = labels;
    const ds = this.stockChart.data.datasets[0];
    ds.data = values;
    ds.backgroundColor = colors;
    ds.label = this.i18n.t('dashboard.chartStockLabel');
    this.stockChart.options = {
      ...baseCartesianOptions(palette, 'y'),
      plugins: {
        ...baseCartesianOptions(palette, 'y').plugins,
        legend: { display: false }
      }
    };
    this.stockChart.update();
  }

  private renderAlertsChart(): void {
    const canvas = this.alertsCanvas?.nativeElement;
    if (!canvas) return;

    const palette = chartPalette(this.theme.theme());
    const expiry = this.expiryCount();
    const low = this.lowStockCount();
    const labels = [this.i18n.t('dashboard.chartExpiryLabel'), this.i18n.t('dashboard.chartLowStockLabel')];
    const values = [expiry, low];
    const colors = [palette.expiry, palette.lowStock];

    if (!this.alertsChart) {
      this.alertsChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderColor: palette.border,
              borderWidth: 3,
              hoverOffset: 8
            }
          ]
        },
        options: baseDoughnutOptions(palette)
      });
      return;
    }

    this.alertsChart.data.labels = labels;
    const ds = this.alertsChart.data.datasets[0];
    ds.data = values;
    ds.backgroundColor = colors;
    this.alertsChart.options = baseDoughnutOptions(palette);
    this.alertsChart.update();
  }

  downloadPdf(): void {
    this.api.downloadSalesReportPdf().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'raport_sprzedazy.pdf';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert(this.i18n.t('login.failed'))
    });
  }
}
