"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const fts_1 = require("../utils/fts");
function run(sql) {
    return new Promise((resolve, reject) => {
        database_1.default.run(sql, (err) => (err ? reject(err) : resolve()));
    });
}
async function migrate() {
    const alters = [
        'ALTER TABLE users ADD COLUMN email TEXT',
        'ALTER TABLE users ADD COLUMN mfa_secret TEXT',
        'ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0'
    ];
    for (const sql of alters) {
        try {
            await run(sql);
            console.log('OK:', sql.slice(0, 50));
        }
        catch (e) {
            if (e.message?.includes('duplicate column')) {
                console.log('Skip (exists):', sql.slice(0, 40));
            }
            else {
                throw e;
            }
        }
    }
    await run(`CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    theme TEXT DEFAULT 'light' CHECK(theme IN ('light', 'dark')),
    locale TEXT DEFAULT 'pl' CHECK(locale IN ('pl', 'en', 'fr')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
    await (0, fts_1.initFts)();
    await (0, fts_1.rebuildFtsIndex)();
    console.log('✅ Migracja bonusów zakończona (FTS, MFA, preferencje).');
}
migrate().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=migrateBonuses.js.map