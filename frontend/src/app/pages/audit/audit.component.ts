import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { NavIconComponent, NavIconName } from '../../shared/nav-icon.component';
import { I18nService } from '../../services/i18n.service';
import { ApiService, AuditEntry } from '../../services/api.service';

type AuditScopeFilter = 'all' | 'sales' | 'deliveries' | 'prescriptions';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, NavIconComponent],
  template: `
    <app-page-header [title]="i18n.t('audit.title')" [subtitle]="i18n.t('audit.subtitle')"></app-page-header>

    <div class="ph-page-body space-y-8">

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          (click)="setFilter('all')"
          class="p-4 flex items-center gap-3 transition-transform border-2 text-left shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] hover:-translate-y-1"
          [class.bg-acid-lime]="activeFilter() === 'all'"
          [class.dark:bg-neon-green]="activeFilter() === 'all'"
          [class.border-deep-navy]="activeFilter() === 'all'"
          [class.dark:border-neon-green]="activeFilter() === 'all'"
          [class.text-deep-navy]="activeFilter() === 'all'"

          [class.bg-white]="activeFilter() !== 'all'"
          [class.dark:bg-slate-800]="activeFilter() !== 'all'"
          [class.border-deep-navy/30]="activeFilter() !== 'all'"
          [class.dark:border-neon-green/50]="activeFilter() !== 'all'"
        [class.dark:text-lab-white]="activeFilter() !== 'all'"
        >
        <span class="nav-icon-wrap w-10 h-10 shrink-0 flex items-center justify-center bg-black/5 dark:bg-black/20 border-2 border-current">
            <app-nav-icon name="dashboard" [size]="20" />
          </span>
        <h3 class="font-black uppercase text-xs truncate">{{ i18n.t('audit.allEntries') }}</h3>
        </button>

        @for (block of auditScopes; track block.filter) {
          <button
            type="button"
            (click)="setFilter(block.filter)"
            class="p-4 flex items-center gap-3 transition-transform border-2 text-left shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] hover:-translate-y-1"
            [class.bg-acid-lime]="activeFilter() === block.filter"
            [class.dark:bg-neon-green]="activeFilter() === block.filter"
            [class.border-deep-navy]="activeFilter() === block.filter"
            [class.dark:border-neon-green]="activeFilter() === block.filter"
            [class.text-deep-navy]="activeFilter() === block.filter"

            [class.bg-white]="activeFilter() !== block.filter"
            [class.dark:bg-slate-800]="activeFilter() !== block.filter"
            [class.border-deep-navy/30]="activeFilter() !== block.filter"
            [class.dark:border-neon-green/50]="activeFilter() !== block.filter"
            [class.dark:text-lab-white]="activeFilter() !== block.filter"
            >
          <span class="nav-icon-wrap w-10 h-10 shrink-0 flex items-center justify-center bg-black/5 dark:bg-black/20 border-2 border-current">
              <app-nav-icon [name]="block.icon" [size]="20" />
            </span>
          <h3 class="font-black uppercase text-xs truncate">{{ i18n.t(block.titleKey) }}</h3>
          </button>
        }
      </div>

      <div class="flex gap-2">
        <input
          type="text"
          [ngModel]="searchQuery()"
          (ngModelChange)="onSearchChange($event)"
          [placeholder]="i18n.t('common.search') + '...'"
          class="w-full p-3 font-bold bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white placeholder:opacity-50"
        >
      </div>

      <div class="ph-card ph-table-scroll bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)]">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-800 border-b-4 border-deep-navy dark:border-neon-green/60">
          <tr class="font-black uppercase text-xs tracking-wider text-deep-navy dark:text-lab-white">
            <th class="p-4 text-left whitespace-nowrap">{{ i18n.t('audit.col.time') }}</th>
            <th class="p-4 text-left">{{ i18n.t('audit.col.user') }}</th>
            <th class="p-4 text-left">{{ i18n.t('audit.col.action') }}</th>
            <th class="p-4 text-left">{{ i18n.t('audit.col.entity') }}</th>
            <th class="p-4 text-left">ID</th>
            <th class="p-4 text-left">{{ i18n.t('audit.col.change') }}</th>
          </tr>
          </thead>
          <tbody>
            @for (e of pagedEntries(); track e.id) {
              <tr class="border-b-2 border-deep-navy/10 dark:border-neon-green/20 font-bold hover:bg-acid-lime/20 dark:hover:bg-slate-700/50 transition-colors">
                <td class="p-4 whitespace-nowrap font-mono text-xs">{{ e.timestamp | date:'dd.MM.yyyy HH:mm' }}</td>
                <td class="p-4">{{ e.username || e.user_id || '—' }}</td>
                <td class="p-4">
                  <span class="px-2 py-1 uppercase text-[10px] font-black border-2"
                        [class.bg-red-500]="e.action.includes('DELETE') || e.action.includes('cancel')"
                        [class.text-white]="e.action.includes('DELETE') || e.action.includes('cancel')"
                        [class.border-red-700]="e.action.includes('DELETE') || e.action.includes('cancel')"
                        [class.dark:border-red-300]="e.action.includes('DELETE') || e.action.includes('cancel')"

                        [class.bg-acid-lime]="!e.action.includes('DELETE') && !e.action.includes('cancel')"
                        [class.dark:bg-emerald-800]="!e.action.includes('DELETE') && !e.action.includes('cancel')"
                        [class.text-deep-navy]="!e.action.includes('DELETE') && !e.action.includes('cancel')"
                        [class.dark:text-white]="!e.action.includes('DELETE') && !e.action.includes('cancel')"
                        [class.border-deep-navy]="!e.action.includes('DELETE') && !e.action.includes('cancel')"
                        [class.dark:border-neon-green]="!e.action.includes('DELETE') && !e.action.includes('cancel')">
                  {{ e.action }}
                  </span>
                </td>
                <td class="p-4 font-mono text-xs opacity-70">{{ e.entity_type || '—' }}</td>
                <td class="p-4">{{ e.entity_id ?? '—' }}</td>
                <td class="p-4 text-xs opacity-80 truncate max-w-[200px]" [title]="e.old_value + ' → ' + e.new_value">
                  {{ e.old_value || '—' }} → {{ e.new_value || '—' }}
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="p-8 text-center font-bold opacity-50 uppercase tracking-widest">{{ i18n.t('audit.empty') }}</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <div class="flex items-center justify-between border-2 border-deep-navy dark:border-neon-green bg-acid-lime/20 dark:bg-slate-900 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#39ff14] p-4 font-black uppercase text-xs">
          <button
            type="button"
            [disabled]="currentPage() === 1"
            (click)="goToPage(currentPage() - 1)"
            class="px-4 py-2 border-2 border-deep-navy dark:border-neon-green bg-white dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-y-0.5 enabled:hover:bg-acid-lime dark:enabled:hover:bg-slate-700 transition-all enabled:shadow-[2px_2px_0_0_#0f172a] dark:enabled:shadow-[2px_2px_0_0_#39ff14]">
            {{ i18n.t('pagination.prev') }}
          </button>

          <span class="tracking-widest">{{ currentPage() }} / {{ totalPages() }}</span>

          <button
            type="button"
            [disabled]="currentPage() === totalPages()"
            (click)="goToPage(currentPage() + 1)"
            class="px-4 py-2 border-2 border-deep-navy dark:border-neon-green bg-white dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-y-0.5 enabled:hover:bg-acid-lime dark:enabled:hover:bg-slate-700 transition-all enabled:shadow-[2px_2px_0_0_#0f172a] dark:enabled:shadow-[2px_2px_0_0_#39ff14]">
            {{ i18n.t('pagination.next') }}
          </button>
        </div>
      }
    </div>
  `
})
export class AuditComponent implements OnInit {
  private allEntries = signal<AuditEntry[]>([]);
  activeFilter = signal<AuditScopeFilter>('all');
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = 15;

