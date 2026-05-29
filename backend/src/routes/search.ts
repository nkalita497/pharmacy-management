import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { searchFts } from '../utils/fts';

const router = express.Router();
router.use(requireAuth);

/**
 * @swagger
 * tags:
 * name: Wyszukiwanie
 * description: Wyszukiwanie pełnotekstowe (FTS) w systemie
 */

/**
 * @swagger
 * /api/search:
 * get:
 * summary: Wyszukiwanie pełnotekstowe
 * description: Wykonuje szybkie wyszukiwanie w indeksie FTS (Full Text Search) dla leków, pacjentów i innych encji.
 * tags: [Wyszukiwanie]
 * parameters:
 * - in: query
 * name: q
 * required: true
 * schema:
 * type: string
 * description: Fraza wyszukiwania
 * example: "Ibuprofen"
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * minimum: 1
 * maximum: 50
 * default: 25
 * description: Maksymalna liczba wyników
 * responses:
 * 200:
 * description: Wyniki wyszukiwania
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * query:
 * type: string
 * count:
 * type: integer
 * results:
 * type: array
 * items:
 * type: object
 * 400:
 * description: Brak wymaganego parametru 'q'
 * 500:
 * description: Błąd przeszukiwania indeksu
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '25'), 10) || 25));

  if (!q) {
    res.status(400).json({ error: 'Parametr q jest wymagany' });
    return;
  }

  try {
    const results = await searchFts(q, limit);
    res.json({ query: q, count: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
