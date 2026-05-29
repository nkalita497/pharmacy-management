"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const USERS = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'pharmacist1', password: 'pass123', role: 'pharmacist' },
    { username: 'cashier1', password: 'pass123', role: 'cashier' }
];
async function resetUsers() {
    for (const user of USERS) {
        const hash = await bcrypt_1.default.hash(user.password, 10);
        await new Promise((resolve, reject) => {
            database_1.default.run('DELETE FROM users WHERE username = ?', [user.username], (err) => {
                if (err)
                    return reject(err);
                database_1.default.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [user.username, hash, user.role], (err2) => (err2 ? reject(err2) : resolve()));
            });
        });
        console.log(`✅ ${user.username} (${user.role}) — hasło: ${user.password}`);
    }
    console.log('Gotowe. Wszyscy użytkownicy mają hasła zahashowane bcrypt.');
}
resetUsers().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=resetUsers.js.map