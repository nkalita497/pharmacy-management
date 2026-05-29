import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { I18nService } from '../services/i18n.service';
import { NavIconComponent } from './nav-icon.component';
import { SearchHit } from '../core/models';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, NavIconComponent],
  template: `
    <div class="relative w-full min-w-0">
      <div class="flex flex-col sm:flex-row gap-2 w-full min-w-0">
        <div class="relative flex-1 min-w-0 w-full">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none">
            <app-nav-icon name="search" [size]="16" />
          </span>
          <input
            [(ngModel)]="query"
            [placeholder]="i18n.t('nav.search')"
            class="ph-input !py-2 pl-9 pr-3 text-xs"
          />
        </div>
        <button type="button" (click)="search()" class="ph-btn-primary w-full sm:w-auto shrink-0">
          {{ i18n.t('nav.searchBtn') }}
        </button>
      </div>
      @if (results.length) {
        <ul class="absolute z-50 top-full left-0 right-0 mt-2 border-4 border-deep-navy bg-white dark:bg-slate-900 shadow-brutal-green max-h-64 overflow-y-auto">
          @for (r of results; track r.entity_type + r.entity_id) {
            <li>
              <button
                type="button"
                (click)="open(r)"
                class="w-full text-left px-4 py-3 font-bold hover:bg-acid-lime/30 dark:hover:bg-neon-green/20 text-sm flex gap-2 items-center"
              >
                <span class="text-[10px] uppercase tracking-wider opacity-50 min-w-[4.5rem]">{{ i18n.entityLabel(r.entity_type) }}</span>
                <span class="truncate">{{ r.title }}</span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `
})
export class SearchBarComponent {
  query = '';
  results: SearchHit[] = [];

  constructor(public i18n: I18nService, private api: ApiService, private router: Router) {}

  search(): void {
    if (!this.query.trim()) return;
    this.api.search(this.query.trim()).subscribe({
      next: (res) => (this.results = res.results),
      error: () => (this.results = [])
    });
  }

  open(hit: SearchHit): void {
    this.results = [];
    const routes: Record<string, string> = {
      medicine: '/medicines',
      patient: '/patients',
      supplier: '/suppliers'
    };
    this.router.navigate([routes[hit.entity_type] || '/dashboard']);
  }
}
