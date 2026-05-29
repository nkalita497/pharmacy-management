import { Request, Response, NextFunction } from 'express';
export declare const requireRole: (allowedRoles: ("admin" | "pharmacist" | "cashier")[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=roleMiddleware.d.ts.map