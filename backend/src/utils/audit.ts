import db from '../config/database';

export const logAudit = (userId: number, action: string, entityType: string, entityId?: number | string, oldValue?: string, newValue?: string): void => {
  db.run(
    'INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, action, entityType, entityId || null, oldValue || null, newValue || null],
    (err) => {
      if (err) {
        console.error('Błąd zapisu audytu:', err.message);
      }
    }
  );
};
