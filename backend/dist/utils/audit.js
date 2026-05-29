"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = void 0;
const database_1 = __importDefault(require("../config/database"));
const logAudit = (userId, action, entityType, entityId, oldValue, newValue) => {
    database_1.default.run('INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)', [userId, action, entityType, entityId || null, oldValue || null, newValue || null], (err) => {
        if (err) {
            console.error('Błąd zapisu audytu:', err.message);
        }
    });
};
exports.logAudit = logAudit;
//# sourceMappingURL=audit.js.map