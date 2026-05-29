import express, { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import db from '../config/database';
import { Sale } from '../models/types';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { logAudit } from '../utils/audit';
import { broadcastEvent } from '../utils/websocket';
import { sendNotificationEmail, buildAlertEmail } from '../utils/email';

const router = express.Router();

router.use(requireAuth);

// ==========================================
// ZAAWANSOWANE OPERACJE BIZNESOWE (PDF)
// ==========================================

router.get('/report/pdf', requireRole(['admin', 'pharmacist']), (req: Request, res: Response): void => {
  const query = `
      SELECT s.id, s.quantity, s.total_price, s.sale_date, m.name as medicine_name
      FROM sales s
      JOIN medicines m ON s.medicine_id = m.id
      ORDER BY s.sale_date DESC
      LIMIT 50
  `;

  db.all(query, [], (err, rows: any[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=raport_sprzedazy.pdf');

    const doc = new PDFDocument({ margin: 50 });
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

router.get('/', (req: Request, res: Response): void => {
  db.all('SELECT * FROM sales', (err, rows: Sale[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  db.get('SELECT * FROM sales WHERE id = ?', [id], (err, row: Sale) => {
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

router.post('/', (req: Request, res: Response): void => {
  const sessionUserId = (req.user as { id: number })?.id;
  if (!sessionUserId) {
    res.status(401).json({ error: 'Brak autoryzacji. Zaloguj się.' });
    return;
  }

  const { prescription_id, medicine_id, quantity, unit_price } = req.body;

  if (!medicine_id || !quantity || !unit_price) {
    res.status(400).json({ error: 'Medicine ID, quantity and unit price are required' });
    return;
  }

  const total_price = quantity * unit_price;
  const user_id = sessionUserId;

  db.get('SELECT stock FROM medicines WHERE id = ?', [medicine_id], (err, med: any) => {
    if (err || !med) {
      res.status(400).json({ error: 'Medicine not found' });
      return;
    }
    if (med.stock < quantity) {
      res.status(400).json({ error: 'Not enough stock' });
      return;
    }

    db.serialize(() => {
      db.run(
        `INSERT INTO sales (prescription_id, medicine_id, quantity, unit_price, total_price, user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [prescription_id, medicine_id, quantity, unit_price, total_price, user_id],
        function(err2) {
          if (err2) {
            res.status(500).json({ error: err2.message });
            return;
          }

          db.run(
            'UPDATE medicines SET stock = stock - ? WHERE id = ?',
            [quantity, medicine_id],
            (err3) => {
              if (err3) {
                res.status(500).json({ error: err3.message });
                return;
              }

              logAudit(
                user_id,
                'CREATE',
                'sale',
                this.lastID,
                undefined,
                JSON.stringify({ medicine_id, quantity, total_price })
              );
              broadcastEvent('sale:created', { id: this.lastID, medicine_id, total_price });
              res.status(201).json({ id: this.lastID, message: 'Sale created' });
            }
          );
        }
      );
    });
  });
});

router.put('/:id', requireRole(['admin']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const { prescription_id, medicine_id, quantity, unit_price } = req.body;
  const total_price = quantity * unit_price;

  db.get('SELECT * FROM sales WHERE id = ?', [id], (err, oldSale: any) => {
    if (err || !oldSale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const deltaQty = quantity - oldSale.quantity;

    db.get('SELECT stock FROM medicines WHERE id = ?', [medicine_id], (err2, med: any) => {
      if (err2 || !med) {
        res.status(400).json({ error: 'Medicine not found' });
        return;
      }
      if (deltaQty > 0 && med.stock < deltaQty) {
        res.status(400).json({ error: 'Not enough stock' });
        return;
      }

      db.serialize(() => {
        db.run(
          `UPDATE sales SET prescription_id=?, medicine_id=?, quantity=?, unit_price=?, total_price=?
           WHERE id=?`,
          [prescription_id, medicine_id, quantity, unit_price, total_price, id],
          function(err3) {
            if (err3) {
              res.status(500).json({ error: err3.message });
              return;
            }

            db.run(
              'UPDATE medicines SET stock = stock - ? WHERE id = ?',
              [deltaQty, medicine_id],
              (err4) => {
                if (err4) {
                  res.status(500).json({ error: err4.message });
                  return;
                }

                const uid = (req.user as any)?.id;
                if (uid) {
                  logAudit(
                    uid,
                    'UPDATE',
                    'sale',
                    Number(id),
                    JSON.stringify(oldSale),
                    JSON.stringify({ medicine_id, quantity, total_price })
                  );
                }
                res.json({ message: 'Sale updated' });
              }
            );
          }
        );
      });
    });
  });
});

router.delete('/:id', requireRole(['admin']), (req: Request, res: Response): void => {
  const { id } = req.params;

  db.get('SELECT * FROM sales WHERE id = ?', [id], (err, oldSale: any) => {
    if (err || !oldSale) {
      res.status(500).json({ error: err?.message || 'Sale not found' });
      return;
    }

    db.serialize(() => {
      db.run(
        'UPDATE medicines SET stock = stock + ? WHERE id = ?',
        [oldSale.quantity, oldSale.medicine_id],
        (err2) => {
          if (err2) {
            res.status(500).json({ error: err2.message });
            return;
          }

          db.run('DELETE FROM sales WHERE id=?', [id], function(err3) {
            if (err3) {
              res.status(500).json({ error: err3.message });
              return;
            }

            const uid = (req.user as any)?.id;
            if (uid) {
              logAudit(uid, 'DELETE', 'sale', Number(id), JSON.stringify(oldSale), 'DELETED');
            }
            res.json({ message: 'Sale deleted' });
          });
        }
      );
    });
  });
});

export default router;
