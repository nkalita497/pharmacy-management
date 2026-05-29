export type UserRole = 'admin' | 'pharmacist' | 'cashier';

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

export interface Medicine {
  id: number;
  name: string;
  description?: string;
  category?: string;
  supplier_id?: number;
  price: number;
  stock: number;
  expiry_date?: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  pesel?: string;
  email?: string;
  phone?: string;
}

export interface Prescription {
  id: number;
  patient_id: number;
  medicine_id: number;
  quantity: number;
  doctor_name?: string;
  prescription_date?: string;
  expiry_date?: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface Sale {
  id: number;
  prescription_id?: number;
  medicine_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  user_id: number;
  sale_date?: string;
}

export interface ExpiryAlert {
  batch_id: number;
  batch_number?: string;
  stock: number;
  expiry_date: string;
  medicine_name: string;
}

export interface LowStockAlert {
  medicine_id: number;
  medicine_name: string;
  total_stock: number | null;
}

export interface DashboardAlerts {
  expiryAlerts: ExpiryAlert[];
  lowStockAlerts: LowStockAlert[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sort: string;
  order: string;
  q: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PageMeta;
}

export interface SearchHit {
  entity_type: string;
  entity_id: number;
  title: string;
  body: string;
  rank: number;
}
