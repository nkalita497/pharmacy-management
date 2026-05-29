"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const database_1 = __importDefault(require("../config/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const audit_1 = require("../utils/audit");
const websocket_1 = require("../utils/websocket");
const router = express_1.default.Router();
router.use(authMiddleware_1.requireAuth);
// ==========================================
// ZAAWANSOWANE OPERACJE BIZNESOWE (PDF)
// ==========================================
router.get('/report/pdf', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), (req, res) => {
    const query = `
      SELECT s.id, s.quantity, s.total_price, s.sale_date, m.name as medicine_name
      FROM sales s
      JOIN medicines m ON s.medicine_id = m.id
      ORDER BY s.sale_date DESC
      LIMIT 50
  `;
    database_1.default.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=raport_sprzedazy.pdf');
        const doc = new pdfkit_1.default({ margin: 50 });
        doc.pipe(res);
        doc.font('Helvetica-Bold').fontSize(20).text('Raport Sprzedazy Apteki', { align: 'center' });
        doc.font('Helvetica').moveDown().fontSize(12).text(`Data wygenerowania: ${new Date().toLocaleDateString()}`, { align: 'right' }).moveDown(2);
        let totalRevenue = 0;
        rows.forEach(sale => {
            const date = new Date(sale.sale_date).toLocaleDateString();
            doc.fontSize(10).text(`Transakcja #${sale.id} | Data: ${date} | Lek: ${sale.medicine_name}`);
            doc.text(`Ilosc: ${sale.quantity} szt. | Kwota: ${sale.total_price.toFixed(2)} PLN`);
            doc.moveDown(0.5);
            totalRevenue += sale.total_price;
        });
        doc.moveDown(2);
        doc.font('Helvetica-Bold').fontSize(14).text(`Laczny przychod z ostatnich transakcji: ${totalRevenue.toFixed(2)} PLN`, { align: 'right' });
        doc.end();
    });
});
// ==========================================
// PODSTAWOWE OPERACJE CRUD
// ==========================================
router.get('/', (req, res) => {
    database_1.default.all('SELECT * FROM sales', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
router.get('/:id', (req, res) => {
    const { id } = req.params;
    database_1.default.get('SELECT * FROM sales WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Sale not found' });
            return;
        }
        res.json(row);
    });
});
router.post('/', (req, res) => {
    const { prescription_id, medicine_id, quantity, unit_price, user_id } = req.body;
    if (!medicine_id || !quantity || !unit_price || !user_id) {
        res.status(400).json({ error: 'Medicine ID, quantity, unit price, and user ID are required' });
        return;
    }
    const total_price = quantity * unit_price;
    database_1.default.get('SELECT stock FROM medicines WHERE id = ?', [medicine_id], (err, med) => {
        if (err || !med) {
            res.status(400).json({ error: 'Medicine not found' });
            return;
        }
        if (med.stock < quantity) {
            res.status(400).json({ error: 'Not enough stock' });
            return;
        }
        database_1.default.serialize(() => {
            database_1.default.run(`INSERT INTO sales (prescription_id, medicine_id, quantity, unit_price, total_price, user_id)
         VALUES (?, ?, ?, ?, ?, ?)`, [prescription_id, medicine_id, quantity, unit_price, total_price, user_id], function (err2) {
                if (err2) {
                    res.status(500).json({ error: err2.message });
                    return;
                }
                database_1.default.run('UPDATE medicines SET stock = stock - ? WHERE id = ?', [quantity, medicine_id], (err3) => {
                    if (err3) {
                        res.status(500).json({ error: err3.message });
                        return;
                    }
                    (0, audit_1.logAudit)(user_id, 'CREATE', 'sale', this.lastID, undefined, JSON.stringify({ medicine_id, quantity, total_price }));
                    (0, websocket_1.broadcastEvent)('sale:created', { id: this.lastID, medicine_id, total_price });
                    res.status(201).json({ id: this.lastID, message: 'Sale created' });
                });
            });
        });
    });
});
router.put('/:id', (0, roleMiddleware_1.requireRole)(['admin']), (req, res) => {
    const { id } = req.params;
    const { prescription_id, medicine_id, quantity, unit_price, user_id } = req.body;
    const total_price = quantity * unit_price;
    database_1.default.get('SELECT * FROM sales WHERE id = ?', [id], (err, oldSale) => {
        if (err || !oldSale) {
            res.status(404).json({ error: 'Sale not found' });
            return;
        }
        const deltaQty = quantity - oldSale.quantity;
        database_1.default.get('SELECT stock FROM medicines WHERE id = ?', [medicine_id], (err2, med) => {
            if (err2 || !med) {
                res.status(400).json({ error: 'Medicine not found' });
                return;
            }
            if (deltaQty > 0 && med.stock < deltaQty) {
                res.status(400).json({ error: 'Not enough stock' });
                return;
            }
            database_1.default.serialize(() => {
                database_1.default.run(`UPDATE sales SET prescription_id=?, medicine_id=?, quantity=?, unit_price=?, total_price=?, user_id=?
           WHERE id=?`, [prescription_id, medicine_id, quantity, unit_price, total_price, user_id, id], function (err3) {
                    if (err3) {
                        res.status(500).json({ error: err3.message });
                        return;
                    }
                    database_1.default.run('UPDATE medicines SET stock = stock - ? WHERE id = ?', [deltaQty, medicine_id], (err4) => {
                        if (err4) {
                            res.status(500).json({ error: err4.message });
                            return;
                        }
                        const uid = req.user?.id;
                        if (uid) {
                            (0, audit_1.logAudit)(uid, 'UPDATE', 'sale', Number(id), JSON.stringify(oldSale), JSON.stringify({ medicine_id, quantity, total_price }));
                        }
                        res.json({ message: 'Sale updated' });
                    });
                });
            });
        });
    });
});
router.delete('/:id', (0, roleMiddleware_1.requireRole)(['admin']), (req, res) => {
    const { id } = req.params;
    database_1.default.get('SELECT * FROM sales WHERE id = ?', [id], (err, oldSale) => {
        if (err || !oldSale) {
            res.status(500).json({ error: err?.message || 'Sale not found' });
            return;
        }
        database_1.default.serialize(() => {
            database_1.default.run('UPDATE medicines SET stock = stock + ? WHERE id = ?', [oldSale.quantity, oldSale.medicine_id], (err2) => {
                if (err2) {
                    res.status(500).json({ error: err2.message });
                    return;
                }
                database_1.default.run('DELETE FROM sales WHERE id=?', [id], function (err3) {
                    if (err3) {
                        res.status(500).json({ error: err3.message });
                        return;
                    }
                    const uid = req.user?.id;
                    if (uid) {
                        (0, audit_1.logAudit)(uid, 'DELETE', 'sale', Number(id), JSON.stringify(oldSale), 'DELETED');
                    }
                    res.json({ message: 'Sale deleted' });
                });
            });
        });
    });
});
exports.default = router;
//# sourceMappingURL=sales.js.map