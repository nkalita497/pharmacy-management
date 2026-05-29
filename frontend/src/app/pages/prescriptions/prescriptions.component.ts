import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';
import { apiErrorMessage } from '../../core/api-messages';
import { Medicine, Patient, Prescription } from '../../core/models';

@Component({
  selector: 'app-prescriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="i18n.t('prescriptions.title')" [subtitle]="i18n.t('prescriptions.subtitle')">
      @if (auth.canManagePrescriptions()) {
        <button actions type="button" (click)="openForm()" class="ph-btn-primary">
          + {{ i18n.t('prescriptions.add') }}
        </button>
      }
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

    <div class="ph-page-body space-y-6">
      @if (!loadError() && prescriptions().length === 0) {
        <div class="ph-card bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)] p-12 text-center">
          <p class="font-black opacity-50 uppercase tracking-widest text-lg">{{ i18n.t('prescriptions.empty') }}</p>
        </div>
      }

      <!-- KARTY RECEPT -->
      <div class="grid grid-cols-1 gap-6">
        @for (rx of prescriptions(); track rx.id) {
          <article class="bg-white dark:bg-slate-900 p-5 sm:p-6 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:-translate-y-1 transition-transform">

            <div class="flex-1 space-y-2">
              <div class="flex items-center gap-3 mb-3">
                <span class="text-[10px] font-black uppercase opacity-60 tracking-widest bg-gray-100 dark:bg-slate-800 px-2 py-1 border border-deep-navy/20 dark:border-neon-green/20">
                  {{ i18n.t('prescriptions.label') }} #{{ rx.id }}
                </span>
                <span
                  class="px-2 py-1 border-2 border-deep-navy font-black uppercase text-[10px] tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#000000]"
                  [class.bg-neon-green]="rx.status === 'completed'"
                  [class.text-deep-navy]="rx.status === 'completed'"
                  [class.dark:border-neon-green]="rx.status === 'completed'"

                  [class.bg-acid-lime]="rx.status === 'pending'"
                  [class.text-deep-navy]="rx.status === 'pending'"
                  [class.dark:bg-amber-400]="rx.status === 'pending'"
                  [class.dark:border-amber-400]="rx.status === 'pending'"

                  [class.bg-red-500]="rx.status === 'cancelled'"
                  [class.text-white]="rx.status === 'cancelled'"
                  [class.dark:bg-red-600]="rx.status === 'cancelled'"
                  [class.dark:border-red-600]="rx.status === 'cancelled'"
                >
                  {{ statusLabel(rx.status) }}
                </span>
              </div>

              <p class="font-black uppercase text-xl text-deep-navy dark:text-lab-white leading-tight">
                {{ patientLabel(rx.patient_id) }} <span class="text-acid-lime dark:text-neon-green">→</span> {{ medicineLabel(rx.medicine_id) }}
              </p>

              <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm font-bold opacity-80 pt-1">
                <p><span class="opacity-50 uppercase text-[10px] tracking-widest mr-1">{{ i18n.t('prescriptions.qty') }}:</span> {{ rx.quantity }}</p>
                <p><span class="opacity-50 uppercase text-[10px] tracking-widest mr-1">{{ i18n.t('prescriptions.doctor') }}:</span> {{ rx.doctor_name || '—' }}</p>
                <p><span class="opacity-50 uppercase text-[10px] tracking-widest mr-1">{{ i18n.t('prescriptions.label.date') }}:</span> <span class="font-mono">{{ rx.prescription_date }}</span></p>
                <p><span class="opacity-50 uppercase text-[10px] tracking-widest mr-1">{{ i18n.t('prescriptions.validUntil') }}:</span> <span class="font-mono text-red-600 dark:text-red-400">{{ rx.expiry_date || '—' }}</span></p>
              </div>
            </div>

            <!-- AKCJE NA KARCIE -->
            <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t-2 lg:border-t-0 border-deep-navy/10 dark:border-neon-green/20">
              @if (auth.canRealizePrescriptions() && rx.status === 'pending') {
                <button type="button" (click)="realize(rx.id)" class="ph-btn-primary w-full sm:w-auto">
                  {{ i18n.t('prescriptions.realize') }}
                </button>
              }

              <div class="ph-table-actions w-full sm:w-auto">
                @if (auth.canManagePrescriptions()) {
                  <button type="button" (click)="openForm(rx)" class="ph-btn-edit px-4 py-2.5">
                    {{ i18n.t('common.edit') }}
                  </button>
                  <button type="button" (click)="remove(rx.id)" class="ph-btn-delete px-4 py-2.5">
                    {{ i18n.t('common.delete') }}
                  </button>
                }
              </div>
            </div>
          </article>
        }
      </div>
    </div>

    <!-- MODAL FORMULARZA -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-deep-navy/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" (click)="closeForm()">
        <form (click)="$event.stopPropagation()" (ngSubmit)="save()" class="w-full max-w-lg bg-white dark:bg-slate-900 p-6 sm:p-8 border-4 border-deep-navy dark:border-neon-green shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#39ff14] space-y-5 my-8">

          <h3 class="text-2xl font-black uppercase border-b-4 border-deep-navy dark:border-neon-green/60 pb-3 text-deep-navy dark:text-lab-white tracking-wide">
            {{ editing ? i18n.t('prescriptions.edit') : i18n.t('prescriptions.new') }}
          </h3>

          @if (patients().length === 0 || medicines().length === 0) {
            <p class="p-3 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-black border-2 border-red-700 dark:border-red-400 uppercase text-xs">
              {{ i18n.t('prescriptions.needData') }}
            </p>
          }

          <div class="space-y-4">
            <div>
              <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('prescriptions.label.patient') }}</label>
              <select [(ngModel)]="form.patient_id" name="pat" required class="ph-form-input cursor-pointer">
                @for (p of patients(); track p.id) {
                  <option [ngValue]="p.id">{{ p.first_name }} {{ p.last_name }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('prescriptions.label.medicine') }}</label>
              <select [(ngModel)]="form.medicine_id" name="med" required class="ph-form-input cursor-pointer">
                @for (m of medicines(); track m.id) {
                  <option [ngValue]="m.id">{{ m.name }} ({{ i18n.t('prescriptions.stock') }}: {{ m.stock }})</option>
                }
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('prescriptions.qty') }}</label>
                <input type="number" [(ngModel)]="form.quantity" name="qty" required min="1" class="ph-form-input" [placeholder]="i18n.t('prescriptions.placeholder.qty')">
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('prescriptions.doctor') }}</label>
                <input [(ngModel)]="form.doctor_name" name="doc" class="ph-form-input" [placeholder]="i18n.t('prescriptions.placeholder.doctor')">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('prescriptions.label.date') }}</label>
                <input type="date" [(ngModel)]="form.prescription_date" name="pd" class="ph-form-input uppercase text-xs">
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('prescriptions.validUntil') }}</label>
                <input type="date" [(ngModel)]="form.expiry_date" name="ed" class="ph-form-input uppercase text-xs">
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase opacity-70 mb-1 ml-1">{{ i18n.t('prescriptions.label.status') }}</label>
              <select [(ngModel)]="form.status" name="st" class="ph-form-input cursor-pointer">
                <option value="pending">{{ i18n.t('status.pending') }}</option>
                <option value="completed">{{ i18n.t('status.completed') }}</option>
                <option value="cancelled">{{ i18n.t('status.cancelled') }}</option>
              </select>
            </div>
          </div>

          <div class="ph-modal-actions">
            <button type="submit" [disabled]="!patients().length || !medicines().length" class="ph-btn-save disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-[4px] disabled:translate-y-[4px] disabled:hover:translate-y-[4px]">
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
export class PrescriptionsComponent implements OnInit {
  prescriptions = signal<Prescription[]>([]);
  patients = signal<Patient[]>([]);
  medicines = signal<Medicine[]>([]);
  showForm = signal(false);
  message = signal('');
  error = signal('');
  loadError = signal('');

