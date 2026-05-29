import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="ph-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl md:text-3xl font-black uppercase leading-tight truncate">
          {{ title }}
        </h1>
        @if (subtitle) {
          <p class="text-xs font-bold uppercase opacity-60 mt-1 truncate">
            {{ subtitle }}
          </p>
        }
      </div>

      <div class="shrink-0 flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
        <ng-content select="[actions]"></ng-content>
      </div>
    </header>
  `
})
export class PageHeaderComponent {
  // Wymagany tytuł strony
  @Input({ required: true }) title!: string;

  // Opcjonalny podtytuł
  @Input() subtitle?: string;
}
