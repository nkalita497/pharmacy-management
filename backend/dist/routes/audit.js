"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.requireAuth);
/**
 * @swagger
 * tags:
 *   name: Audyt
 *   description: Historia akcji i zmian w systemie
 *
 * /api/audit:
 *   get:
 *     summary: Pobiera logi audytowe
 *     description: Zwraca maksymalnie 200 najnowszych wpisów z historii działań użytkowników w systemie.
 *     tags: [Audyt]
 *     responses:
 *       200:
 *         description: Lista wpisów pomyślnie pobrana.
 *       401:
 *         description: Brak dostępu (niezalogowany)
 *       500:
 *         description: Wewnętrzny błąd serwera bazy danych
 */
router.get('/', (req, res) => {
    database_1.default.all(`SELECT a.id, a.user_id, u.username, a.action, a.entity_type, a.entity_id,
            a.old_value, a.new_value, a.timestamp
     FROM audit_log a
            LEFT JOIN users u ON a.user_id = u.id
     ORDER BY a.timestamp DESC
     LIMIT 200`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
exports.default = router;
//# sourceMappingURL=audit.js.map