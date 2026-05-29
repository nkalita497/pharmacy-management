import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../services/i18n.service';
import { PageMeta } from '../core/models';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (meta && meta.totalPages > 1) {
      <div class="flex flex-wrap items-center justify-between gap-4 mt-6 font-bold uppercase text-sm">
        <span class="opacity-60">{{ meta.page }} / {{ meta.totalPages }} ({{ meta.total }})</span>
        <div class="flex gap-2">
          <button type="button" [disabled]="meta.page <= 1" (click)="go(meta.page - 1)"
            class="border-4 border-deep-navy px-4 py-2 disabled:opacity-40 bg-white dark:bg-deep-navy dark:text-neon-green">
            {{ i18n.t('pagination.prev') }}
          </button>
          <button type="button" [disabled]="meta.page >= meta.totalPages" (click)="go(meta.page + 1)"
            class="border-4 border-deep-navy px-4 py-2 disabled:opacity-40 bg-neon-green dark:bg-acid-lime dark:text-deep-navy">
            {{ i18n.t('pagination.next') }}
          </button>
        </div>
      </div>
    }
  `
})
export class PaginationComponent {
  @Input() meta: PageMeta | null = null;
  @Output() pageChange = new EventEmitter<number>();

  constructor(public i18n: I18nService) {}

  go(page: number): void {
    this.pageChange.emit(page);
  }
}
