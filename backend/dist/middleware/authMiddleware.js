"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
        return;
    }
    res.status(401).json({ error: 'Brak autoryzacji. Zaloguj się najpierw.' });
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=authMiddleware.js.map