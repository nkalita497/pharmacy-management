import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { authRouter } from './routes/auth';
import medicinesRouter from './routes/medicines';
import suppliersRouter from './routes/suppliers';
import patientsRouter from './routes/patients';
import prescriptionsRouter from './routes/prescriptions';
import salesRouter from './routes/sales';
import dashboardRouter from './routes/dashboard';
import auditRouter from './routes/audit';
import deliveriesRouter from './routes/deliveries';
import searchRouter from './routes/search';
import preferencesRouter from './routes/preferences';
import { setupSwagger } from './swagger';

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_development_only',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8
  }
});

export function createApp(): express.Application {
  const app = express();

  app.use(
    cors({
      origin: ['http://localhost:4200', 'http://localhost:4201'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ message: 'Backend is running!', features: ['fts', 'ws', 'mfa', 'captcha', 'pagination'] });
  });

  app.use('/api/auth', authRouter());
  app.use('/api/medicines', medicinesRouter);
  app.use('/api/suppliers', suppliersRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/prescriptions', prescriptionsRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/deliveries', deliveriesRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/preferences', preferencesRouter);

  setupSwagger(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}

