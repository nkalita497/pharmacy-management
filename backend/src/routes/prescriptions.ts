import express, { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import db from '../config/database';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { logAudit } from '../utils/audit';
import { broadcastEvent } from '../utils/websocket';

const router = express.Router();

router.use(requireAuth);

// Raport PDF z receptami (musi być przed '/:id', żeby nie łapało 'report' jako ID)
router.get('/report/pdf', requireRole(['admin', 'pharmacist']), (req: Request, res: Response): void => {
  const query = `
      SELECT p.id, p.quantity, p.prescription_date, p.expiry_date,
             p.status, m.name as medicine_name, pa.first_name, pa.last_name
      FROM prescriptions p
      JOIN medicines m ON p.medicine_id = m.id
      JOIN patients pa ON p.patient_id = pa.id
      ORDER BY p.prescription_date DESC
      LIMIT 50
  `;

  db.all(query, [], (err, rows: any[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=raport_recept.pdf');

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(20).text('Raport Recept Apteki', { align: 'center' });
    doc
      .font('Helvetica')
      .moveDown()
      .fontSize(12)
      .text(`Data wygenerowania: ${new Date().toLocaleDateString()}`, { align: 'right' })
      .moveDown(2);

    rows.forEach((rx) => {
      const date = rx.prescription_date || '';
      const patient = `${rx.first_name} ${rx.last_name}`;
      doc.fontSize(10).text(`Recepta #${rx.id} | Data: ${date} | Pacjent: ${patient}`);
      doc.text(`Lek: ${rx.medicine_name} | Ilość: ${rx.quantity} | Status: ${rx.status}`);
      doc.moveDown(0.5);
    });

    doc.end();
  });
});

// Lista recept
router.get('/', (req: Request, res: Response): void => {
  db.all('SELECT * FROM prescriptions', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Szczegóły pojedynczej recepty
router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  db.get('SELECT * FROM prescriptions WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }
    res.json(row);
  });
});

// Utworzenie recepty
router.post('/', requireRole(['admin', 'pharmacist']), (req: Request, res: Response): void => {
  const { patient_id, medicine_id, quantity, doctor_name, prescription_date, expiry_date, status } = req.body;

  if (!patient_id || !medicine_id || !quantity) {
    res.status(400).json({ error: 'patient_id, medicine_id and quantity are required' });
    return;
  }

  db.run(
    `INSERT INTO prescriptions (patient_id, medicine_id, quantity, doctor_name, prescription_date, expiry_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      patient_id,
      medicine_id,
      quantity,
      doctor_name || null,
      prescription_date || new Date().toISOString().split('T')[0],
      expiry_date || null,
      status || 'pending'
    ],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const uid = (req.user as any)?.id;
      if (uid) {
        logAudit(uid, 'CREATE', 'prescription', this.lastID, undefined, JSON.stringify(req.body));
      }
      res.status(201).json({ id: this.lastID, message: 'Prescription created' });
    }
  );
});

// Aktualizacja recepty
router.put('/:id', requireRole(['admin', 'pharmacist']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const { patient_id, medicine_id, quantity, doctor_name, prescription_date, expiry_date, status } = req.body;

  db.get('SELECT * FROM prescriptions WHERE id = ?', [id], (err, oldRx: any) => {
    if (err || !oldRx) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }

    db.run(
      `UPDATE prescriptions
       SET patient_id = ?, medicine_id = ?, quantity = ?, doctor_name = ?, prescription_date = ?, expiry_date = ?, status = ?
       WHERE id = ?`,
      [
        patient_id ?? oldRx.patient_id,
        medicine_id ?? oldRx.medicine_id,
        quantity ?? oldRx.quantity,
        doctor_name ?? oldRx.doctor_name,
        prescription_date ?? oldRx.prescription_date,
        expiry_date ?? oldRx.expiry_date,
        status ?? oldRx.status,
        id
      ],
      function (err2) {
        if (err2) {
          res.status(500).json({ error: err2.message });
          return;
        }
        const uid = (req.user as any)?.id;
        if (uid) {
          logAudit(
            uid,
            'UPDATE',
            'prescription',
            Number(id),
            JSON.stringify(oldRx),
            JSON.stringify({ patient_id, medicine_id, quantity, doctor_name, prescription_date, expiry_date, status })
          );
        }
        res.json({ message: 'Prescription updated' });
      }
    );
  });
});

// Usunięcie recepty
router.delete('/:id', requireRole(['admin', 'pharmacist']), (req: Request, res: Response): void => {
  const { id } = req.params;
  db.get('SELECT * FROM prescriptions WHERE id = ?', [id], (err, oldRx: any) => {
    if (err || !oldRx) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }

    db.run('DELETE FROM prescriptions WHERE id = ?', [id], function (err2) {
      if (err2) {
        res.status(500).json({ error: err2.message });
        return;
      }
      const uid = (req.user as any)?.id;
      if (uid) {
        logAudit(uid, 'DELETE', 'prescription', Number(id), JSON.stringify(oldRx), 'DELETED');
      }
      res.json({ message: 'Prescription deleted' });
    });
  });
});

// Realizacja recepty: sprawdza status i datę, stock leku, tworzy sprzedaż i aktualizuje magazyn
router.post('/:id/realize', requireRole(['pharmacist', 'admin']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const userId = (req.user as any)?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  db.get('SELECT * FROM prescriptions WHERE id = ?', [id], (err, rx: any) => {
    if (err || !rx) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }
    if (rx.status !== 'pending') {
      res.status(400).json({ error: 'Prescription is not pending' });
      return;
    }
    if (rx.expiry_date && new Date(rx.expiry_date) < new Date()) {
      res.status(400).json({ error: 'Prescription is expired' });
      return;
    }

    db.get('SELECT * FROM medicines WHERE id = ?', [rx.medicine_id], (err2, med: any) => {
      if (err2 || !med) {
        res.status(400).json({ error: 'Medicine not found for prescription' });
        return;
      }
      if (med.stock < rx.quantity) {
        res.status(400).json({ error: 'Not enough stock to realize prescription' });
        return;
      }

      const unitPrice = med.price;
      const totalPrice = unitPrice * rx.quantity;

      db.serialize(() => {
        db.run(
          'UPDATE medicines SET stock = stock - ? WHERE id = ?',
          [rx.quantity, rx.medicine_id],
          (err3) => {
            if (err3) {
              res.status(500).json({ error: err3.message });
              return;
            }
          }
        );

        db.run(
          `INSERT INTO sales (prescription_id, medicine_id, quantity, unit_price, total_price, user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [rx.id, rx.medicine_id, rx.quantity, unitPrice, totalPrice, userId],
          function (err4) {
            if (err4) {
              res.status(500).json({ error: err4.message });
              return;
            }

            db.run(
              'UPDATE prescriptions SET status = ? WHERE id = ?',
              ['completed', id],
              (err5) => {
                if (err5) {
                  res.status(500).json({ error: err5.message });
                  return;
                }

                logAudit(
                  userId,
                  'REALIZE',
                  'prescription',
                  Number(id),
                  JSON.stringify(rx),
                  JSON.stringify({ status: 'completed' })
                );
                logAudit(
                  userId,
                  'CREATE',
                  'sale',
                  this.lastID,
                  undefined,
                  JSON.stringify({
                    prescription_id: rx.id,
                    medicine_id: rx.medicine_id,
                    quantity: rx.quantity,
                    total_price: totalPrice
                  })
                );

                broadcastEvent('prescription:realized', { id: rx.id });
                broadcastEvent('sale:created', { id: this.lastID, medicine_id: rx.medicine_id, total_price: totalPrice });

                res.json({ message: 'Prescription realized successfully' });
              }
            );
          }
        );
      });
    });
  });
});

export default router;
