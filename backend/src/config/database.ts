import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, '../../../database/pharmacy.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: sqlite3.Database = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Błąd SQLite:', err.message);
  }
});

export function getDb(): sqlite3.Database {
  return db;
}

export function reopenDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((closeErr) => {
      if (closeErr) return reject(closeErr);
      db = new sqlite3.Database(dbPath, (openErr) => (openErr ? reject(openErr) : resolve()));
    });
  });
}

const dbProxy = new Proxy({} as sqlite3.Database, {
  get(_target, prop) {
    const value = (getDb() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(getDb()) : value;
  }
});

export default dbProxy;
