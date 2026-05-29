import express, { Request, Response } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import db from '../config/database';
import { Medicine } from '../models/types';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { parsePagination, paginatedResponse } from '../utils/pagination';
import { rebuildFtsIndex } from '../utils/fts';
import { broadcastEvent } from '../utils/websocket';

const router = express.Router();

// Konfiguracja multer (przechwytujemy plik w pamięci RAM, bez zapisywania na dysku)
const upload = multer({ storage: multer.memoryStorage() });

function prepareCsvImport(buffer: Buffer): { text: string; separator: string } {
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const separator = semicolons >= commas && semicolons > 0 ? ';' : ',';
  return { text, separator };
}

function normalizeCsvRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.replace(/^\ufeff/, '').trim()] = value;
  }
  return normalized;
}

// Blokada dla całego pliku (tylko zalogowani)
router.use(requireAuth);

/**
 * @swagger
 * tags:
 * name: Leki
 * description: Zarządzanie magazynem leków oraz import danych
 */

// ==========================================
// ZAAWANSOWANE OPERACJE BIZNESOWE (CSV)
// ==========================================

/**
 * @swagger
 * /api/medicines/import:
 * post:
 * summary: Import leków z pliku CSV
 * description: Import CSV działa w trybie upsert. Jeśli wiersz zawiera ID (lub Nazwa + DostawcaID) i lek istnieje, aktualizuje m.in. cenę i stan. Jeśli lek nie istnieje, doda nowy rekord (wymaga min. Nazwa i Cena). Separator: średnik (;). Przykładowe nagłówki: ID, Nazwa, Cena, Opis, Kategoria, DostawcaID, Ilosc, DataWaznosci.
 * tags: [Leki]
 * requestBody:
 * required: true
 * content:
 * multipart/form-data:
 * schema:
 * type: object
 * properties:
 * file:
 * type: string
 * format: binary
 * description: Plik CSV z listą leków
 * responses:
 * 200:
 * description: Import zakończony pomyślnie.
 * 400:
 * description: Brak pliku w żądaniu.
 * 401:
 * description: Brak autoryzacji.
 * 403:
 * description: Brak wystarczających uprawnień.
 * 500:
 * description: Błąd zapisu do bazy danych.
 */
