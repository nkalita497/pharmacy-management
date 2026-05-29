import express, { Request, Response } from 'express';
import db from '../config/database';
import { Supplier } from '../models/types';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { logAudit } from '../utils/audit';
import { parsePagination, paginatedResponse } from '../utils/pagination';

const router = express.Router();
router.use(requireAuth);

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
router.get('/', (req: Request, res: Response): void => {
  const params = parsePagination(req, 'suppliers');
  let where = '1=1';
  const queryParams: (string | number)[] = [];
  if (params.q) {
    where += ' AND (name LIKE ? OR contact LIKE ? OR email LIKE ?)';
    const like = `%${params.q}%`;
    queryParams.push(like, like, like);
  }
  db.get(`SELECT COUNT(*) as total FROM suppliers WHERE ${where}`, queryParams, (err, countRow: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.all(
      `SELECT * FROM suppliers WHERE ${where} ORDER BY ${params.sort} ${params.order} LIMIT ? OFFSET ?`,
      [...queryParams, params.limit, params.offset],
      (err2, rows: Supplier[]) => {
        if (err2) {
          res.status(500).json({ error: err2.message });
          return;
        }
        res.json(paginatedResponse(rows, countRow.total, params));
      }
    );
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
router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  db.get('SELECT * FROM suppliers WHERE id = ?', [id], (err, row: Supplier) => {
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
router.post('/', requireRole(['admin', 'pharmacist']), (req: Request, res: Response): void => {
  const { name, contact, email, phone } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  db.run(
    `INSERT INTO suppliers (name, contact, email, phone) VALUES (?, ?, ?, ?)`,
    [name, contact, email, phone],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const uid = (req.user as any)?.id;
      if (uid) logAudit(uid, 'CREATE', 'supplier', this.lastID, undefined, JSON.stringify({ name }));
      res.status(201).json({ id: this.lastID, message: 'Supplier created' });
    }
  );
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
router.put('/:id', requireRole(['admin', 'pharmacist']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const { name, contact, email, phone } = req.body;

  db.get('SELECT * FROM suppliers WHERE id = ?', [id], (err, oldSupplier: any) => {
    db.run(
      `UPDATE suppliers SET name=?, contact=?, email=?, phone=? WHERE id=?`,
      [name, contact, email, phone, id],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        const uid = (req.user as any)?.id;
        if (uid) {
          logAudit(uid, 'UPDATE', 'supplier', Number(id), JSON.stringify(oldSupplier), JSON.stringify({ name, contact, email, phone }));
        }
        res.json({ message: 'Supplier updated' });
      }
    );
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
router.delete('/:id', requireRole(['admin', 'pharmacist']), (req: Request, res: Response): void => {
  const { id } = req.params;

  db.get('SELECT * FROM suppliers WHERE id = ?', [id], (err, oldSupplier: any) => {
    if (err || !oldSupplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    db.run('DELETE FROM suppliers WHERE id=?', [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const uid = (req.user as any)?.id;
      if (uid) {
        logAudit(uid, 'DELETE', 'supplier', Number(id), JSON.stringify(oldSupplier), 'DELETED');
      }
      res.json({ message: 'Supplier deleted' });
    });
  });
});

export default router;
