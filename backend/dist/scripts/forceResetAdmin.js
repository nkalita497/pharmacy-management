"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const bcrypt_1 = __importDefault(require("bcrypt"));
async function forceReset() {
    const password = 'admin123';
    const hash = await bcrypt_1.default.hash(password, 10);
    console.log('Generuję hash dla admin123:', hash);
    // Najpierw usuwamy, żeby nie było konfliktów
    database_1.default.run('DELETE FROM users WHERE username = ?', ['admin'], (err) => {
        if (err)
            return console.error('Błąd usuwania:', err);
        // Teraz dodajemy świeżego admina
        database_1.default.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin'], (err) => {
            if (err)
                console.error('Błąd dodawania:', err);
            else
                console.log('✅ Admin zresetowany i gotowy do logowania!');
        });
    });
}
forceReset();
//# sourceMappingURL=forceResetAdmin.js.map