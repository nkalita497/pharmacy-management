import { Request, Response, NextFunction } from 'express';

export const requireRole = (allowedRoles: ('admin' | 'pharmacist' | 'cashier')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Najpierw sprawdzamy, czy użytkownik w ogóle jest zalogowany
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: 'Brak autoryzacji. Zaloguj się.' });
      return;
    }

    // 2. Wyciągamy rolę zalogowanego użytkownika (zgodnie z bazą danych)
    const userRole = (req.user as any).role;

    // 3. Sprawdzamy, czy jego rola znajduje się na liście dozwolonych ról
    if (allowedRoles.includes(userRole)) {
      return next(); // Rola jest prawidłowa, pozwalamy na wykonanie kodu
    }

    // 4. Jeśli użytkownik jest zalogowany, ale ma zbyt niskie uprawnienia
    res.status(403).json({ error: 'Brak uprawnień do wykonania tej operacji.' });
  };
};