  auditScopes: { icon: NavIconName; titleKey: string; filter: AuditScopeFilter }[] = [
    { icon: 'sales', titleKey: 'audit.sales', filter: 'sales' },
    { icon: 'deliveries', titleKey: 'audit.deliveries', filter: 'deliveries' },
    { icon: 'prescriptions', titleKey: 'audit.prescriptions', filter: 'prescriptions' }
  ];

  filteredEntries = computed(() => {
    let list = this.allEntries();
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();

    if (filter !== 'all') {
      list = list.filter(e => {
        const type = e.entity_type?.toLowerCase() || '';
        const action = e.action?.toLowerCase() || '';
        if (filter === 'sales') return type.includes('sale') || action.includes('sale') || type.includes('sprzeda');
        if (filter === 'deliveries') return type.includes('deliver') || action.includes('deliver') || type.includes('dostaw');
        if (filter === 'prescriptions') return type.includes('prescription') || type.includes('recept') || action.includes('recept');
        return false;
      });
    }

    if (query) {
      list = list.filter(e =>
        (e.username?.toLowerCase().includes(query)) ||
        (e.action.toLowerCase().includes(query))
      );
    }
    return list;
  });

  totalPages = computed(() => Math.ceil(this.filteredEntries().length / this.pageSize) || 1);
  pagedEntries = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredEntries().slice(start, start + this.pageSize);
  });

  constructor(public i18n: I18nService, private api: ApiService) {}

  ngOnInit(): void {
    this.api.getAuditLog().subscribe({
      next: (rows) => this.allEntries.set(rows),
      error: () => this.allEntries.set([])
    });
  }

  setFilter(filter: AuditScopeFilter): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  goToPage(p: number): void {
    this.currentPage.set(p);
  }
}
