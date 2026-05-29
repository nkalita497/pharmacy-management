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
const websocket_1 = require("../utils/websocket");
const router = express_1.default.Router();
router.use(authMiddleware_1.requireAuth);
/**
 * @swagger
 * tags:
 *   name: Dostawy
 *   description: Zarządzanie historią przyjęć magazynowych
 *
 * /api/deliveries:
 *   get:
 *     summary: Pobiera historię wszystkich dostaw
 *     description: Zwraca pełną listę przyjęć magazynowych, dołączając do każdego wpisu nazwę dostawcy oraz nazwę leku z powiązanych tabel.
 *     tags: [Dostawy]
 *     responses:
 *       200:
 *         description: Lista dostaw pomyślnie pobrana.
 *       401:
 *         description: Brak autoryzacji (niezalogowany)
 *       500:
 *         description: Wewnętrzny błąd bazy danych
 */
router.get('/', (req, res) => {
    database_1.default.all(`SELECT d.*, s.name as supplier_name, m.name as medicine_name
     FROM deliveries d
            LEFT JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN medicines m ON d.medicine_id = m.id
     ORDER BY d.delivery_date DESC`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
/**
 * @swagger
 * /api/deliveries:
 * post:
 * summary: Rejestruje nową dostawę
 * description: Tworzy nowy wpis o przyjęciu towaru do apteki. Wymaga uprawnień administratora lub farmaceuty. Akcja jest automatycznie zapisywana w logach audytowych.
 * tags: [Dostawy]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - supplier_id
 * - medicine_id
 * - quantity
 * - cost
 * - delivery_date
 * properties:
 * supplier_id:
 * type: integer
 * example: 2
 * medicine_id:
 * type: integer
 * example: 5
 * quantity:
 * type: integer
 * example: 100
 * cost:
 * type: number
 * format: float
 * example: 1500.50
 * delivery_date:
 * type: string
 * format: date
 * example: "2026-05-26"
 * responses:
 * 201:
 * description: Dostawa została poprawnie zarejestrowana.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * id:
 * type: integer
 * example: 11
 * message:
 * type: string
 * example: "Delivery created"
 * 401:
 * description: Brak autoryzacji
 * 403:
 * description: Brak wystarczających uprawnień (wymagane: admin lub pharmacist)
 * 500:
 * description: Błąd zapisu do bazy
 */
router.post('/', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), (req, res) => {
    const { supplier_id, medicine_id, quantity, cost, delivery_date } = req.body;
    database_1.default.serialize(() => {
        database_1.default.run(`INSERT INTO deliveries (supplier_id, medicine_id, quantity, cost, delivery_date) VALUES (?, ?, ?, ?, ?)`, [supplier_id, medicine_id, quantity, cost, delivery_date], function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            database_1.default.run('UPDATE medicines SET stock = stock + ? WHERE id = ?', [quantity, medicine_id], (err2) => {
                if (err2) {
                    res.status(500).json({ error: err2.message });
                    return;
                }
                const uid = req.user?.id;
                if (uid) {
                    (0, audit_1.logAudit)(uid, 'CREATE', 'delivery', this.lastID, undefined, JSON.stringify({ medicine_id, quantity, cost }));
                }
                (0, websocket_1.broadcastEvent)('delivery:created', { id: this.lastID, medicine_id, quantity });
                res.status(201).json({ id: this.lastID, message: 'Delivery created' });
            });
        });
    });
});
/**
 * @swagger
 * /api/deliveries/{id}:
 * put:
 * summary: Aktualizuje wpis o dostawie
 * description: Pozwala edytować dane historycznej dostawy. Zmiany są odnotowywane w logach audytowych wraz z poprzednimi wartościami. Wymaga uprawnień administratora.
 * tags: [Dostawy]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID dostawy
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * supplier_id:
 * type: integer
 * medicine_id:
 * type: integer
 * quantity:
 * type: integer
 * cost:
 * type: number
 * delivery_date:
 * type: string
 * format: date
 * responses:
 * 200:
 * description: Dostawa pomyślnie zaktualizowana.
 * 401:
 * description: Brak autoryzacji
 * 403:
 * description: Brak uprawnień (tylko administrator)
 * 404:
 * description: Nie znaleziono wpisu o podanym ID
 * 500:
 * description: Błąd wewnętrzny serwera
 */
router.put('/:id', (0, roleMiddleware_1.requireRole)(['admin']), (req, res) => {
    const { id } = req.params;
    const { supplier_id, medicine_id, quantity, cost, delivery_date } = req.body;
    database_1.default.get('SELECT * FROM deliveries WHERE id = ?', [id], (err, oldDelivery) => {
        if (err || !oldDelivery) {
            res.status(404).json({ error: 'Delivery not found' });
            return;
        }
        const oldQty = oldDelivery.quantity;
        const oldMed = oldDelivery.medicine_id;
        const newQty = quantity ?? oldQty;
        const newMed = medicine_id ?? oldMed;
        database_1.default.serialize(() => {
            // najpierw skoryguj stock dla starego leku
            database_1.default.run('UPDATE medicines SET stock = stock - ? WHERE id = ?', [oldQty, oldMed], (err2) => {
                if (err2) {
                    res.status(500).json({ error: err2.message });
                    return;
                }
                // następnie dodaj ilość dla nowego leku
                database_1.default.run('UPDATE medicines SET stock = stock + ? WHERE id = ?', [newQty, newMed], (err3) => {
                    if (err3) {
                        res.status(500).json({ error: err3.message });
                        return;
                    }
                    database_1.default.run(`UPDATE deliveries SET supplier_id=?, medicine_id=?, quantity=?, cost=?, delivery_date=? WHERE id=?`, [supplier_id, medicine_id, quantity, cost, delivery_date, id], function (err4) {
                        if (err4) {
                            res.status(500).json({ error: err4.message });
                            return;
                        }
                        const uid = req.user?.id;
                        if (uid) {
                            (0, audit_1.logAudit)(uid, 'UPDATE', 'delivery', Number(id), JSON.stringify(oldDelivery), JSON.stringify({ supplier_id, medicine_id, quantity, cost, delivery_date }));
                        }
                        res.json({ message: 'Delivery updated' });
                    });
                });
            });
        });
    });
});
/**
 * @swagger
 * /api/deliveries/{id}:
 * delete:
 * summary: Usuwa dostawę
 * description: Trwale usuwa rejestr przyjęcia towaru. Akcja zapisywana jest w logach audytowych jako typ DELETE wraz ze stanem rekordu przed usunięciem. Wymaga uprawnień administratora.
 * tags: [Dostawy]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID usuwanej dostawy
 * responses:
 * 200:
 * description: Dostawa została poprawnie usunięta.
 * 401:
 * description: Brak autoryzacji
 * 403:
 * description: Brak uprawnień (tylko administrator)
 * 404:
 * description: Nie znaleziono wpisu o podanym ID
 * 500:
 * description: Błąd wewnętrzny serwera
 */
router.delete('/:id', (0, roleMiddleware_1.requireRole)(['admin']), (req, res) => {
    const { id } = req.params;
    database_1.default.get('SELECT * FROM deliveries WHERE id = ?', [id], (err, oldDelivery) => {
        if (err || !oldDelivery) {
            res.status(404).json({ error: 'Delivery not found' });
            return;
        }
        database_1.default.serialize(() => {
            database_1.default.run('UPDATE medicines SET stock = MAX(stock - ?, 0) WHERE id = ?', [oldDelivery.quantity, oldDelivery.medicine_id], (err2) => {
                if (err2) {
                    // jeśli SQLite nie wspiera MAX w SET, można pominąć zabezpieczenie
                }
            });
            database_1.default.run('DELETE FROM deliveries WHERE id=?', [id], function (err3) {
                if (err3) {
                    res.status(500).json({ error: err3.message });
                    return;
                }
                const uid = req.user?.id;
                if (uid) {
                    (0, audit_1.logAudit)(uid, 'DELETE', 'delivery', Number(id), JSON.stringify(oldDelivery), 'DELETED');
                }
                res.json({ message: 'Delivery deleted' });
            });
        });
    });
});
exports.default = router;
//# sourceMappingURL=deliveries.js.map