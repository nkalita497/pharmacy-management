import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { MainLayoutComponent } from './layout/main-layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MedicinesComponent } from './pages/medicines/medicines.component';
import { SuppliersComponent } from './pages/suppliers/suppliers.component';
import { PatientsComponent } from './pages/patients/patients.component';
import { PrescriptionsComponent } from './pages/prescriptions/prescriptions.component';
import { SalesComponent } from './pages/sales/sales.component';
import { AuditComponent } from './pages/audit/audit.component';
import { DeliveriesComponent } from './pages/deliveries/deliveries.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { auditGuard, authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'medicines', component: MedicinesComponent },
      { path: 'suppliers', component: SuppliersComponent },
      { path: 'patients', component: PatientsComponent },
      { path: 'prescriptions', component: PrescriptionsComponent },
      { path: 'sales', component: SalesComponent },
      { path: 'deliveries', component: DeliveriesComponent },
      { path: 'audit', component: AuditComponent, canActivate: [auditGuard] },
      { path: 'settings', component: SettingsComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
