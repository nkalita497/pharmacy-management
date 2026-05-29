import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { PaginationComponent } from '../../shared/pagination.component';
import { ApiService } from '../../services/api.service';
import { apiErrorMessage } from '../../core/api-messages';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';
import { Medicine, PageMeta, Supplier } from '../../core/models';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, PaginationComponent],
  template: `
    <app-page-header [title]="i18n.t('medicines.title')" [subtitle]="i18n.t('medicines.subtitle')">
      <div actions class="ph-page-actions">
        @if (auth.canManageMedicines()) {
          <button type="button" (click)="openForm()" class="ph-btn-primary">
            + {{ i18n.t('medicines.add') }}
          </button>
          <button type="button" (click)="pickCsv()" id="import" class="ph-btn-secondary">
            {{ i18n.t('medicines.importCsv') }}
          </button>
        }
      </div>
    </app-page-header>

    <!-- KOMUNIKATY (ALERTY) -->
    @if (message()) {
      <div class="ph-alert-banner font-black bg-acid-lime dark:bg-neon-green text-deep-navy border-4 border-deep-navy shadow-[4px_4px_0_0_#0f172a] uppercase text-sm tracking-wide">
        {{ message() }}
      </div>
    }
    @if (loadError() || error()) {
      <div class="ph-alert-banner font-black bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-4 border-red-700 dark:border-red-400 shadow-[4px_4px_0_0_#b91c1c] dark:shadow-[4px_4px_0_0_#f87171] uppercase text-sm tracking-wide">
        {{ loadError() || error() }}
      </div>
    }

    <div class="ph-page-body">
      <!-- WYSZUKIWARKA -->
      <div class="mb-6 flex flex-col sm:flex-row gap-3">
        <input
          [(ngModel)]="searchQ"
          [placeholder]="i18n.t('medicines.filter')"
          class="w-full sm:flex-1 p-3 font-bold bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white placeholder:opacity-50"
        >
        <button
          type="button"
          (click)="loadPage(1)"
          class="ph-btn-primary shrink-0">
          {{ i18n.t('common.search') }}
        </button>
      </div>

      <!-- TABELA -->
      <div class="ph-card ph-table-scroll bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)]">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50 dark:bg-slate-800 border-b-4 border-deep-navy dark:border-neon-green/60">
          <tr class="uppercase text-xs font-black tracking-widest text-deep-navy dark:text-lab-white">
            <th class="p-4">{{ i18n.t('medicines.col.name') }}</th>
            <th class="p-4">{{ i18n.t('medicines.col.category') }}</th>
            <th class="p-4">{{ i18n.t('medicines.col.supplier') }}</th>
            <th class="p-4">{{ i18n.t('medicines.col.price') }}</th>
            <th class="p-4">{{ i18n.t('medicines.col.stock') }}</th>
            <th class="p-4">{{ i18n.t('medicines.col.expiry') }}</th>
            <th class="p-4">{{ i18n.t('common.actions') }}</th>
          </tr>
          </thead>
          <tbody>
            @for (m of medicines(); track m.id) {
              <tr class="border-b-2 border-deep-navy/10 dark:border-neon-green/20 font-bold hover:bg-acid-lime/20 dark:hover:bg-slate-700/50 transition-colors">
                <td class="p-4 truncate max-w-[200px]" [title]="m.name">{{ m.name }}</td>
                <td class="p-4">
                  <span class="bg-acid-lime dark:bg-emerald-800 text-deep-navy dark:text-lab-white px-2 py-1 text-[10px] font-black uppercase border-2 border-deep-navy dark:border-neon-green whitespace-nowrap">
                    {{ i18n.categoryLabel(m.category || '') }}
                  </span>
                </td>
                <td class="p-4 text-xs opacity-80">{{ supplierName(m.supplier_id) }}</td>
                <td class="p-4 tabular-nums">{{ m.price | number:'1.2-2' }} {{ i18n.t('common.currency') }}</td>
                <td class="p-4">
                  @if (m.stock < 10) {
                    <span class="bg-red-500 text-white px-2 py-1 text-xs font-black border-2 border-red-700 dark:border-red-300 shadow-[2px_2px_0_0_#b91c1c] dark:shadow-[2px_2px_0_0_#fca5a5]">
                      {{ m.stock }}
                    </span>
                  } @else {
                    <span class="font-mono">{{ m.stock }}</span>
                  }
                </td>
                <td class="p-4 font-mono text-xs">{{ m.expiry_date || '—' }}</td>
                <td class="p-4">
                  <div class="ph-table-actions">
                  @if (auth.canManageMedicines()) {
                    <button type="button" (click)="openForm(m)" class="ph-btn-edit">
                      {{ i18n.t('common.edit') }}
                    </button>
                  }
                  @if (auth.canDeleteMedicines()) {
                    <button type="button" (click)="remove(m.id)" class="ph-btn-delete">
                      {{ i18n.t('common.delete') }}
                    </button>
                  }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="p-8 text-center font-bold opacity-50 uppercase tracking-widest">{{ i18n.t('medicines.empty') }}</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="mt-6">
        <app-pagination [meta]="pageMeta()" (pageChange)="loadPage($event)" />
      </div>

      <p class="mt-6 text-xs uppercase opacity-60 font-bold border-l-4 border-deep-navy dark:border-neon-green pl-3">
        {{ i18n.t('medicines.csvHint') }}
      </p>
    </div>

    <!-- MODAL FORMULARZA -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-deep-navy/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" (click)="closeForm()">
        <form (click)="$event.stopPropagation()" (ngSubmit)="save()" class="w-full max-w-lg bg-white dark:bg-slate-900 p-6 sm:p-8 border-4 border-deep-navy dark:border-neon-green shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#39ff14] space-y-5 my-8">

          <h3 class="text-2xl font-black uppercase border-b-4 border-deep-navy dark:border-neon-green/60 pb-3 text-deep-navy dark:text-lab-white tracking-wide">
            {{ editing ? i18n.t('medicines.edit') : i18n.t('medicines.new') }}
          </h3>

          <input [(ngModel)]="form.name" name="name" required [placeholder]="i18n.t('medicines.placeholder.name')" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">

          <textarea [(ngModel)]="form.description" name="desc" [placeholder]="i18n.t('medicines.placeholder.desc')" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white min-h-[100px]"></textarea>

          <input [(ngModel)]="form.category" name="cat" [placeholder]="i18n.t('medicines.placeholder.category')" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">

          <select [(ngModel)]="form.supplier_id" name="sup" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white cursor-pointer">
            @for (s of suppliers(); track s.id) {
              <option [ngValue]="s.id">{{ s.name }}</option>
            }
          </select>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-3">
            <input type="number" [(ngModel)]="form.price" name="price" required [placeholder]="i18n.t('medicines.placeholder.price')" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">

            <input type="number" [(ngModel)]="form.stock" name="stock" [placeholder]="i18n.t('medicines.placeholder.stock')" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">

            <input type="date" [(ngModel)]="form.expiry_date" name="exp" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white uppercase text-xs">
          </div>

          <div class="ph-modal-actions">
            <button type="submit" class="ph-btn-save">
              {{ i18n.t('common.save') }}
            </button>
            <button type="button" (click)="closeForm()" class="ph-btn-cancel">
              {{ i18n.t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    }
  `
})
export class MedicinesComponent implements OnInit {
  medicines = signal<Medicine[]>([]);
  suppliers = signal<Supplier[]>([]);
  pageMeta = signal<PageMeta | null>(null);
  message = signal('');
  error = signal('');
  loadError = signal('');
  showForm = signal(false);

