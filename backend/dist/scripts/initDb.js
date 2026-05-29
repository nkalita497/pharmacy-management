"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const database_1 = require("../config/database");
const schemaPath = path_1.default.join(__dirname, '../../../database/schema.sql');
const dbPath = path_1.default.join(__dirname, '../../../database/pharmacy.db');
function openDb() {
    return new sqlite3_1.default.Database(dbPath);
}
function exec(db, sql) {
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => (err ? reject(err) : resolve()));
    });
}
function closeDb(db) {
    return new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
    });
}
async function init() {
    const dbDir = path_1.default.dirname(dbPath);
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    if (fs_1.default.existsSync(dbPath)) {
        fs_1.default.unlinkSync(dbPath);
        console.log('Usunięto starą bazę:', dbPath);
    }
    const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
    const db = openDb();
    try {
        await exec(db, schema);
        console.log('Schemat apteki utworzony.');
        await closeDb(db);
        await (0, database_1.reopenDatabase)();
        const { seedPharmacyData } = await Promise.resolve().then(() => __importStar(require('../utils/pharmacySeed')));
        await seedPharmacyData();
        console.log('Dane apteczne załadowane (admin/admin123, pharmacist1/pass123).');
    }
    catch (e) {
        await closeDb(db).catch(() => undefined);
        throw e;
    }
}
init()
    .then(() => process.exit(0))
    .catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=initDb.js.map