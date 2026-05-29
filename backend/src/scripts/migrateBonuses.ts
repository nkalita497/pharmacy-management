import db from '../config/database';
import { initFts, rebuildFtsIndex } from '../utils/fts';

function run(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => (err ? reject(err) : resolve()));
  });
}

async function migrate(): Promise<void> {
  const alters = [
    'ALTER TABLE users ADD COLUMN email TEXT',
    'ALTER TABLE users ADD COLUMN mfa_secret TEXT',
    'ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0'
  ];

  for (const sql of alters) {
    try {
      await run(sql);
      console.log('OK:', sql.slice(0, 50));
    } catch (e: any) {
      if (e.message?.includes('duplicate column')) {
        console.log('Skip (exists):', sql.slice(0, 40));
      } else {
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

  await initFts();
  await rebuildFtsIndex();
  console.log('✅ Migracja bonusów zakończona (FTS, MFA, preferencje).');
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