  searchQ = '';
  editing: Medicine | null = null;
  form: Partial<Medicine> = this.emptyForm();

  constructor(public auth: AuthService, private api: ApiService, public i18n: I18nService) {}

  ngOnInit(): void {
    this.loadPage(1);
    this.api.getSuppliers().subscribe((s) => this.suppliers.set(s));
  }

  loadPage(page: number): void {
    this.loadError.set('');
    this.api.getMedicinesPage(page, 15, this.searchQ).subscribe({
      next: (res) => {
        this.medicines.set(res.data);
        this.pageMeta.set(res.meta);
      },
      error: (err) => {
        this.medicines.set([]);
        this.loadError.set(apiErrorMessage(err, this.i18n.t('medicines.loadError'), this.i18n));
      }
    });
  }

  emptyForm(): Partial<Medicine> {
    return { name: '', description: '', category: '', supplier_id: 1, price: 0, stock: 0, expiry_date: '' };
  }

  supplierName(id?: number): string {
    return this.suppliers().find((s) => s.id === id)?.name ?? `#${id ?? '—'}`;
  }

  openForm(m?: Medicine): void {
    this.editing = m ?? null;
    this.form = m ? { ...m } : this.emptyForm();
    if (!this.form.supplier_id && this.suppliers().length) {
      this.form.supplier_id = this.suppliers()[0].id;
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  save(): void {
    const req = this.editing
      ? this.api.updateMedicine(this.editing.id, this.form)
      : this.api.createMedicine(this.form);

    req.subscribe({
      next: () => {
        this.showForm.set(false);
        this.message.set(this.i18n.t('common.saved'));
        this.loadPage(1);
      },
      error: (e) => this.error.set(apiErrorMessage(e, this.i18n.t('common.saveError'), this.i18n))
    });
  }

  remove(id: number): void {
    if (!confirm(this.i18n.t('medicines.confirmDelete'))) return;
    this.api.deleteMedicine(id).subscribe({
      next: () => {
        this.message.set(this.i18n.t('common.removed'));
        this.loadPage(1);
      },
      error: (e) => this.error.set(apiErrorMessage(e, this.i18n.t('common.deleteError'), this.i18n))
    });
  }

  pickCsv(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      this.api.importMedicinesCsv(file).subscribe({
        next: (r) => {
          this.message.set(r.message);
          this.loadPage(1);
        },
        error: (e) => this.error.set(e.error?.error || 'Błąd importu')
      });
    };
    input.click();
  }
}