  // Właściwości standardowe dla formularzy
  editing: Prescription | null = null;
  form: Partial<Prescription> = this.empty();

  constructor(
    public auth: AuthService,
    private api: ApiService,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.reload();
    this.api.getPatients().subscribe({
      next: (p) => this.patients.set(p),
      error: (err) => this.loadError.set(apiErrorMessage(err, this.i18n.t('patients.loadError'), this.i18n))
    });
    this.api.getMedicines().subscribe({
      next: (m) => this.medicines.set(m),
      error: (err) => this.loadError.set(apiErrorMessage(err, this.i18n.t('prescriptions.loadError'), this.i18n))
    });
  }

  empty(): Partial<Prescription> {
    const today = new Date().toISOString().split('T')[0];
    return {
      patient_id: 0,
      medicine_id: 0,
      quantity: 1,
      doctor_name: '',
      prescription_date: today,
      expiry_date: today,
      status: 'pending'
    };
  }

  reload(): void {
    this.loadError.set('');
    this.api.getPrescriptions().subscribe({
      next: (r) => this.prescriptions.set(r),
      error: (err) => {
        this.prescriptions.set([]);
        this.loadError.set(apiErrorMessage(err, this.i18n.t('prescriptions.loadError'), this.i18n));
      }
    });
  }

  patientLabel(id: number): string {
    const p = this.patients().find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : `${this.i18n.t('prescriptions.patientFallback')} #${id}`;
  }

  medicineLabel(id: number): string {
    return this.medicines().find((m) => m.id === id)?.name ?? `${this.i18n.t('prescriptions.medicineFallback')} #${id}`;
  }

  statusLabel(s: string): string {
    return this.i18n.statusLabel(s);
  }

  openForm(rx?: Prescription): void {
    this.editing = rx ?? null;
    this.form = rx ? { ...rx } : this.empty();
    if (this.patients().length) this.form.patient_id = this.form.patient_id || this.patients()[0].id;
    if (this.medicines().length) this.form.medicine_id = this.form.medicine_id || this.medicines()[0].id;
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    const req = this.editing
      ? this.api.updatePrescription(this.editing.id, this.form)
      : this.api.createPrescription(this.form);
    req.subscribe({
      next: () => {
        this.showForm.set(false);
        this.message.set(this.i18n.t('prescriptions.saved'));
        this.error.set('');
        this.reload();
      },
      error: (e) => this.error.set(apiErrorMessage(e, this.i18n.t('prescriptions.saveError'), this.i18n))
    });
  }

  realize(id: number): void {
    this.api.realizePrescription(id).subscribe({
      next: (r) => {
        this.message.set(r.message);
        this.error.set('');
        this.reload();
        this.api.getMedicines().subscribe((m) => this.medicines.set(m));
      },
      error: (e) => this.error.set(apiErrorMessage(e, this.i18n.t('prescriptions.realizeError'), this.i18n))
    });
  }

  remove(id: number): void {
    if (!confirm(this.i18n.t('prescriptions.confirmDelete'))) return;
    this.api.deletePrescription(id).subscribe(() => {
      this.message.set(this.i18n.t('common.removed'));
      this.reload();
    });
  }
}
