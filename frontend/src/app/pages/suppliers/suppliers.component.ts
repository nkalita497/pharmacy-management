import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { apiErrorMessage } from '../../core/api-messages';
import { Supplier } from '../../core/models';
import { I18nService } from '../../services/i18n.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="i18n.t('suppliers.title')" [subtitle]="i18n.t('suppliers.subtitle')">
      @if (auth.canManageSuppliers()) {
        <button actions type="button" (click)="openForm()" class="ph-btn-primary">
          + {{ i18n.t('suppliers.add') }}
        </button>
      }
    </app-page-header>

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
      @if (!loadError() && suppliers().length === 0) {
        <div class="ph-card bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)] p-12 text-center">
          <p class="font-black opacity-50 uppercase tracking-widest text-lg">{{ i18n.t('suppliers.empty') }}</p>
        </div>
      }

      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        @for (s of suppliers(); track s.id) {
          <article class="bg-white dark:bg-slate-900 p-6 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)] flex flex-col hover:-translate-y-1 transition-transform">

            <h3 class="text-2xl font-black uppercase mb-3 pb-3 border-b-4 border-deep-navy dark:border-neon-green/60 text-deep-navy dark:text-lab-white leading-tight break-words">
              {{ s.name }}
            </h3>

            <div class="space-y-3 mb-6 flex-1">
              <div>
                <p class="text-[10px] font-black uppercase opacity-60 tracking-widest">{{ i18n.t('suppliers.col.contact') }}</p>
                <p class="font-bold text-sm">{{ s.contact || '—' }}</p>
              </div>
              <div>
                <p class="text-[10px] font-black uppercase opacity-60 tracking-widest">{{ i18n.t('suppliers.col.email') }}</p>
                <p class="font-mono text-sm bg-gray-100 dark:bg-slate-800 px-2 py-1 inline-block border border-deep-navy/20 dark:border-neon-green/20 break-all">{{ s.email || '—' }}</p>
              </div>
              <div>
                <p class="text-[10px] font-black uppercase opacity-60 tracking-widest">{{ i18n.t('suppliers.col.phone') }}</p>
                <p class="font-mono text-sm">{{ s.phone || '—' }}</p>
              </div>
            </div>

            @if (auth.canManageSuppliers()) {
              <div class="pt-4 flex gap-3 border-t-2 border-deep-navy/10 dark:border-neon-green/20 mt-auto">
                <button type="button" (click)="openForm(s)" class="ph-btn-edit flex-1 py-2.5">
                  {{ i18n.t('common.edit') }}
                </button>
                <button type="button" (click)="remove(s.id)" class="ph-btn-delete flex-1 py-2.5">
                  {{ i18n.t('common.delete') }}
                </button>
              </div>
            }
          </article>
        }
      </div>
    </div>

    @if (showForm()) {
      <div class="fixed inset-0 bg-deep-navy/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" (click)="closeForm()">
        <form (click)="$event.stopPropagation()" (ngSubmit)="save()" class="w-full max-w-md bg-white dark:bg-slate-900 p-6 sm:p-8 border-4 border-deep-navy dark:border-neon-green shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#39ff14] space-y-5 my-8">

          <h3 class="text-2xl font-black uppercase border-b-4 border-deep-navy dark:border-neon-green/60 pb-3 text-deep-navy dark:text-lab-white tracking-wide">
            {{ editing ? i18n.t('suppliers.edit') : i18n.t('suppliers.new') }}
          </h3>

          <div class="space-y-4">
            <div>
              <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('suppliers.col.name') }}</label>
              <input [(ngModel)]="form.name" name="name" required class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('suppliers.col.contact') }}</label>
              <input [(ngModel)]="form.contact" name="contact" [placeholder]="i18n.t('suppliers.placeholder.contact')" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('suppliers.col.email') }}</label>
              <input [(ngModel)]="form.email" name="email" type="email" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('suppliers.col.phone') }}</label>
              <input [(ngModel)]="form.phone" name="phone" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">
            </div>
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
export class SuppliersComponent implements OnInit {
  suppliers = signal<Supplier[]>([]);
  showForm = signal(false);
  message = signal('');
  loadError = signal('');
  error = signal('');

  // Właściwości dla ngModel
  editing: Supplier | null = null;
  form: Partial<Supplier> = { name: '', contact: '', email: '', phone: '' };

  constructor(private api: ApiService, public i18n: I18nService, public auth: AuthService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loadError.set('');
    this.api.getSuppliers().subscribe({
      next: (s) => this.suppliers.set(s),
      error: (err) => {
        this.suppliers.set([]);
        this.loadError.set(apiErrorMessage(err, this.i18n.t('suppliers.loadError'), this.i18n));
      }
    });
  }

  openForm(s?: Supplier): void {
    this.editing = s ?? null;
    this.form = s ? { ...s } : { name: '', contact: '', email: '', phone: '' };
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    const req = this.editing
      ? this.api.updateSupplier(this.editing.id, this.form)
      : this.api.createSupplier(this.form);

    req.subscribe({
      next: () => {
        this.showForm.set(false);
        this.message.set(this.i18n.t('suppliers.saved'));
        this.error.set('');
        this.reload();
      },
      error: (err) => this.error.set(apiErrorMessage(err, this.i18n.t('common.saveError'), this.i18n))
    });
  }

  remove(id: number): void {
    if (!confirm(this.i18n.t('suppliers.confirmDelete'))) return;
    this.api.deleteSupplier(id).subscribe({
      next: () => {
        this.message.set(this.i18n.t('common.removed'));
        this.reload();
      },
      error: (err) => this.error.set(apiErrorMessage(err, this.i18n.t('common.deleteError'), this.i18n))
    });
  }
}
