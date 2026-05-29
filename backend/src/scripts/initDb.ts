import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { reopenDatabase } from '../config/database';

const schemaPath = path.join(__dirname, '../../../database/schema.sql');
const dbPath = path.join(__dirname, '../../../database/pharmacy.db');

function openDb(): sqlite3.Database {
  return new sqlite3.Database(dbPath);
}

function exec(db: sqlite3.Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

function closeDb(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

async function init(): Promise<void> {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Usunięto starą bazę:', dbPath);
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');
  const db = openDb();

  try {
    await exec(db, schema);
    console.log('Schemat apteki utworzony.');
    await closeDb(db);

    await reopenDatabase();
    const { seedPharmacyData } = await import('../utils/pharmacySeed');
    await seedPharmacyData();
    console.log('Dane apteczne załadowane (admin/admin123, pharmacist1/pass123).');
  } catch (e) {
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
