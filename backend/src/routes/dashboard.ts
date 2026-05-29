import express, { Request, Response } from 'express';
import db from '../config/database';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();
router.use(requireAuth);

/**
 * @swagger
 * tags:
 *   name: Pulpit
 *   description: Dane zasilające główny panel (Dashboard)
 *
 * /api/dashboard/alerts:
 *   get:
 *     summary: Pobiera alerty dla pulpitu
 *     description: Zwraca listy leków wymagających uwagi - z niskim stanem magazynowym (poniżej 10 sztuk) oraz leków, którym kończy się data ważności w ciągu najbliższych 90 dni.
 *     tags: [Pulpit]
 *     responses:
 *       200:
 *         description: Sukces. Zwraca obiekt z tablicami alertów.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 expiryAlerts:
 *                   type: array
 *                   description: Leki przeterminowujące się w ciągu 90 dni
 *                   items:
 *                     type: object
 *                     properties:
 *                       batch_id:
 *                         type: integer
 *                         example: 14
 *                       medicine_name:
 *                         type: string
 *                         example: "Amoxicillin 500mg"
 *                       stock:
 *                         type: integer
 *                         example: 45
 *                       expiry_date:
 *                         type: string
 *                         format: date
 *                         example: "2026-08-20"
 *                 lowStockAlerts:
 *                   type: array
 *                   description: Leki, których stan spadł poniżej 10 sztuk
 *                   items:
 *                     type: object
 *                     properties:
 *                       medicine_id:
 *                         type: integer
 *                         example: 3
 *                       medicine_name:
 *                         type: string
 *                         example: "Ibuprofen Forte"
 *                       total_stock:
 *                         type: integer
 *                         example: 4
 *       401:
 *         description: Brak autoryzacji (niezalogowany)
 *       500:
 *         description: Błąd wewnętrzny bazy danych
 */
router.get('/alerts', (req: Request, res: Response): void => {
  const expiryQuery = `
    SELECT m.id as batch_id, m.name as medicine_name, m.stock, m.expiry_date
    FROM medicines m
    WHERE m.expiry_date IS NOT NULL
      AND m.expiry_date <= date('now', '+90 days')
      AND m.expiry_date >= date('now')
      AND m.stock > 0
    ORDER BY m.expiry_date ASC
  `;

  const lowStockQuery = `
    SELECT m.id as medicine_id, m.name as medicine_name, m.stock as total_stock
    FROM medicines m
    WHERE m.stock < 10
    ORDER BY m.stock ASC
  `;

  db.all(expiryQuery, [], (err: any, expiryAlerts: any[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    db.all(lowStockQuery, [], (err2: any, lowStockAlerts: any[]) => {
      if (err2) {
        res.status(500).json({ error: err2.message });
        return;
      }

      res.json({ expiryAlerts, lowStockAlerts });
    });
  });
});

export default router;
