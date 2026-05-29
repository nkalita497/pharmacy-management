import express, { Request, Response } from 'express';
import db from '../config/database';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole(['admin', 'pharmacist']));

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
router.get('/', (req: Request, res: Response): void => {
  db.all(
    `SELECT a.id, a.user_id, u.username, a.action, a.entity_type, a.entity_id,
            a.old_value, a.new_value, a.timestamp
     FROM audit_log a
            LEFT JOIN users u ON a.user_id = u.id
     ORDER BY a.timestamp DESC
     LIMIT 200`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

export default router;
