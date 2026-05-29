"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const stream_1 = require("stream");
const database_1 = __importDefault(require("../config/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const pagination_1 = require("../utils/pagination");
const fts_1 = require("../utils/fts");
const websocket_1 = require("../utils/websocket");
const router = express_1.default.Router();
// Konfiguracja multer (przechwytujemy plik w pamięci RAM, bez zapisywania na dysku)
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Blokada dla całego pliku (tylko zalogowani)
router.use(authMiddleware_1.requireAuth);
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
router.post('/import', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), upload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'Nie przesłano pliku CSV.' });
        return;
    }
    const results = [];
    const stream = stream_1.Readable.from(req.file.buffer.toString());
    stream
        .pipe((0, csv_parser_1.default)({ separator: ';' }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
        database_1.default.serialize(() => {
            const insertStmt = database_1.default.prepare(`INSERT INTO medicines (name, description, category, supplier_id, price, stock, expiry_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`);
            const updateStmt = database_1.default.prepare(`UPDATE medicines
           SET price = COALESCE(?, price),
               stock = COALESCE(?, stock),
               expiry_date = COALESCE(?, expiry_date),
               description = COALESCE(?, description),
               category = COALESCE(?, category),
               supplier_id = COALESCE(?, supplier_id)
           WHERE id = ?`);
            const normalizeNumber = (val) => {
                if (val === undefined || val === null)
                    return undefined;
                const raw = String(val).trim();
                if (!raw)
                    return undefined;
                const n = Number(raw.replace(',', '.'));
                return Number.isFinite(n) ? n : undefined;
            };
            const normalizeInt = (val) => {
                const n = normalizeNumber(val);
                if (n === undefined)
                    return undefined;
                return Number.isFinite(n) ? Math.trunc(n) : undefined;
            };
            const normalizeText = (val) => {
                if (val === undefined || val === null)
                    return undefined;
                const s = String(val).trim();
                return s ? s : undefined;
            };
            let inserted = 0;
            let updated = 0;
            let skipped = 0;
            let pending = 0;
            let aborted = false;
            const finalize = (err) => {
                if (aborted)
                    return;
                aborted = true;
                insertStmt.finalize(() => undefined);
                updateStmt.finalize(() => undefined);
                if (err) {
                    res.status(500).json({ error: 'Błąd podczas importu CSV: ' + err.message });
                    return;
                }
                (0, fts_1.rebuildFtsIndex)().catch(() => undefined);
                (0, websocket_1.broadcastEvent)('medicines:import', { inserted, updated, skipped, total: results.length });
                res.json({
                    message: `Import zakończony sukcesem. Dodano: ${inserted}, zaktualizowano: ${updated}, pominięto: ${skipped}.`,
                    inserted,
                    updated,
                    skipped,
                    total: results.length
                });
            };
            const doneOne = () => {
                pending--;
                if (pending === 0)
                    finalize();
            };
            const processRow = (row) => {
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
                const hasAnyUpdatableField = price !== undefined ||
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
                    database_1.default.get('SELECT id FROM medicines WHERE id = ?', [id], (err, existing) => {
                        if (err)
                            return finalize(err);
                        if (existing?.id) {
                            if (!hasAnyUpdatableField) {
                                skipped++;
                                doneOne();
                                return;
                            }
                            updateStmt.run([price, stock, expiryDate, description, category, supplierId, id], (err2) => {
                                if (err2)
                                    return finalize(err2);
                                updated++;
                                doneOne();
                            });
                        }
                        else {
                            // brak rekordu o tym ID — próbuj insert (jeśli da się)
                            if (!name || price === undefined) {
                                skipped++;
                                doneOne();
                                return;
                            }
                            insertStmt.run([
                                name,
                                description || '',
                                category || '',
                                supplierId ?? 1,
                                price,
                                stock ?? 0,
                                expiryDate ?? null
                            ], (err3) => {
                                if (err3)
                                    return finalize(err3);
                                inserted++;
                                doneOne();
                            });
                        }
                    });
                    return;
                }
                // klucz po nazwie i dostawcy
                if (name && supplierId !== undefined) {
                    database_1.default.get('SELECT id FROM medicines WHERE name = ? AND supplier_id = ?', [name, supplierId], (err, existing) => {
                        if (err)
                            return finalize(err);
                        if (existing?.id) {
                            if (!hasAnyUpdatableField) {
                                skipped++;
                                doneOne();
                                return;
                            }
                            updateStmt.run([price, stock, expiryDate, description, category, supplierId, existing.id], (err2) => {
                                if (err2)
                                    return finalize(err2);
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
                        insertStmt.run([
                            name,
                            description || '',
                            category || '',
                            supplierId,
                            price,
                            stock ?? 0,
                            expiryDate ?? null
                        ], (err3) => {
                            if (err3)
                                return finalize(err3);
                            inserted++;
                            doneOne();
                        });
                    });
                    return;
                }
                // brak sensownego klucza na update
                if (name && price !== undefined) {
                    insertStmt.run([name, description || '', category || '', supplierId ?? 1, price, stock ?? 0, expiryDate ?? null], (err3) => {
                        if (err3)
                            return finalize(err3);
                        inserted++;
                        doneOne();
                    });
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
router.get('/', (req, res) => {
    const params = (0, pagination_1.parsePagination)(req, 'medicines');
    let where = '1=1';
    const queryParams = [];
    if (params.q) {
        where += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)';
        const like = `%${params.q}%`;
        queryParams.push(like, like, like);
    }
    database_1.default.get(`SELECT COUNT(*) as total FROM medicines WHERE ${where}`, queryParams, (err, countRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        database_1.default.all(`SELECT * FROM medicines WHERE ${where} ORDER BY ${params.sort} ${params.order} LIMIT ? OFFSET ?`, [...queryParams, params.limit, params.offset], (err2, rows) => {
            if (err2) {
                res.status(500).json({ error: err2.message });
                return;
            }
            res.json((0, pagination_1.paginatedResponse)(rows, countRow.total, params));
        });
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
router.get('/:id', (req, res) => {
    const { id } = req.params;
    database_1.default.get('SELECT * FROM medicines WHERE id = ?', [id], (err, row) => {
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
router.post('/', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), (req, res) => {
    const { name, description, category, supplier_id, price, stock, expiry_date } = req.body;
    if (!name || !price) {
        res.status(400).json({ error: 'Name and price are required' });
        return;
    }
    database_1.default.run(`INSERT INTO medicines (name, description, category, supplier_id, price, stock, expiry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [name, description, category, supplier_id, price, stock, expiry_date], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        (0, fts_1.rebuildFtsIndex)().catch(() => undefined);
        (0, websocket_1.broadcastEvent)('medicine:created', { id: this.lastID });
        res.status(201).json({ id: this.lastID, message: 'Medicine created' });
    });
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
router.put('/:id', (0, roleMiddleware_1.requireRole)(['admin', 'pharmacist']), (req, res) => {
    const { id } = req.params;
    const { name, description, category, supplier_id, price, stock, expiry_date } = req.body;
    database_1.default.run(`UPDATE medicines SET name=?, description=?, category=?, supplier_id=?, price=?, stock=?, expiry_date=?
     WHERE id=?`, [name, description, category, supplier_id, price, stock, expiry_date, id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Medicine updated' });
    });
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
router.delete('/:id', (0, roleMiddleware_1.requireRole)(['admin']), (req, res) => {
    const { id } = req.params;
    database_1.default.get('SELECT id FROM medicines WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Medicine not found' });
            return;
        }
        database_1.default.get(`SELECT
         (SELECT COUNT(*) FROM sales WHERE medicine_id = ?) AS sales_count,
         (SELECT COUNT(*) FROM prescriptions WHERE medicine_id = ?) AS rx_count,
         (SELECT COUNT(*) FROM deliveries WHERE medicine_id = ?) AS delivery_count`, [id, id, id], (err2, refs) => {
            if (err2) {
                res.status(500).json({ error: err2.message });
                return;
            }
            const blocked = (refs?.sales_count ?? 0) + (refs?.rx_count ?? 0) + (refs?.delivery_count ?? 0);
            if (blocked > 0) {
                res.status(409).json({
                    error: 'Nie można usunąć leku — istnieją powiązane sprzedaże, recepty lub dostawy.'
                });
                return;
            }
            database_1.default.run('DELETE FROM medicines WHERE id=?', [id], function (err3) {
                if (err3) {
                    res.status(500).json({ error: err3.message });
                    return;
                }
                res.json({ message: 'Medicine deleted' });
            });
        });
    });
});
exports.default = router;
//# sourceMappingURL=medicines.js.map