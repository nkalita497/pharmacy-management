import express, { Request, Response } from 'express';
import db from '../config/database';
import { requireAuth } from '../middleware/authMiddleware';

const LOCALES = new Set(['pl', 'en', 'fr']);

function normalizeLocale(raw: unknown): string {
  const v = typeof raw === 'string' ? raw : 'pl';
  return LOCALES.has(v) ? v : 'pl';
}

const router = express.Router();
router.use(requireAuth);

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
router.get('/', (req: Request, res: Response): void => {
  const userId = (req.user as any)?.id;
  db.get(
    'SELECT theme, locale FROM user_preferences WHERE user_id = ?',
    [userId],
    (err, row: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row || { theme: 'light', locale: 'pl' });
    }
  );
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
router.put('/', (req: Request, res: Response): void => {
  const userId = (req.user as any)?.id;
  const theme = req.body.theme === 'dark' ? 'dark' : 'light';
  const locale = normalizeLocale(req.body.locale);

  db.run(
    `INSERT INTO user_preferences (user_id, theme, locale, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET theme=excluded.theme, locale=excluded.locale, updated_at=CURRENT_TIMESTAMP`,
    [userId, theme, locale],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ theme, locale, message: 'Preferencje zapisane' });
    }
  );
});

export default router;
