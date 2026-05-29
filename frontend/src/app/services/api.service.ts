import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DashboardAlerts,
  Medicine,
  PaginatedResult,
  Patient,
  Prescription,
  Sale,
  SearchHit,
  Supplier
} from '../core/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Auth & System
  getCaptcha(): Observable<{ captchaId: string; svg: string; enabled: boolean }> {
    return this.http.get<{ captchaId: string; svg: string; enabled: boolean }>(`${this.base}/auth/captcha`);
  }

  search(q: string): Observable<{ query: string; count: number; results: SearchHit[] }> {
    return this.http.get<{ query: string; count: number; results: SearchHit[] }>(`${this.base}/search`, {
      params: { q }
    });
  }

  getPreferences(): Observable<{ theme: 'light' | 'dark'; locale: string }> {
    return this.http.get<{ theme: 'light' | 'dark'; locale: string }>(`${this.base}/preferences`);
  }

  getDashboardAlerts(): Observable<DashboardAlerts> {
    return this.http.get<DashboardAlerts>(`${this.base}/dashboard/alerts`);
  }

  // Medicines
  getMedicinesPage(page = 1, limit = 20, q = ''): Observable<PaginatedResult<Medicine>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (q) params = params.set('q', q);
    return this.http.get<PaginatedResult<Medicine>>(`${this.base}/medicines`, { params });
  }

  getMedicines(): Observable<Medicine[]> {
    return this.getMedicinesPage(1, 500).pipe(map((r) => r.data));
  }

  createMedicine(body: Partial<Medicine>): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/medicines`, body);
  }

  updateMedicine(id: number, body: Partial<Medicine>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/medicines/${id}`, body);
  }

  deleteMedicine(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/medicines/${id}`);
  }

  importMedicinesCsv(file: File): Observable<{ message: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ message: string }>(`${this.base}/medicines/import`, form);
  }

  // Suppliers
  getSuppliers(): Observable<Supplier[]> {
    return this.http
      .get<PaginatedResult<Supplier>>(`${this.base}/suppliers`, { params: { limit: '500' } })
      .pipe(map((r) => r.data));
  }

  createSupplier(body: Partial<Supplier>): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/suppliers`, body);
  }

  updateSupplier(id: number, body: Partial<Supplier>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/suppliers/${id}`, body);
  }

  deleteSupplier(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/suppliers/${id}`);
  }

  // Patients
  getPatients(): Observable<Patient[]> {
    return this.http
      .get<PaginatedResult<Patient>>(`${this.base}/patients`, { params: { limit: '500' } })
      .pipe(map((r) => r.data));
  }

  createPatient(body: Partial<Patient>): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/patients`, body);
  }

  updatePatient(id: number, body: Partial<Patient>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/patients/${id}`, body);
  }

  deletePatient(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/patients/${id}`);
  }

  // Prescriptions
  getPrescriptions(): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.base}/prescriptions`);
  }

  createPrescription(body: Partial<Prescription>): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/prescriptions`, body);
  }

  updatePrescription(id: number, body: Partial<Prescription>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/prescriptions/${id}`, body);
  }

  deletePrescription(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/prescriptions/${id}`);
  }

  realizePrescription(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/prescriptions/${id}/realize`, {});
  }

  // Sales
  getSales(): Observable<Sale[]> {
    return this.http.get<Sale[]>(`${this.base}/sales`);
  }

  createSale(body: any): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/sales`, body);
  }

  updateSale(id: number, body: any): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/sales/${id}`, body);
  }

  deleteSale(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/sales/${id}`);
  }

  downloadSalesReportPdf(): Observable<Blob> {
    return this.http.get(`${this.base}/sales/report/pdf`, { responseType: 'blob' });
  }

  // MFA
  mfaSetup(): Observable<{ secret: string; otpauthUrl: string; qrCode: string }> {
    return this.http.post<{ secret: string; otpauthUrl: string; qrCode: string }>(`${this.base}/auth/mfa/setup`, {});
  }

  mfaEnable(code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/mfa/enable`, { code });
  }

  mfaDisable(password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/mfa/disable`, { password });
  }

  // Deliveries (Dostawy)
  getDeliveries(): Observable<DeliveryRow[]> {
    return this.http.get<DeliveryRow[]>(`${this.base}/deliveries`);
  }

  createDelivery(body: Partial<DeliveryRow>): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/deliveries`, body);
  }

  updateDelivery(id: number, body: Partial<DeliveryRow>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/deliveries/${id}`, body);
  }

  deleteDelivery(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/deliveries/${id}`);
  }

  // Audit
  getAuditLog(): Observable<AuditEntry[]> {
    return this.http.get<AuditEntry[]>(`${this.base}/audit`);
  }
}

export interface DeliveryRow {
  id: number;
  supplier_id: number;
  medicine_id: number;
  quantity: number;
  delivery_date: string;
  cost: number;
  supplier_name?: string;
  medicine_name?: string;
}

export interface AuditEntry {
  id: number;
  user_id?: number;
  username?: string;
  action: string;
  entity_type?: string;
  entity_id?: number;
  old_value?: string;
  new_value?: string;
  timestamp: string;
}
