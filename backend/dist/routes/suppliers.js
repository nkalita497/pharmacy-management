"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const audit_1 = require("../utils/audit");
const pagination_1 = require("../utils/pagination");
const router = express_1.default.Router();
router.use(authMiddleware_1.requireAuth);
/**
 * @swagger
 * tags:
 * name: Dostawcy
 * description: Zarządzanie danymi dostawców towarów
 */
/**
 * @swagger
 * /api/suppliers:
 * get:
 * summary: Pobiera listę dostawców (z paginacją i wyszukiwaniem)
 * tags: [Dostawy]
 * parameters:
 * - in: query
 * name: page
 * schema: { type: integer }
 * - in: query
 * name: limit
 * schema: { type: integer }
 * - in: query
 * name: q
 * schema: { type: string }
 * description: Wyszukiwanie po nazwie, kontakcie lub emailu
 * responses:
 * 200:
 * description: Lista dostawców
 */
router.get('/', (req, res) => {
    const params = (0, pagination_1.parsePagination)(req, 'suppliers');
    let where = '1=1';
    const queryParams = [];
    if (params.q) {
        where += ' AND (name LIKE ? OR contact LIKE ? OR email LIKE ?)';
        const like = `%${params.q}%`;
        queryParams.push(like, like, like);
    }
    database_1.default.get(`SELECT COUNT(*) as total FROM suppliers WHERE ${where}`, queryParams, (err, countRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        database_1.default.all(`SELECT * FROM suppliers WHERE ${where} ORDER BY ${params.sort} ${params.order} LIMIT ? OFFSET ?`, [...queryParams, params.limit, params.offset], (err2, rows) => {
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
 * /api/suppliers/{id}:
 * get:
 * summary: Pobiera dostawcę po ID
 * tags: [Dostawy]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema: { type: integer }
 * responses:
 * 200:
 * description: Dane dostawcy
 * content:
 * application/json:
 * schema: { $ref: '#/components/schemas/Supplier' }
 */
router.get('/:id', (req, res) => {
    const { id } = req.params;
    database_1.default.get('SELECT * FROM suppliers WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Supplier not found' });
            return;
        }
        res.json(row);
    });
});
/**
 * @swagger
 * /api/suppliers:
 * post:
 * summary: Dodaje nowego dostawcę
 * tags: [Dostawy]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema: { $ref: '#/components/schemas/CreateSupplierRequest' }
 * responses:
 * 201:
 * description: Dostawca stworzony
 */
router.post('/', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), (req, res) => {
    const { name, contact, email, phone } = req.body;
    if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
    }
    database_1.default.run(`INSERT INTO suppliers (name, contact, email, phone) VALUES (?, ?, ?, ?)`, [name, contact, email, phone], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const uid = req.user?.id;
        if (uid)
            (0, audit_1.logAudit)(uid, 'CREATE', 'supplier', this.lastID, undefined, JSON.stringify({ name }));
        res.status(201).json({ id: this.lastID, message: 'Supplier created' });
    });
});
/**
 * @swagger
 * /api/suppliers/{id}:
 * put:
 * summary: Aktualizuje dane dostawcy
 * tags: [Dostawy]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema: { type: integer }
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema: { $ref: '#/components/schemas/CreateSupplierRequest' }
 * responses:
 * 200:
 * description: Zaktualizowano
 */
router.put('/:id', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), (req, res) => {
    const { id } = req.params;
    const { name, contact, email, phone } = req.body;
    database_1.default.get('SELECT * FROM suppliers WHERE id = ?', [id], (err, oldSupplier) => {
        database_1.default.run(`UPDATE suppliers SET name=?, contact=?, email=?, phone=? WHERE id=?`, [name, contact, email, phone, id], function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            const uid = req.user?.id;
            if (uid) {
                (0, audit_1.logAudit)(uid, 'UPDATE', 'supplier', Number(id), JSON.stringify(oldSupplier), JSON.stringify({ name, contact, email, phone }));
            }
            res.json({ message: 'Supplier updated' });
        });
    });
});
/**
 * @swagger
 * /api/suppliers/{id}:
 * delete:
 * summary: Usuwa dostawcę
 * tags: [Dostawy]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema: { type: integer }
 * responses:
 * 200:
 * description: Usunięto
 */
router.delete('/:id', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), (req, res) => {
    const { id } = req.params;
    database_1.default.get('SELECT * FROM suppliers WHERE id = ?', [id], (err, oldSupplier) => {
        if (err || !oldSupplier) {
            res.status(404).json({ error: 'Supplier not found' });
            return;
        }
        database_1.default.run('DELETE FROM suppliers WHERE id=?', [id], function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            const uid = req.user?.id;
            if (uid) {
                (0, audit_1.logAudit)(uid, 'DELETE', 'supplier', Number(id), JSON.stringify(oldSupplier), 'DELETED');
            }
            res.json({ message: 'Supplier deleted' });
        });
    });
});
exports.default = router;
//# sourceMappingURL=suppliers.js.map