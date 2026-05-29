"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const LOCALES = new Set(['pl', 'en', 'fr']);
function normalizeLocale(raw) {
    const v = typeof raw === 'string' ? raw : 'pl';
    return LOCALES.has(v) ? v : 'pl';
}
const router = express_1.default.Router();
router.use(authMiddleware_1.requireAuth);
/**
 * @swagger
 * tags:
 *   name: Preferencje
 *   description: Zarządzanie ustawieniami użytkownika (motyw, język)
 */
/**
 * @swagger
 * /api/preferences:
 * get:
 * summary: Pobiera preferencje zalogowanego użytkownika
 * tags: [Preferencje]
 * responses:
 * 200:
 * description: Zwraca aktualne ustawienia użytkownika.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserPreferences'
 * 401:
 * description: Brak autoryzacji
 * 500:
 * description: Błąd bazy danych
 */
router.get('/', (req, res) => {
    const userId = req.user?.id;
    database_1.default.get('SELECT theme, locale FROM user_preferences WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row || { theme: 'light', locale: 'pl' });
    });
});
/**
 * @swagger
 * /api/preferences:
 * put:
 * summary: Aktualizuje preferencje użytkownika
 * description: Nadpisuje motyw oraz język dla zalogowanego użytkownika. Używa operacji UPSERT (INSERT OR UPDATE).
 * tags: [Preferencje]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserPreferences'
 * responses:
 * 200:
 * description: Preferencje zostały zapisane.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * theme:
 * type: string
 * locale:
 * type: string
 * message:
 * type: string
 * 401:
 * description: Brak autoryzacji
 * 500:
 * description: Błąd zapisu do bazy
 */
router.put('/', (req, res) => {
    const userId = req.user?.id;
    const theme = req.body.theme === 'dark' ? 'dark' : 'light';
    const locale = normalizeLocale(req.body.locale);
    database_1.default.run(`INSERT INTO user_preferences (user_id, theme, locale, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET theme=excluded.theme, locale=excluded.locale, updated_at=CURRENT_TIMESTAMP`, [userId, theme, locale], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ theme, locale, message: 'Preferencje zapisane' });
    });
});
exports.default = router;
//# sourceMappingURL=preferences.js.map