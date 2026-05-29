"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const pagination_1 = require("../utils/pagination");
const router = express_1.default.Router();
// Blokada dla całego pliku (tylko zalogowani)
router.use(authMiddleware_1.requireAuth);
/**
 * @swagger
 * tags:
 * name: Pacjenci
 * description: Zarządzanie bazą pacjentów
 */
/**
 * @swagger
 * /api/patients:
 * get:
 * summary: Pobiera listę pacjentów (z paginacją i wyszukiwaniem)
 * description: Zwraca stronę wyników z tabeli pacjentów. Pozwala na wyszukiwanie po imieniu, nazwisku oraz numerze PESEL.
 * tags: [Pacjenci]
 * parameters:
 * - in: query
 * name: page
 * schema:
 * type: integer
 * default: 1
 * description: Numer strony
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * default: 20
 * description: Ilość elementów na stronie
 * - in: query
 * name: sort
 * schema:
 * type: string
 * default: "id"
 * description: Kolumna sortowania
 * - in: query
 * name: order
 * schema:
 * type: string
 * enum: [asc, desc]
 * default: "asc"
 * description: Kierunek sortowania
 * - in: query
 * name: q
 * schema:
 * type: string
 * description: Fraza wyszukiwania (Imię, Nazwisko, PESEL)
 * responses:
 * 200:
 * description: Pomyślnie pobrano listę pacjentów.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * data:
 * type: array
 * items:
 * $ref: '#/components/schemas/Patient'
 * meta:
 * type: object
 * properties:
 * total:
 * type: integer
 * page:
 * type: integer
 * limit:
 * type: integer
 * totalPages:
 * type: integer
 * 401:
 * description: Brak autoryzacji.
 * 500:
 * description: Błąd zapytania bazy danych.
 */
router.get('/', (req, res) => {
    const params = (0, pagination_1.parsePagination)(req, 'patients');
    let where = '1=1';
    const queryParams = [];
    if (params.q) {
        where += ' AND (first_name LIKE ? OR last_name LIKE ? OR pesel LIKE ?)';
        const like = `%${params.q}%`;
        queryParams.push(like, like, like);
    }
    database_1.default.get(`SELECT COUNT(*) as total FROM patients WHERE ${where}`, queryParams, (err, countRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        database_1.default.all(`SELECT * FROM patients WHERE ${where} ORDER BY ${params.sort} ${params.order} LIMIT ? OFFSET ?`, [...queryParams, params.limit, params.offset], (err2, rows) => {
            if (err2) {
                res.status(500).json({ error: err2.message });
                return;
            }
            res.json((0, pagination_1.paginatedResponse)(rows, countRow.total, params));
        });
    });
});
/**
 * @swagger
 * /api/patients/{id}:
 * get:
 * summary: Pobiera szczegóły pojedynczego pacjenta
 * tags: [Pacjenci]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: Unikalne ID pacjenta
 * responses:
 * 200:
 * description: Sukces. Zwraca dane pacjenta.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Patient'
 * 401:
 * description: Brak autoryzacji.
 * 404:
 * description: Nie znaleziono pacjenta w bazie.
 * 500:
 * description: Błąd wewnętrzny bazy danych.
 */
router.get('/:id', (req, res) => {
    const { id } = req.params;
    database_1.default.get('SELECT * FROM patients WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Patient not found' });
            return;
        }
        res.json(row);
    });
});
/**
 * @swagger
 * /api/patients:
 * post:
 * summary: Rejestruje nowego pacjenta w systemie
 * description: Tworzy nowy wpis. Wymaga uprawnień administratora lub farmaceuty.
 * tags: [Pacjenci]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/CreatePatientRequest'
 * responses:
 * 201:
 * description: Pacjent został pomyślnie zarejestrowany.
 * 400:
 * description: Brak wymaganych pól (Imię i Nazwisko).
 * 401:
 * description: Brak autoryzacji.
 * 403:
 * description: Brak wystarczających uprawnień (wymagane admin lub pharmacist).
 * 500:
 * description: Błąd zapisu do bazy danych.
 */
router.post('/', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), (req, res) => {
    const { first_name, last_name, pesel, email, phone } = req.body;
    if (!first_name || !last_name) {
        res.status(400).json({ error: 'First name and last name are required' });
        return;
    }
    database_1.default.run(`INSERT INTO patients (first_name, last_name, pesel, email, phone) VALUES (?, ?, ?, ?, ?)`, [first_name, last_name, pesel, email, phone], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, message: 'Patient created' });
    });
});
/**
 * @swagger
 * /api/patients/{id}:
 * put:
 * summary: Aktualizuje dane pacjenta
 * description: Wymaga uprawnień administratora lub farmaceuty.
 * tags: [Pacjenci]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/CreatePatientRequest'
 * responses:
 * 200:
 * description: Dane pacjenta zostały zaktualizowane.
 * 401:
 * description: Brak autoryzacji.
 * 403:
 * description: Brak wystarczających uprawnień.
 * 500:
 * description: Błąd aktualizacji w bazie danych.
 */
router.put('/:id', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, pesel, email, phone } = req.body;
    database_1.default.run(`UPDATE patients SET first_name=?, last_name=?, pesel=?, email=?, phone=? WHERE id=?`, [first_name, last_name, pesel, email, phone, id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Patient updated' });
    });
});
/**
 * @swagger
 * /api/patients/{id}:
 * delete:
 * summary: Usuwa pacjenta z systemu
 * description: Trwale usuwa wpis o pacjencie. Wymaga uprawnień administratora lub farmaceuty.
 * tags: [Pacjenci]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Pacjent został pomyślnie usunięty.
 * 401:
 * description: Brak autoryzacji.
 * 403:
 * description: Brak wystarczających uprawnień.
 * 500:
 * description: Błąd usuwania.
 */
router.delete('/:id', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), (req, res) => {
    const { id } = req.params;
    database_1.default.run('DELETE FROM patients WHERE id=?', [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Patient deleted' });
    });
});
exports.default = router;
//# sourceMappingURL=patients.js.map