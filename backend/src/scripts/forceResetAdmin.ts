import db from '../config/database';
import bcrypt from 'bcrypt';

async function forceReset() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);

  console.log('Generuję hash dla admin123:', hash);

  // Najpierw usuwamy, żeby nie było konfliktów
  db.run('DELETE FROM users WHERE username = ?', ['admin'], (err) => {
    if (err) return console.error('Błąd usuwania:', err);

    // Teraz dodajemy świeżego admina
    db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['admin', hash, 'admin'],
      (err) => {
        if (err) console.error('Błąd dodawania:', err);
        else console.log('✅ Admin zresetowany i gotowy do logowania!');
      }
    );
  });
}

forceReset();
