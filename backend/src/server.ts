import http from 'http';
import dotenv from 'dotenv';
import { createApp, sessionMiddleware } from './app';
import { initWebSocket } from './utils/websocket';
import { initFts, rebuildFtsIndex } from './utils/fts';
import { getDb } from './config/database';

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = createApp();
const httpServer = http.createServer(app);

initWebSocket(httpServer, sessionMiddleware);

function logDatabaseStatus(): Promise<void> {
  return new Promise((resolve) => {
    getDb().get('SELECT COUNT(*) as c FROM users', [], (err, row: { c: number }) => {
      if (err) {
        console.warn('Baza danych: problem ze schematem. Uruchom: npm run init-db (w folderze backend)');
      } else if (!row?.c) {
        console.warn('Baza danych jest pusta. Uruchom: npm run init-db');
      } else {
        getDb().get(
          'SELECT (SELECT COUNT(*) FROM patients) as patients, (SELECT COUNT(*) FROM medicines) as medicines',
          [],
          (_e2, counts: { patients: number; medicines: number }) => {
            console.log(
              `Baza OK — użytkownicy: ${row.c}, pacjenci: ${counts?.patients ?? 0}, leki: ${counts?.medicines ?? 0}`
            );
            console.log('Logowanie: admin / admin123');
            resolve();
          }
        );
        return;
      }
      resolve();
    });
  });
}

async function bootstrap(): Promise<void> {
  await logDatabaseStatus();

  try {
    await initFts();
    await rebuildFtsIndex();
  } catch {
    console.warn('FTS: uruchom npm run migrate-bonuses w folderze backend');
  }

  httpServer.listen(PORT, () => {
    console.log(`API + WebSocket: http://localhost:${PORT}`);
    console.log(`Captcha: ${process.env.CAPTCHA_ENABLED === 'true' ? 'włączona' : 'wyłączona (dev)'}`);
  });
}

bootstrap();
