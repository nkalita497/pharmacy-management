import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService, DeliveryRow } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { apiErrorMessage } from '../../core/api-messages';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-deliveries',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="i18n.t('deliveries.title')" [subtitle]="i18n.t('deliveries.subtitle')">
      @if (auth.canCreateDeliveries()) {
        <button actions (click)="openForm()" class="ph-btn-primary">
          + {{ i18n.t('deliveries.add') }}
        </button>
      }
    </app-page-header>

    @if (loadError()) {
      <div class="ph-alert-banner font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-4 border-red-700 dark:border-red-400 shadow-[4px_4px_0_0_#b91c1c] dark:shadow-[4px_4px_0_0_#f87171] uppercase text-sm">
        {{ loadError() }}
      </div>
    }

    <div class="ph-page-body">
      <div class="ph-card ph-table-scroll bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)]">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-800 border-b-4 border-deep-navy dark:border-neon-green/60">
          <tr class="font-black uppercase text-xs tracking-wider text-deep-navy dark:text-lab-white">
            <th class="p-4 text-left">#</th>
            <th class="p-4 text-left">{{ i18n.t('deliveries.col.supplier') }}</th>
            <th class="p-4 text-left">{{ i18n.t('deliveries.col.medicine') }}</th>
            <th class="p-4 text-left">{{ i18n.t('deliveries.col.qty') }}</th>
            <th class="p-4 text-left">{{ i18n.t('deliveries.col.cost') }}</th>
            <th class="p-4 text-left">{{ i18n.t('deliveries.col.date') }}</th>
            @if (auth.canEditDeliveries()) { <th class="p-4 text-right">{{ i18n.t('common.actions') }}</th> }
          </tr>
          </thead>
          <tbody>
            @for (d of deliveries(); track d.id) {
              <tr class="border-b-2 border-deep-navy/10 dark:border-neon-green/20 font-bold hover:bg-acid-lime/20 dark:hover:bg-slate-700/50 transition-colors">
                <td class="p-4 whitespace-nowrap">{{ d.id }}</td>
                <td class="p-4">{{ d.supplier_name || d.supplier_id }}</td>
                <td class="p-4">{{ d.medicine_name || d.medicine_id }}</td>
                <td class="p-4">
                  <span class="bg-acid-lime dark:bg-emerald-800 text-deep-navy dark:text-lab-white px-2 py-1 text-xs border border-deep-navy dark:border-neon-green">
                    {{ d.quantity }}
                  </span>
                </td>
                <td class="p-4 tabular-nums">{{ d.cost | number:'1.2-2' }} {{ i18n.t('common.currency') }}</td>
                <td class="p-4 font-mono text-xs">{{ d.delivery_date }}</td>
                @if (auth.canEditDeliveries()) {
                  <td class="p-4">
                    <div class="ph-table-actions">
                      <button type="button" (click)="openForm(d)" class="ph-btn-edit">
                        {{ i18n.t('common.edit') }}
                      </button>
                      <button type="button" (click)="remove(d.id)" class="ph-btn-delete">
                        {{ i18n.t('common.delete') }}
                      </button>
                    </div>
                  </td>
                }
              </tr>
            } @empty {
              <tr><td colspan="7" class="p-8 text-center font-bold opacity-50 uppercase tracking-widest">{{ i18n.t('deliveries.empty') }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (showForm()) {
      <div class="fixed inset-0 bg-deep-navy/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" (click)="showForm.set(false)">
        <form (click)="$event.stopPropagation()" (ngSubmit)="save()" class="w-full max-w-md bg-white dark:bg-slate-900 p-6 sm:p-8 border-4 border-deep-navy dark:border-neon-green shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#39ff14] my-8">

          <h3 class="font-black uppercase text-xl mb-6 pb-2 border-b-4 border-deep-navy dark:border-neon-green/60 text-deep-navy dark:text-lab-white">
            {{ editing ? i18n.t('deliveries.edit') : i18n.t('deliveries.new') }}
          </h3>

          <div class="space-y-4 mb-6">
            <input [(ngModel)]="form.supplier_id" name="sid" type="number" [placeholder]="i18n.t('deliveries.placeholder.supplier')" class="ph-form-input" required>
            <input [(ngModel)]="form.medicine_id" name="mid" type="number" [placeholder]="i18n.t('deliveries.placeholder.medicine')" class="ph-form-input" required>
            <input [(ngModel)]="form.quantity" name="qty" type="number" [placeholder]="i18n.t('deliveries.placeholder.qty')" class="ph-form-input" required>
            <input [(ngModel)]="form.cost" name="cost" type="number" step="0.01" [placeholder]="i18n.t('deliveries.placeholder.cost')" class="ph-form-input" required>
            <input [(ngModel)]="form.delivery_date" name="date" type="date" class="ph-form-input" required>
          </div>

          <div class="ph-modal-actions">
            <button type="submit" class="ph-btn-save">
              {{ i18n.t('common.save') }}
            </button>
            <button type="button" (click)="showForm.set(false)" class="ph-btn-cancel">
              {{ i18n.t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    }
  `
})
export class DeliveriesComponent implements OnInit {
  deliveries = signal<DeliveryRow[]>([]);
  loadError = signal('');
  showForm = signal(false);
  editing: DeliveryRow | null = null;
  form: Partial<DeliveryRow> = {};

  constructor(
    private api: ApiService,
    public i18n: I18nService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.getDeliveries().subscribe({
      next: (d) => this.deliveries.set(d),
      error: (err) => this.loadError.set(apiErrorMessage(err, this.i18n.t('deliveries.loadError'), this.i18n))
    });
  }

  openForm(d?: DeliveryRow): void {
    this.editing = d ?? null;
    this.form = d ? { ...d } : { supplier_id: 1, medicine_id: 1, quantity: 1, cost: 0, delivery_date: new Date().toISOString().split('T')[0] };
    this.showForm.set(true);
  }

  save(): void {
    const req = this.editing
      ? this.api.updateDelivery(this.editing.id, this.form)
      : this.api.createDelivery(this.form);

    req.subscribe({
      next: () => {
        this.showForm.set(false);
        this.reload();
      },
      error: (err) => this.loadError.set(apiErrorMessage(err, this.i18n.t('common.saveError'), this.i18n))
    });
  }

  remove(id: number): void {
    if (!confirm(this.i18n.t('deliveries.confirmDelete'))) return;
    this.api.deleteDelivery(id).subscribe({
      next: () => this.reload(),
      error: (err) => this.loadError.set(apiErrorMessage(err, this.i18n.t('common.deleteError'), this.i18n))
    });
  }
}
