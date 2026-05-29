import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Medicine, Sale } from '../../core/models';
import { apiErrorMessage } from '../../core/api-messages';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, RouterLink],
  template: `
    <app-page-header [title]="i18n.t('sales.title')" [subtitle]="i18n.t('sales.subtitle')">
      <div actions class="ph-page-actions">
        <button type="button" (click)="openForm()" class="ph-btn-primary">
          + {{ i18n.t('sales.add') }}
        </button>
        @if (auth.canDownloadSalesReport()) {
          <button type="button" (click)="downloadPdf()" class="ph-btn-secondary">
            {{ i18n.t('sales.pdf') }}
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

    <div class="ph-page-body grid lg:grid-cols-3 gap-6">
      <!-- TABELA -->
      <div class="lg:col-span-2 ph-card ph-table-scroll bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)] self-start">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-800 border-b-4 border-deep-navy dark:border-neon-green/60">
          <tr class="font-black uppercase text-xs tracking-wider text-deep-navy dark:text-lab-white">
            <th class="p-4 text-left">#</th>
            <th class="p-4 text-left">{{ i18n.t('sales.col.medicine') }}</th>
            <th class="p-4 text-left">{{ i18n.t('sales.col.qty') }}</th>
            <th class="p-4 text-left">{{ i18n.t('sales.col.total') }}</th>
            <th class="p-4 text-left">{{ i18n.t('sales.col.date') }}</th>
            @if (auth.canEditSales()) { <th class="p-4"></th> }
          </tr>
          </thead>
          <tbody>
            @for (s of sales(); track s.id) {
              <tr class="border-b-2 border-deep-navy/10 dark:border-neon-green/20 font-bold hover:bg-acid-lime/20 dark:hover:bg-slate-700/50 transition-colors">
                <td class="p-4 whitespace-nowrap">{{ s.id }}</td>
                <td class="p-4">{{ medicineLabel(s.medicine_id) }}</td>
                <td class="p-4">
                  <span class="bg-acid-lime dark:bg-emerald-800 text-deep-navy dark:text-lab-white px-2 py-1 text-xs font-black border border-deep-navy dark:border-neon-green">
                    {{ s.quantity }}
                  </span>
                </td>
                <td class="p-4 tabular-nums">{{ s.total_price | number:'1.2-2' }} {{ i18n.t('common.currency') }}</td>
                <td class="p-4 font-mono text-xs opacity-80">{{ s.sale_date | date:'dd.MM.yyyy HH:mm' }}</td>
                @if (auth.canEditSales()) {
                  <td class="p-4">
                    <div class="ph-table-actions">
                    <button type="button" (click)="openForm(s)" class="ph-btn-edit">
                      {{ i18n.t('common.edit') }}
                    </button>
                    <button type="button" (click)="remove(s.id)" class="ph-btn-delete">
                      {{ i18n.t('common.delete') }}
                    </button>
                    </div>
                  </td>
                }
              </tr>
            } @empty {
              <tr><td colspan="6" class="p-8 text-center font-bold opacity-50 uppercase tracking-widest">{{ i18n.t('sales.empty') }}</td></tr>
            }
          </tbody>
        </table>
      </div>

      <!-- PODSUMOWANIE (SIDEBAR) -->
      <aside class="ph-card bg-acid-lime/20 dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#39ff14] p-6 sm:p-8 flex flex-col self-start lg:sticky lg:top-6">
        <h3 class="font-black uppercase mb-6 pb-2 border-b-4 border-deep-navy dark:border-neon-green/60 text-lg text-deep-navy dark:text-lab-white">
          {{ i18n.t('sales.summary') }}
        </h3>

        <div class="space-y-6">
          <div>
            <p class="font-bold uppercase text-xs opacity-70 mb-1 tracking-widest">{{ i18n.t('sales.txCount') }}</p>
            <p class="text-4xl font-black text-deep-navy dark:text-neon-green">{{ sales().length }}</p>
          </div>

          <div>
            <p class="font-bold uppercase text-xs opacity-70 mb-1 tracking-widest">{{ i18n.t('sales.revenue') }}</p>
            <p class="text-3xl font-black text-deep-navy dark:text-lab-white tabular-nums">{{ totalRevenue() | number:'1.2-2' }} <span class="text-xl">PLN</span></p>
          </div>
        </div>

        @if (auth.canAccessAudit()) {
          <a routerLink="/audit" class="mt-8 block text-center bg-white dark:bg-slate-800 text-deep-navy dark:text-lab-white py-3.5 uppercase font-black text-[10px] tracking-widest border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#39ff14] hover:-translate-y-1 hover:bg-acid-lime dark:hover:bg-slate-700 hover:shadow-[6px_6px_0_0_#0f172a] dark:hover:shadow-[6px_6px_0_0_#39ff14] transition-all">
            {{ i18n.t('sales.viewAudit') }}
          </a>
        }
      </aside>
    </div>

    <!-- MODAL FORMULARZA -->
    @if (showSaleForm()) {
      <div class="fixed inset-0 bg-deep-navy/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" (click)="closeForm()">
        <form (click)="$event.stopPropagation()" (ngSubmit)="save()" class="w-full max-w-md bg-white dark:bg-slate-900 p-6 sm:p-8 border-4 border-deep-navy dark:border-neon-green shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#39ff14] space-y-5 my-8">

          <h3 class="text-2xl font-black uppercase border-b-4 border-deep-navy dark:border-neon-green/60 pb-3 text-deep-navy dark:text-lab-white tracking-wide">
            {{ editing() ? i18n.t('common.edit') : i18n.t('sales.new') }}
          </h3>

          <div>
            <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('sales.label.medicine') }}</label>
            <select [(ngModel)]="saleForm.medicine_id" name="med" required class="ph-form-input cursor-pointer" (ngModelChange)="onMedicinePick()">
              @for (m of medicines(); track m.id) {
                <option [ngValue]="m.id">{{ m.name }} — {{ m.price }} {{ i18n.t('common.currency') }}</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('sales.label.qty') }}</label>
              <input type="number" [(ngModel)]="saleForm.quantity" name="qty" min="1" required class="ph-form-input">
            </div>
            <div>
              <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('sales.label.unitPrice') }}</label>
              <input type="number" [(ngModel)]="saleForm.unit_price" name="price" step="0.01" required class="ph-form-input">
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('sales.label.prescription') }}</label>
            <input type="number" [(ngModel)]="saleForm.prescription_id" name="rx" [placeholder]="i18n.t('sales.placeholder.rx')" class="ph-form-input">
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
export class SalesComponent implements OnInit {
  sales = signal<Sale[]>([]);
  medicines = signal<Medicine[]>([]);
  showSaleForm = signal(false);
  editing = signal<Sale | null>(null);
  message = signal('');
  loadError = signal('');
  error = signal('');

  saleForm = { medicine_id: 1, quantity: 1, unit_price: 0, prescription_id: undefined as number | undefined };
  totalRevenue = computed(() => this.sales().reduce((s, x) => s + (x.total_price || 0), 0));

  constructor(public auth: AuthService, private api: ApiService, public i18n: I18nService) {}

  ngOnInit(): void {
    this.reload();
    this.api.getMedicines().subscribe({
      next: (m) => this.medicines.set(m)
    });
  }

  reload(): void {
    this.api.getSales().subscribe({
      next: (s) => this.sales.set(s),
      error: (err) => this.loadError.set(apiErrorMessage(err, this.i18n.t('sales.loadError'), this.i18n))
    });
  }

  medicineLabel(id: number): string {
    return this.medicines().find((m) => m.id === id)?.name ?? `#${id}`;
  }

  onMedicinePick(): void {
    const m = this.medicines().find((x) => x.id === this.saleForm.medicine_id);
    if (m) this.saleForm.unit_price = m.price;
  }

  openForm(s?: Sale): void {
    if (s) {
      this.editing.set(s);
      this.saleForm = { medicine_id: s.medicine_id, quantity: s.quantity, unit_price: s.unit_price, prescription_id: s.prescription_id };
    } else {
      this.editing.set(null);
      this.saleForm = { medicine_id: 1, quantity: 1, unit_price: 0, prescription_id: undefined };
    }
    this.showSaleForm.set(true);
  }

  closeForm(): void { this.showSaleForm.set(false); }

  save(): void {
    const req = this.editing()
      ? this.api.updateSale(this.editing()!.id, this.saleForm)
      : this.api.createSale(this.saleForm);

    req.subscribe({
      next: () => {
        this.message.set(this.i18n.t('common.saved'));
        this.error.set('');
        this.showSaleForm.set(false);
        this.reload();
      },
      error: (e) => this.error.set(apiErrorMessage(e, this.i18n.t('common.saveError'), this.i18n))
    });
  }

  remove(id: number): void {
    if (!confirm(this.i18n.t('sales.confirmDelete'))) return;
    this.api.deleteSale(id).subscribe({
      next: () => {
        this.message.set(this.i18n.t('common.removed'));
        this.error.set('');
        this.reload();
      },
      error: (e) => this.error.set(apiErrorMessage(e, this.i18n.t('common.deleteError'), this.i18n))
    });
  }

  downloadPdf(): void {
    this.api.downloadSalesReportPdf().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'raport_sprzedazy.pdf';
        a.click();
      }
    });
  }
}
