/**
 * @swagger
 * components:
 * schemas:
 * User:
 * type: object
 * properties:
 * id:
 * type: integer
 * username:
 * type: string
 * password:
 * type: string
 * full_name:
 * type: string
 * role:
 * type: string
 * enum: [admin, pharmacist, cashier]
 * email:
 * type: string
 * phone:
 * type: string
 * is_active:
 * type: integer
 * description: 1 for active, 0 for inactive
 * created_at:
 * type: string
 * format: date-time
 * updated_at:
 * type: string
 * format: date-time
 */
export interface User {
    id: number;
    username: string;
    password: string;
    full_name: string;
    role: 'admin' | 'pharmacist' | 'cashier';
    email?: string;
    phone?: string;
    is_active: number;
    created_at: string;
    updated_at: string;
}
/**
 * @swagger
 * components:
 * schemas:
 * Supplier:
 * type: object
 * properties:
 * id:
 * type: integer
 * name:
 * type: string
 * contact_person:
 * type: string
 * email:
 * type: string
 * phone:
 * type: string
 * address:
 * type: string
 * city:
 * type: string
 * country:
 * type: string
 * tax_id:
 * type: string
 * payment_terms:
 * type: string
 * is_active:
 * type: integer
 * created_at:
 * type: string
 * format: date-time
 * updated_at:
 * type: string
 * format: date-time
 */
export interface Supplier {
    id: number;
    name: string;
    contact_person?: string;
    email?: string;
    phone: string;
    address?: string;
    city?: string;
    country?: string;
    tax_id?: string;
    payment_terms?: string;
    is_active: number;
    created_at: string;
    updated_at: string;
}
/**
 * @swagger
 * components:
 * schemas:
 * Medicine:
 * type: object
 * properties:
 * id:
 * type: integer
 * name:
 * type: string
 * generic_name:
 * type: string
 * category:
 * type: string
 * manufacturer:
 * type: string
 * description:
 * type: string
 * dosage_form:
 * type: string
 * strength:
 * type: string
 * unit_price:
 * type: number
 * format: float
 * stock_quantity:
 * type: integer
 * reorder_level:
 * type: integer
 * expiry_date:
 * type: string
 * format: date
 * batch_number:
 * type: string
 * barcode:
 * type: string
 * prescription_required:
 * type: integer
 * description: 1 if required, 0 if not
 * is_active:
 * type: integer
 * created_at:
 * type: string
 * format: date-time
 * updated_at:
 * type: string
 * format: date-time
 */
export interface Medicine {
    id: number;
    name: string;
    generic_name?: string;
    category: string;
    manufacturer?: string;
    description?: string;
    dosage_form?: string;
    strength?: string;
    unit_price: number;
    stock_quantity: number;
    reorder_level: number;
    expiry_date?: string;
    batch_number?: string;
    barcode?: string;
    prescription_required: number;
    is_active: number;
    created_at: string;
    updated_at: string;
}
/**
 * @swagger
 * components:
 * schemas:
 * Patient:
 * type: object
 * properties:
 * id:
 * type: integer
 * first_name:
 * type: string
 * last_name:
 * type: string
 * date_of_birth:
 * type: string
 * format: date
 * gender:
 * type: string
 * enum: [male, female, other]
 * phone:
 * type: string
 * email:
 * type: string
 * address:
 * type: string
 * city:
 * type: string
 * postal_code:
 * type: string
 * national_id:
 * type: string
 * insurance_number:
 * type: string
 * allergies:
 * type: string
 * medical_notes:
 * type: string
 * created_at:
 * type: string
 * format: date-time
 * updated_at:
 * type: string
 * format: date-time
 */
export interface Patient {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: 'male' | 'female' | 'other';
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    national_id?: string;
    insurance_number?: string;
    allergies?: string;
    medical_notes?: string;
    created_at: string;
    updated_at: string;
}
/**
 * @swagger
 * components:
 * schemas:
 * Prescription:
 * type: object
 * properties:
 * id:
 * type: integer
 * prescription_number:
 * type: string
 * patient_id:
 * type: integer
 * doctor_name:
 * type: string
 * doctor_license:
 * type: string
 * issue_date:
 * type: string
 * format: date
 * expiry_date:
 * type: string
 * format: date
 * diagnosis:
 * type: string
 * notes:
 * type: string
 * status:
 * type: string
 * enum: [pending, filled, partially_filled, cancelled]
 * created_at:
 * type: string
 * format: date-time
 * updated_at:
 * type: string
 * format: date-time
 */