router.post('/import', requireRole(['admin', 'pharmacist']), upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'Nie przesłano pliku CSV.' });
    return;
  }

  const results: any[] = [];
  const { text, separator } = prepareCsvImport(req.file.buffer);
  const stream = Readable.from(text);

  stream
    .pipe(csv({ separator }))
    .on('data', (data) => results.push(normalizeCsvRow(data)))
    .on('end', () => {
      if (!results.length) {
        res.status(400).json({
          error:
            'Nie wczytano żadnych wierszy. Zapisz plik jako CSV ze średnikiem (;) i nagłówkami: Nazwa;Cena;Opis;Kategoria;DostawcaID;Ilosc;DataWaznosci. Przykład: docs/examples/leki-import-przyklad.csv'
        });
        return;
      }

      db.serialize(() => {
        const insertStmt = db.prepare(
          `INSERT INTO medicines (name, description, category, supplier_id, price, stock, expiry_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        );

        const updateStmt = db.prepare(
          `UPDATE medicines
           SET price = COALESCE(?, price),
               stock = COALESCE(?, stock),
               expiry_date = COALESCE(?, expiry_date),
               description = COALESCE(?, description),
               category = COALESCE(?, category),
               supplier_id = COALESCE(?, supplier_id)
           WHERE id = ?`
        );

        const normalizeNumber = (val: unknown): number | undefined => {
          if (val === undefined || val === null) return undefined;
          const raw = String(val).trim();
          if (!raw) return undefined;
          const n = Number(raw.replace(',', '.'));
          return Number.isFinite(n) ? n : undefined;
        };

        const normalizeInt = (val: unknown): number | undefined => {
          const n = normalizeNumber(val);
          if (n === undefined) return undefined;
          return Number.isFinite(n) ? Math.trunc(n) : undefined;
        };

        const normalizeText = (val: unknown): string | undefined => {
          if (val === undefined || val === null) return undefined;
          const s = String(val).trim();
          return s ? s : undefined;
        };

        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        let pending = 0;
        let aborted = false;

        const finalize = (err?: Error): void => {
          if (aborted) return;
          aborted = true;

          insertStmt.finalize(() => undefined);
          updateStmt.finalize(() => undefined);

          if (err) {
            res.status(500).json({ error: 'Błąd podczas importu CSV: ' + err.message });
            return;
          }

          rebuildFtsIndex().catch(() => undefined);
          broadcastEvent('medicines:import', { inserted, updated, skipped, total: results.length });
          res.json({
            message: `Import zakończony sukcesem. Dodano: ${inserted}, zaktualizowano: ${updated}, pominięto: ${skipped}.`,
            inserted,
            updated,
            skipped,
            total: results.length
          });
        };

        const doneOne = (): void => {
          pending--;
          if (pending === 0) finalize();
        };

        const processRow = (row: any): void => {
          const id = normalizeInt(row.ID ?? row.Id ?? row.id);
          const name = normalizeText(row.Nazwa ?? row.Name ?? row.name);
          const supplierId = normalizeInt(row.DostawcaID ?? row.SupplierID ?? row.supplier_id);

          const price = normalizeNumber(row.Cena ?? row.Price ?? row.price);
          const stock = normalizeInt(row.Ilosc ?? row.Ilość ?? row.Stock ?? row.stock);
          const expiryDate = normalizeText(row.DataWaznosci ?? row.DataWażności ?? row.ExpiryDate ?? row.expiry_date);
          const description = normalizeText(row.Opis ?? row.Description ?? row.description);
          const category = normalizeText(row.Kategoria ?? row.Category ?? row.category);

          // Minimalne dane: update wymaga klucza (ID albo Nazwa + DostawcaID), insert wymaga Nazwy i Ceny
          const hasKey = id !== undefined || (name !== undefined && supplierId !== undefined);
          const hasAnyUpdatableField =
            price !== undefined ||
            stock !== undefined ||
            expiryDate !== undefined ||
            description !== undefined ||
            category !== undefined ||
            supplierId !== undefined;

          if (!hasKey && !(name && price !== undefined)) {
            skipped++;
            doneOne();
            return;
          }

          if (id !== undefined) {
            db.get('SELECT id FROM medicines WHERE id = ?', [id], (err, existing: any) => {
              if (err) return finalize(err);
              if (existing?.id) {
                if (!hasAnyUpdatableField) {
                  skipped++;
                  doneOne();
                  return;
                }
                updateStmt.run([price, stock, expiryDate, description, category, supplierId, id], (err2) => {
                  if (err2) return finalize(err2);
                  updated++;
                  doneOne();
                });
              } else {
                // brak rekordu o tym ID — próbuj insert (jeśli da się)
                if (!name || price === undefined) {
                  skipped++;
                  doneOne();
                  return;
                }
                insertStmt.run(
                  [
                    name,
                    description || '',
                    category || '',
                    supplierId ?? 1,
                    price,
                    stock ?? 0,
                    expiryDate ?? null
                  ],
                  (err3) => {
                    if (err3) return finalize(err3);
                    inserted++;
                    doneOne();
                  }
                );
              }
            });
            return;
          }

          // klucz po nazwie i dostawcy
          if (name && supplierId !== undefined) {
            db.get(
              'SELECT id FROM medicines WHERE name = ? AND supplier_id = ?',
              [name, supplierId],
              (err, existing: any) => {
                if (err) return finalize(err);
                if (existing?.id) {
                  if (!hasAnyUpdatableField) {
                    skipped++;
                    doneOne();
                    return;
                  }
                  updateStmt.run([price, stock, expiryDate, description, category, supplierId, existing.id], (err2) => {
                    if (err2) return finalize(err2);
                    updated++;
                    doneOne();
                  });
                  return;
                }

                // insert nowego
                if (price === undefined) {
                  skipped++;
                  doneOne();
                  return;
                }
                insertStmt.run(
                  [
                    name,
                    description || '',
                    category || '',
                    supplierId,
                    price,
                    stock ?? 0,
                    expiryDate ?? null
                  ],
                  (err3) => {
                    if (err3) return finalize(err3);
                    inserted++;
                    doneOne();
                  }
                );
              }
            );
            return;
          }

          // brak sensownego klucza na update
          if (name && price !== undefined) {
            insertStmt.run(
              [name, description || '', category || '', supplierId ?? 1, price, stock ?? 0, expiryDate ?? null],
              (err3) => {
                if (err3) return finalize(err3);
                inserted++;
                doneOne();
              }
            );
            return;
          }

          skipped++;
          doneOne();
        };

        if (!results.length) {
          finalize();
          return;
        }

        pending = results.length;
        results.forEach(processRow);
      });
    });
});

// ==========================================
// PODSTAWOWE OPERACJE CRUD
// ==========================================

/**
 * @swagger
 * /api/medicines:
 * get:
 * summary: Pobiera listę leków (z paginacją i filtrowaniem)
 * description: Zwraca stronę wyników z tabeli leków. Możliwość wyszukiwania po nazwie, opisie lub kategorii.
 * tags: [Leki]
 * parameters:
 * - in: query
 * name: page
 * schema:
 * type: integer
 * default: 1
 * description: Numer strony
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * default: 20
 * description: Ilość elementów na stronie
 * - in: query
 * name: sort
 * schema:
 * type: string
 * default: "name"
 * description: Kolumna sortowania
 * - in: query
 * name: order
 * schema:
 * type: string
 * enum: [asc, desc]
 * default: "asc"
 * description: Kierunek sortowania
 * - in: query
 * name: q
 * schema:
 * type: string
 * description: Fraza wyszukiwania
 * responses:
 * 200:
 * description: Pomyślnie pobrano listę leków.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * data:
 * type: array
 * items:
 * $ref: '#/components/schemas/Medicine'
 * meta:
 * type: object
 * properties:
 * total:
 * type: integer
 * page:
 * type: integer
 * limit:
 * type: integer
 * totalPages:
 * type: integer
 * 401:
 * description: Brak autoryzacji.
 * 500:
 * description: Błąd wewnętrzny bazy danych.
 */
router.get('/', (req: Request, res: Response): void => {
  const params = parsePagination(req, 'medicines');
  let where = '1=1';
  const queryParams: (string | number)[] = [];

  if (params.q) {
    where += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)';
    const like = `%${params.q}%`;
    queryParams.push(like, like, like);
  }

  db.get(`SELECT COUNT(*) as total FROM medicines WHERE ${where}`, queryParams, (err, countRow: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.all(
      `SELECT * FROM medicines WHERE ${where} ORDER BY ${params.sort} ${params.order} LIMIT ? OFFSET ?`,
      [...queryParams, params.limit, params.offset],
      (err2, rows: Medicine[]) => {
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
 * /api/medicines/{id}:
 * get:
 * summary: Pobiera szczegóły pojedynczego leku
 * tags: [Leki]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: Unikalne ID leku
 * responses:
 * 200:
 * description: Zwraca obiekt leku.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Medicine'
 * 401:
 * description: Brak autoryzacji.
 * 404:
 * description: Nie znaleziono leku o podanym ID.
 * 500:
 * description: Błąd zapytania SQL.
 */
router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  db.get('SELECT * FROM medicines WHERE id = ?', [id], (err, row: Medicine) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Medicine not found' });
      return;
    }
    res.json(row);
  });
});

/**
 * @swagger
 * /api/medicines:
 * post:
 * summary: Dodaje nowy lek do magazynu
 * description: Wymaga uprawnień administratora lub farmaceuty. Powiadamia podłączonych klientów WebSocket (emituje zdarzenie).
 * tags: [Leki]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/CreateMedicineRequest'
 * responses:
 * 201:
 * description: Lek został pomyślnie dodany.
 * 400:
 * description: Brak wymaganych pól (Nazwa i Cena).
 * 401:
 * description: Brak autoryzacji.
 * 403:
 * description: Brak uprawnień.
 * 500:
 * description: Błąd wewnętrzny serwera.
 */
router.post('/', requireRole(['admin', 'pharmacist']), (req: Request, res: Response): void => {
  const { name, description, category, supplier_id, price, stock, expiry_date } = req.body;

  if (!name || !price) {
    res.status(400).json({ error: 'Name and price are required' });
    return;
  }

  db.run(
    `INSERT INTO medicines (name, description, category, supplier_id, price, stock, expiry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description, category, supplier_id, price, stock, expiry_date],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      rebuildFtsIndex().catch(() => undefined);
      broadcastEvent('medicine:created', { id: this.lastID });
      res.status(201).json({ id: this.lastID, message: 'Medicine created' });
    }
  );
});

/**
 * @swagger
 * /api/medicines/{id}:
 * put:
 * summary: Aktualizuje dane leku
 * description: Wymaga uprawnień administratora lub farmaceuty.
 * tags: [Leki]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/CreateMedicineRequest'
 * responses:
 * 200:
 * description: Dane leku zostały pomyślnie zaktualizowane.
 * 401:
 * description: Brak autoryzacji.
 * 403:
 * description: Brak uprawnień.
 * 500:
 * description: Błąd bazy danych.
 */
router.put('/:id', requireRole(['admin', 'pharmacist']), (req: Request, res: Response): void => {
  const { id } = req.params;
  const { name, description, category, supplier_id, price, stock, expiry_date } = req.body;

  db.run(
    `UPDATE medicines SET name=?, description=?, category=?, supplier_id=?, price=?, stock=?, expiry_date=?
     WHERE id=?`,
    [name, description, category, supplier_id, price, stock, expiry_date, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Medicine updated' });
    }
  );
});

/**
 * @swagger
 * /api/medicines/{id}:
 * delete:
 * summary: Usuwa lek z magazynu
 * description: Całkowicie usuwa pozycję leku z bazy danych. Wymaga uprawnień administratora.
 * tags: [Leki]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Lek został pomyślnie usunięty.
 * 401:
 * description: Brak autoryzacji.
 * 403:
 * description: Brak uprawnień (np. jesteś zalogowany jako kasjer lub farmaceuta).
 * 500:
 * description: Błąd serwera.
 */
router.delete('/:id', requireRole(['admin']), (req: Request, res: Response): void => {
  const { id } = req.params;

  db.get('SELECT id FROM medicines WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Medicine not found' });
      return;
    }

    db.get(
      `SELECT
         (SELECT COUNT(*) FROM sales WHERE medicine_id = ?) AS sales_count,
         (SELECT COUNT(*) FROM prescriptions WHERE medicine_id = ?) AS rx_count,
         (SELECT COUNT(*) FROM deliveries WHERE medicine_id = ?) AS delivery_count`,
      [id, id, id],
      (err2, refs: any) => {
        if (err2) {
          res.status(500).json({ error: err2.message });
          return;
        }

        const blocked =
          (refs?.sales_count ?? 0) + (refs?.rx_count ?? 0) + (refs?.delivery_count ?? 0);
        if (blocked > 0) {
          res.status(409).json({
            error:
              'Nie można usunąć leku — istnieją powiązane sprzedaże, recepty lub dostawy.'
          });
          return;
        }

        db.run('DELETE FROM medicines WHERE id=?', [id], function (err3) {
          if (err3) {
            res.status(500).json({ error: err3.message });
            return;
          }
          res.json({ message: 'Medicine deleted' });
        });
      }
    );
  });
});

export default router;
