"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // 1. Najpierw sprawdzamy, czy użytkownik w ogóle jest zalogowany
        if (!req.isAuthenticated()) {
            res.status(401).json({ error: 'Brak autoryzacji. Zaloguj się.' });
            return;
        }
        // 2. Wyciągamy rolę zalogowanego użytkownika (zgodnie z bazą danych)
        const userRole = req.user.role;
        // 3. Sprawdzamy, czy jego rola znajduje się na liście dozwolonych ról
        if (allowedRoles.includes(userRole)) {
            return next(); // Rola jest prawidłowa, pozwalamy na wykonanie kodu
        }
        // 4. Jeśli użytkownik jest zalogowany, ale ma zbyt niskie uprawnienia
        res.status(403).json({ error: 'Brak uprawnień do wykonania tej operacji.' });
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=roleMiddleware.js.map