export interface Prescription {
    id: number;
    prescription_number: string;
    patient_id: number;
    doctor_name: string;
    doctor_license?: string;
    issue_date: string;
    expiry_date?: string;
    diagnosis?: string;
    notes?: string;
    status: 'pending' | 'filled' | 'partially_filled' | 'cancelled';
    created_at: string;
    updated_at: string;
}
export interface PrescriptionItem {
    id: number;
    prescription_id: number;
    medicine_id: number;
    quantity: number;
    dosage_instructions?: string;
    duration_days?: number;
    filled_quantity: number;
    created_at: string;
}
/**
 * @swagger
 * components:
 * schemas:
 * Sale:
 * type: object
 * properties:
 * id:
 * type: integer
 * sale_number:
 * type: string
 * patient_id:
 * type: integer
 * prescription_id:
 * type: integer
 * user_id:
 * type: integer
 * sale_date:
 * type: string
 * format: date-time
 * total_amount:
 * type: number
 * format: float
 * discount_amount:
 * type: number
 * format: float
 * tax_amount:
 * type: number
 * format: float
 * final_amount:
 * type: number
 * format: float
 * payment_method:
 * type: string
 * enum: [cash, card, insurance, mobile]
 * payment_status:
 * type: string
 * enum: [pending, completed, refunded]
 * notes:
 * type: string
 * created_at:
 * type: string
 * format: date-time
 */
export interface Sale {
    id: number;
    sale_number: string;
    patient_id?: number;
    prescription_id?: number;
    user_id: number;
    sale_date: string;
    total_amount: number;
    discount_amount: number;
    tax_amount: number;
    final_amount: number;
    payment_method: 'cash' | 'card' | 'insurance' | 'mobile';
    payment_status: 'pending' | 'completed' | 'refunded';
    notes?: string;
    created_at: string;
}
export interface SaleItem {
    id: number;
    sale_id: number;
    medicine_id: number;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    subtotal: number;
    created_at: string;
}
/**
 * @swagger
 * components:
 * schemas:
 * Delivery:
 * type: object
 * properties:
 * id:
 * type: integer
 * delivery_number:
 * type: string
 * supplier_id:
 * type: integer
 * user_id:
 * type: integer
 * delivery_date:
 * type: string
 * format: date-time
 * received_date:
 * type: string
 * format: date-time
 * total_amount:
 * type: number
 * format: float
 * status:
 * type: string
 * enum: [pending, received, cancelled]
 * invoice_number:
 * type: string
 * notes:
 * type: string
 * created_at:
 * type: string
 * format: date-time
 * updated_at:
 * type: string
 * format: date-time
 */
export interface Delivery {
    id: number;
    delivery_number: string;
    supplier_id: number;
    user_id: number;
    delivery_date: string;
    received_date?: string;
    total_amount: number;
    status: 'pending' | 'received' | 'cancelled';
    invoice_number?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}
export interface DeliveryItem {
    id: number;
    delivery_id: number;
    medicine_id: number;
    quantity: number;
    unit_cost: number;
    batch_number?: string;
    expiry_date?: string;
    subtotal: number;
    created_at: string;
}
export interface AuditLog {
    id: number;
    user_id?: number;
    action: string;
    table_name: string;
    record_id?: number;
    old_values?: string;
    new_values?: string;
    ip_address?: string;
    timestamp: string;
}
/**
 * @swagger
 * components:
 * schemas:
 * CreateMedicineRequest:
 * type: object
 * required:
 * - name
 * - category
 * - unit_price
 * - stock_quantity
 * properties:
 * name:
 * type: string
 * generic_name:
 * type: string
 * category:
 * type: string
 * manufacturer:
 * type: string
 * description:
 * type: string
 * dosage_form:
 * type: string
 * strength:
 * type: string
 * unit_price:
 * type: number
 * stock_quantity:
 * type: integer
 * reorder_level:
 * type: integer
 * expiry_date:
 * type: string
 * format: date
 * batch_number:
 * type: string
 * barcode:
 * type: string
 * prescription_required:
 * type: integer
 */
export interface CreateMedicineRequest {
    name: string;
    generic_name?: string;
    category: string;
    manufacturer?: string;
    description?: string;
    dosage_form?: string;
    strength?: string;
    unit_price: number;
    stock_quantity: number;
    reorder_level?: number;
    expiry_date?: string;
    batch_number?: string;
    barcode?: string;
    prescription_required?: number;
}
export interface CreateUserRequest {
    username: string;
    password: string;
    full_name: string;
    role: 'admin' | 'pharmacist' | 'cashier';
    email?: string;
    phone?: string;
}
export interface CreateSupplierRequest {
    name: string;
    contact_person?: string;
    email?: string;
    phone: string;
    address?: string;
    city?: string;
    country?: string;
    tax_id?: string;
    payment_terms?: string;
}
export interface CreatePatientRequest {
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: 'male' | 'female' | 'other';
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    national_id?: string;
    insurance_number?: string;
    allergies?: string;
    medical_notes?: string;
}
export interface CreatePrescriptionRequest {
    prescription_number: string;
    patient_id: number;
    doctor_name: string;
    doctor_license?: string;
    issue_date: string;
    expiry_date?: string;
    diagnosis?: string;
    notes?: string;
    items: {
        medicine_id: number;
        quantity: number;
        dosage_instructions?: string;
        duration_days?: number;
    }[];
}
export interface CreateSaleRequest {
    patient_id?: number;
    prescription_id?: number;
    user_id: number;
    payment_method: 'cash' | 'card' | 'insurance' | 'mobile';
    discount_amount?: number;
    notes?: string;
    items: {
        medicine_id: number;
        quantity: number;
        discount_percent?: number;
    }[];
}
//# sourceMappingURL=types.d.ts.map