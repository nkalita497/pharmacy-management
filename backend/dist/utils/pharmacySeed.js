"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearPharmacyData = clearPharmacyData;
exports.seedPharmacyData = seedPharmacyData;
exports.resetAndSeedDatabase = resetAndSeedDatabase;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../config/database");
const fts_1 = require("./fts");
const USERS = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'pharmacist1', password: 'pass123', role: 'pharmacist' },
    { username: 'cashier1', password: 'pass123', role: 'cashier' }
];
const SUPPLIERS = [
    { name: 'Polpharma S.A.', contact: 'Dział logistyki', email: 'logistyka@polpharma.pl', phone: '+48 22 364 61 00' },
    { name: 'USP Zdrowie Sp. z o.o.', contact: 'Biuro dostaw', email: 'dostawy@uspzdrowie.pl', phone: '+48 42 210 10 00' },
    { name: 'Aflofarm Farmacja Polska', contact: 'Magazyn centralny', email: 'magazyn@aflofarm.com', phone: '+48 42 253 50 00' },
    { name: 'GSK Consumer Healthcare', contact: 'Obsługa aptek', email: 'apteki@gsk.com', phone: '+48 22 576 90 00' }
];
const MEDICINES = [
    { name: 'Ibuprofen MAX 400 mg', description: 'Tabletki powlekane, 20 szt.', category: 'Przeciwbólowe', supplier_id: 1, price: 14.99, stock: 120, expiry_date: '2027-06-30' },
    { name: 'Apap 500 mg', description: 'Tabletki, 24 szt.', category: 'Przeciwbólowe', supplier_id: 2, price: 12.49, stock: 85, expiry_date: '2027-03-15' },
    { name: 'Amoksiklav 875 mg + 125 mg', description: 'Tabletki powlekane, 14 szt.', category: 'Antybiotyki', supplier_id: 1, price: 38.9, stock: 32, expiry_date: '2026-11-20' },
    { name: 'Zyrtec 10 mg', description: 'Tabletki powlekane, 7 szt.', category: 'Przeciwhistaminowe', supplier_id: 4, price: 18.5, stock: 64, expiry_date: '2027-01-10' },
    { name: 'Vitaminum D3 2000 j.m.', description: 'Kapsułki miękkie, 60 szt.', category: 'Witaminy', supplier_id: 3, price: 22.0, stock: 95, expiry_date: '2028-02-28' },
    { name: 'Nurofen dla dzieci 100 mg/5 ml', description: 'Zawiesina doustna, 150 ml', category: 'Przeciwbólowe', supplier_id: 4, price: 24.99, stock: 8, expiry_date: '2026-09-01' },
    { name: 'Omeprazol Polpharma 20 mg', description: 'Kapsułki dojelitowe, 28 szt.', category: 'Układ pokarmowy', supplier_id: 1, price: 16.8, stock: 45, expiry_date: '2027-08-12' },
    { name: 'Aspirin C 400 mg + 240 mg', description: 'Tabletki musujące, 10 szt.', category: 'Przeciwbólowe', supplier_id: 2, price: 11.2, stock: 5, expiry_date: '2026-07-30' }
];
const PATIENTS = [
    { first_name: 'Anna', last_name: 'Kowalska', pesel: '85010112345', email: 'anna.kowalska@email.pl', phone: '+48 501 111 222' },
    { first_name: 'Jan', last_name: 'Nowak', pesel: '90021567891', email: 'jan.nowak@email.pl', phone: '+48 502 333 444' },
    { first_name: 'Maria', last_name: 'Wiśniewska', pesel: '78120345612', email: 'maria.w@email.pl', phone: '+48 503 555 666' },
    { first_name: 'Piotr', last_name: 'Zieliński', pesel: '92041098765', email: 'piotr.z@email.pl', phone: '+48 504 777 888' },
    { first_name: 'Katarzyna', last_name: 'Lewandowska', pesel: '88062233456', email: 'k.lewandowska@email.pl', phone: '+48 505 999 000' }
];
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        (0, database_1.getDb)().run(sql, params, (err) => (err ? reject(err) : resolve()));
    });
}
async function clearPharmacyData() {
    await run('DELETE FROM audit_log');
    await run('DELETE FROM sales');
    await run('DELETE FROM deliveries');
    await run('DELETE FROM prescriptions');
    await run('DELETE FROM medicines');
    await run('DELETE FROM patients');
    await run('DELETE FROM suppliers');
    await run('DELETE FROM user_preferences');
    await run('DELETE FROM users');
}
async function seedPharmacyData() {
    for (const u of USERS) {
        const hash = await bcrypt_1.default.hash(u.password, 10);
        await run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [u.username, hash, u.role]);
    }
    for (const s of SUPPLIERS) {
        await run('INSERT INTO suppliers (name, contact, email, phone) VALUES (?, ?, ?, ?)', [
            s.name,
            s.contact,
            s.email,
            s.phone
        ]);
    }
    for (const m of MEDICINES) {
        await run(`INSERT INTO medicines (name, description, category, supplier_id, price, stock, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [m.name, m.description, m.category, m.supplier_id, m.price, m.stock, m.expiry_date]);
    }
    for (const p of PATIENTS) {
        await run('INSERT INTO patients (first_name, last_name, pesel, email, phone) VALUES (?, ?, ?, ?, ?)', [
            p.first_name,
            p.last_name,
            p.pesel,
            p.email,
            p.phone
        ]);
    }
    const prescriptions = [
        { patient_id: 1, medicine_id: 1, quantity: 2, doctor_name: 'lek. med. Ewa Malinowska', prescription_date: '2026-05-01', expiry_date: '2026-06-01', status: 'pending' },
        { patient_id: 2, medicine_id: 3, quantity: 1, doctor_name: 'lek. med. Tomasz Grabowski', prescription_date: '2026-05-10', expiry_date: '2026-06-10', status: 'pending' },
        { patient_id: 3, medicine_id: 4, quantity: 1, doctor_name: 'lek. med. Ewa Malinowska', prescription_date: '2026-04-20', expiry_date: '2026-05-20', status: 'completed' },
        { patient_id: 4, medicine_id: 5, quantity: 1, doctor_name: 'lek. med. Anna Kubiak', prescription_date: '2026-05-15', expiry_date: '2026-08-15', status: 'pending' },
        { patient_id: 5, medicine_id: 7, quantity: 1, doctor_name: 'lek. med. Tomasz Grabowski', prescription_date: '2026-05-18', expiry_date: '2026-06-18', status: 'pending' }
    ];
    for (const rx of prescriptions) {
        await run(`INSERT INTO prescriptions (patient_id, medicine_id, quantity, doctor_name, prescription_date, expiry_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            rx.patient_id,
            rx.medicine_id,
            rx.quantity,
            rx.doctor_name,
            rx.prescription_date,
            rx.expiry_date,
            rx.status
        ]);
    }
    await run(`INSERT INTO sales (prescription_id, medicine_id, quantity, unit_price, total_price, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`, [3, 4, 1, 18.5, 18.5, 2]);
    await run(`INSERT INTO sales (prescription_id, medicine_id, quantity, unit_price, total_price, user_id)
     VALUES (NULL, ?, ?, ?, ?, ?)`, [2, 2, 12.49, 24.98, 3]);
    await run(`INSERT INTO deliveries (supplier_id, medicine_id, quantity, delivery_date, cost)
     VALUES (?, ?, ?, ?, ?)`, [1, 1, 200, '2026-05-01', 1800]);
    await run(`INSERT INTO deliveries (supplier_id, medicine_id, quantity, delivery_date, cost)
     VALUES (?, ?, ?, ?, ?)`, [2, 2, 150, '2026-05-05', 950]);
    await (0, fts_1.initFts)();
    await (0, fts_1.rebuildFtsIndex)();
}
async function resetAndSeedDatabase() {
    await clearPharmacyData();
    await seedPharmacyData();
}
//# sourceMappingURL=pharmacySeed.js.map