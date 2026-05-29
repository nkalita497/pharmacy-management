"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFts = initFts;
exports.rebuildFtsIndex = rebuildFtsIndex;
exports.searchFts = searchFts;
const database_1 = __importDefault(require("../config/database"));
function initFts() {
    return new Promise((resolve, reject) => {
        database_1.default.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS pharmacy_fts USING fts5(
        entity_type,
        entity_id UNINDEXED,
        title,
        body,
        tokenize='unicode61'
      );`, (err) => (err ? reject(err) : resolve()));
    });
}
function rebuildFtsIndex() {
    return new Promise((resolve, reject) => {
        database_1.default.serialize(() => {
            database_1.default.run('DELETE FROM pharmacy_fts', (err) => {
                if (err)
                    return reject(err);
                const inserts = [];
                database_1.default.all('SELECT id, name, description, category FROM medicines', [], (e1, meds) => {
                    if (e1)
                        return reject(e1);
                    meds?.forEach((m) => inserts.push({
                        type: 'medicine',
                        id: m.id,
                        title: m.name,
                        body: [m.description, m.category].filter(Boolean).join(' ')
                    }));
                    database_1.default.all('SELECT id, first_name, last_name, pesel, email FROM patients', [], (e2, patients) => {
                        if (e2)
                            return reject(e2);
                        patients?.forEach((p) => inserts.push({
                            type: 'patient',
                            id: p.id,
                            title: `${p.first_name} ${p.last_name}`,
                            body: [p.pesel, p.email].filter(Boolean).join(' ')
                        }));
                        database_1.default.all('SELECT id, name, contact, email FROM suppliers', [], (e3, suppliers) => {
                            if (e3)
                                return reject(e3);
                            suppliers?.forEach((s) => inserts.push({
                                type: 'supplier',
                                id: s.id,
                                title: s.name,
                                body: [s.contact, s.email].filter(Boolean).join(' ')
                            }));
                            const stmt = database_1.default.prepare('INSERT INTO pharmacy_fts (entity_type, entity_id, title, body) VALUES (?, ?, ?, ?)');
                            inserts.forEach((row) => stmt.run([row.type, row.id, row.title, row.body]));
                            stmt.finalize((e4) => (e4 ? reject(e4) : resolve()));
                        });
                    });
                });
            });
        });
    });
}
function searchFts(query, limit = 25) {
    const term = query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => `"${w.replace(/"/g, '')}"*`)
        .join(' ');
    if (!term)
        return Promise.resolve([]);
    return new Promise((resolve, reject) => {
        database_1.default.all(`SELECT entity_type, entity_id, title, body, rank
       FROM pharmacy_fts
       WHERE pharmacy_fts MATCH ?
       ORDER BY rank
       LIMIT ?`, [term, limit], (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });
}
//# sourceMappingURL=fts.js.map