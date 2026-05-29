"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.reopenDatabase = reopenDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dbPath = path_1.default.join(__dirname, '../../../database/pharmacy.db');
const dbDir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
let db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err) {
        console.error('Błąd SQLite:', err.message);
    }
});
function getDb() {
    return db;
}
function reopenDatabase() {
    return new Promise((resolve, reject) => {
        db.close((closeErr) => {
            if (closeErr)
                return reject(closeErr);
            db = new sqlite3_1.default.Database(dbPath, (openErr) => (openErr ? reject(openErr) : resolve()));
        });
    });
}
const dbProxy = new Proxy({}, {
    get(_target, prop) {
        const value = getDb()[prop];
        return typeof value === 'function' ? value.bind(getDb()) : value;
    }
});
exports.default = dbProxy;
//# sourceMappingURL=database.js.map