import db from '../config/database';
import bcrypt from 'bcrypt';

const USERS = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'pharmacist1', password: 'pass123', role: 'pharmacist' },
  { username: 'cashier1', password: 'pass123', role: 'cashier' }
] as const;

async function resetUsers(): Promise<void> {
  for (const user of USERS) {
    const hash = await bcrypt.hash(user.password, 10);
    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM users WHERE username = ?', [user.username], (err) => {
        if (err) return reject(err);
        db.run(
          'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
          [user.username, hash, user.role],
          (err2) => (err2 ? reject(err2) : resolve())
        );
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
