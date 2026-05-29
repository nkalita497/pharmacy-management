import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ApiService } from '../../services/api.service';
import { I18nService } from '../../services/i18n.service';
import { apiErrorMessage } from '../../core/api-messages';
import { Patient } from '../../core/models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="i18n.t('patients.title')" [subtitle]="i18n.t('patients.subtitle')">
      @if (auth.canManagePatients()) {
        <button actions type="button" (click)="openForm()" class="ph-btn-primary">
          + {{ i18n.t('patients.add') }}
        </button>
      }
    </app-page-header>

    <!-- KOMUNIKATY (ALERTY) -->
    @if (message()) {
      <div class="ph-alert-banner font-black bg-acid-lime dark:bg-neon-green text-deep-navy border-4 border-deep-navy shadow-[4px_4px_0_0_#0f172a] uppercase text-sm tracking-wide">
        {{ message() }}
      </div>
    }
    @if (loadError()) {
      <div class="ph-alert-banner font-black bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-4 border-red-700 dark:border-red-400 shadow-[4px_4px_0_0_#b91c1c] dark:shadow-[4px_4px_0_0_#f87171] uppercase text-sm tracking-wide">
        {{ loadError() }}
      </div>
    }

    <div class="ph-page-body">
      @if (!loadError() && patients().length === 0) {
        <div class="ph-card bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)] p-12 text-center">
          <p class="font-black opacity-50 uppercase tracking-widest text-lg">{{ i18n.t('patients.empty') }}</p>
        </div>
      } @else {
        <!-- TABELA -->
        <div class="ph-card ph-table-scroll bg-white dark:bg-slate-900 border-2 border-deep-navy dark:border-neon-green/60 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_rgba(57,255,20,0.4)]">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-slate-800 border-b-4 border-deep-navy dark:border-neon-green/60">
            <tr class="font-black uppercase text-xs tracking-wider text-deep-navy dark:text-lab-white">
              <th class="p-4 text-left">{{ i18n.t('patients.col.name') }}</th>
              <th class="p-4 text-left">{{ i18n.t('patients.col.pesel') }}</th>
              <th class="p-4 text-left">{{ i18n.t('patients.col.email') }}</th>
              <th class="p-4 text-left">{{ i18n.t('patients.col.phone') }}</th>
              <th class="p-4 text-left"></th>
            </tr>
            </thead>
            <tbody>
              @for (p of patients(); track p.id) {
                <tr class="border-b-2 border-deep-navy/10 dark:border-neon-green/20 font-bold hover:bg-acid-lime/20 dark:hover:bg-slate-700/50 transition-colors">
                  <td class="p-4 whitespace-nowrap">{{ p.first_name }} {{ p.last_name }}</td>
                  <td class="p-4 font-mono text-xs"><span class="bg-gray-100 dark:bg-slate-800 px-2 py-1 border border-deep-navy/20 dark:border-neon-green/20">{{ p.pesel || '—' }}</span></td>
                  <td class="p-4">{{ p.email || '—' }}</td>
                  <td class="p-4 font-mono text-xs">{{ p.phone || '—' }}</td>
                  <td class="p-4">
                    <div class="ph-table-actions">
                    @if (auth.canManagePatients()) {
                      <button type="button" (click)="openForm(p)" class="ph-btn-edit">
                        {{ i18n.t('common.edit') }}
                      </button>
                      <button type="button" (click)="remove(p.id)" class="ph-btn-delete">
                        {{ i18n.t('common.delete') }}
                      </button>
                    }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- MODAL FORMULARZA -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-deep-navy/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" (click)="closeForm()">
        <form (click)="$event.stopPropagation()" (ngSubmit)="save()" class="w-full max-w-md bg-white dark:bg-slate-900 p-6 sm:p-8 border-4 border-deep-navy dark:border-neon-green shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#39ff14] space-y-5 my-8">

          <h3 class="text-2xl font-black uppercase border-b-4 border-deep-navy dark:border-neon-green/60 pb-3 text-deep-navy dark:text-lab-white tracking-wide">
            {{ editing ? i18n.t('patients.edit') : i18n.t('patients.new') }}
          </h3>

          <div class="grid grid-cols-2 gap-4">
            <input [(ngModel)]="form.first_name" name="fn" required [placeholder]="i18n.t('patients.placeholder.firstName')" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">
            <input [(ngModel)]="form.last_name" name="ln" required [placeholder]="i18n.t('patients.placeholder.lastName')" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">
          </div>

          <input [(ngModel)]="form.pesel" name="pesel" [placeholder]="i18n.t('patients.col.pesel')" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white">

          <input [(ngModel)]="form.email" name="email" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white" [placeholder]="i18n.t('patients.placeholder.email')">

          <input [(ngModel)]="form.phone" name="phone" class="w-full p-3 font-bold bg-gray-50 dark:bg-slate-800 border-2 border-deep-navy dark:border-neon-green shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(57,255,20,0.4)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#39ff14] transition-all text-deep-navy dark:text-lab-white" [placeholder]="i18n.t('patients.placeholder.phone')">

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
export class PatientsComponent implements OnInit {
  patients = signal<Patient[]>([]);
  showForm = signal(false);
  message = signal('');
  loadError = signal('');

  // Właściwości standardowe dla formularzy (aby [(ngModel)] działał natywnie)
  editing: Patient | null = null;
  form: Partial<Patient> = { first_name: '', last_name: '', pesel: '', email: '', phone: '' };

  constructor(
    private api: ApiService,
    public i18n: I18nService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set('');
    this.api.getPatients().subscribe({
      next: (p) => this.patients.set(p),
      error: (err) => {
        this.patients.set([]);
        this.loadError.set(apiErrorMessage(err, this.i18n.t('patients.loadError'), this.i18n));
      }
    });
  }

  openForm(p?: Patient): void {
    this.editing = p ?? null;
    this.form = p ? { ...p } : { first_name: '', last_name: '', pesel: '', email: '', phone: '' };
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    const req = this.editing
      ? this.api.updatePatient(this.editing.id, this.form)
      : this.api.createPatient(this.form);

    req.subscribe({
      next: () => {
        this.showForm.set(false);
        this.message.set(this.i18n.t('patients.saved'));
        this.load();
      },
      error: (err) => this.loadError.set(apiErrorMessage(err, this.i18n.t('patients.saveError'), this.i18n))
    });
  }

  remove(id: number): void {
    if (!confirm(this.i18n.t('patients.confirmDelete'))) return;
    this.api.deletePatient(id).subscribe({
      next: () => {
        this.message.set(this.i18n.t('common.removed'));
        this.load();
      }
    });
  }
}
