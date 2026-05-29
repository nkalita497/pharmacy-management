import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  res.status(401).json({ error: 'Brak autoryzacji. Zaloguj się najpierw.' });
};
