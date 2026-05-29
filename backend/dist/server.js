"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("./app");
const websocket_1 = require("./utils/websocket");
const fts_1 = require("./utils/fts");
const database_1 = require("./config/database");
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const app = (0, app_1.createApp)();
const httpServer = http_1.default.createServer(app);
(0, websocket_1.initWebSocket)(httpServer, app_1.sessionMiddleware);
function logDatabaseStatus() {
    return new Promise((resolve) => {
        (0, database_1.getDb)().get('SELECT COUNT(*) as c FROM users', [], (err, row) => {
            if (err) {
                console.warn('Baza danych: problem ze schematem. Uruchom: npm run init-db (w folderze backend)');
            }
            else if (!row?.c) {
                console.warn('Baza danych jest pusta. Uruchom: npm run init-db');
            }
            else {
                (0, database_1.getDb)().get('SELECT (SELECT COUNT(*) FROM patients) as patients, (SELECT COUNT(*) FROM medicines) as medicines', [], (_e2, counts) => {
                    console.log(`Baza OK — użytkownicy: ${row.c}, pacjenci: ${counts?.patients ?? 0}, leki: ${counts?.medicines ?? 0}`);
                    console.log('Logowanie: admin / admin123');
                    resolve();
                });
                return;
            }
            resolve();
        });
    });
}
async function bootstrap() {
    await logDatabaseStatus();
    try {
        await (0, fts_1.initFts)();
        await (0, fts_1.rebuildFtsIndex)();
    }
    catch {
        console.warn('FTS: uruchom npm run migrate-bonuses w folderze backend');
    }
    httpServer.listen(PORT, () => {
        console.log(`API + WebSocket: http://localhost:${PORT}`);
        console.log(`Captcha: ${process.env.CAPTCHA_ENABLED === 'true' ? 'włączona' : 'wyłączona (dev)'}`);
    });
}
bootstrap();
//# sourceMappingURL=server.js.map