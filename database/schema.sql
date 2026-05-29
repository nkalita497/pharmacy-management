-- System zarządzania apteką (model zgodny z API)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'pharmacist', 'cashier')),
  email TEXT,
  mfa_secret TEXT,
  mfa_enabled INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY,
  theme TEXT DEFAULT 'light' CHECK(theme IN ('light', 'dark')),
  locale TEXT DEFAULT 'pl' CHECK(locale IN ('pl', 'en', 'fr')),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  supplier_id INTEGER,
  price REAL NOT NULL,
  stock INTEGER DEFAULT 0,
  expiry_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  pesel TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  medicine_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  doctor_name TEXT,
  prescription_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(patient_id) REFERENCES patients(id),
  FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id INTEGER,
  medicine_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  user_id INTEGER NOT NULL,
  sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(prescription_id) REFERENCES prescriptions(id),
  FOREIGN KEY(medicine_id) REFERENCES medicines(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  medicine_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  delivery_date DATE,
  cost REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_medicines_supplier ON medicines(supplier_id);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_patients_pesel ON patients(pesel);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
