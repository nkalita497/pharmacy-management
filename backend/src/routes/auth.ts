import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import createError from 'http-errors';
import bcrypt from 'bcrypt';
import db from '../config/database';
import { requireAuth } from '../middleware/authMiddleware';
import { createCaptcha, verifyCaptcha } from '../utils/captcha';
import { generateMfaSecret, qrDataUrl, verifyTotp } from '../utils/mfa';

/** Domyślnie włączona; wyłącz jawnie: CAPTCHA_ENABLED=false */
const CAPTCHA_ON = process.env.CAPTCHA_ENABLED !== 'false';

passport.use(
  new LocalStrategy((username, password, done) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user: any) => {
      if (err) return done(err);
      if (!user) return done(null, false, { message: 'Nieprawidłowy login' });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: 'Nieprawidłowe hasło' });
      return done(null, {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        mfa_enabled: !!user.mfa_enabled
      });
    });
  })
);

passport.serializeUser((user: any, done) => done(null, user.id));

passport.deserializeUser((id: number, done) => {
  db.get(
    'SELECT id, username, role, email, mfa_enabled FROM users WHERE id = ?',
    [id],
    (err: any, user: any) => {
      if (err) return done(err);
      if (!user) return done(null, false);
      done(null, { ...user, mfa_enabled: !!user.mfa_enabled });
    }
  );
});

export function authRouter(): Router {
  const router = Router();

  /**
   * @swagger
   * tags:
   *   name: Autoryzacja
   *   description: Logowanie, sesje, uwierzytelnianie dwuetapowe (MFA) oraz Captcha
   *
   * /api/auth/captcha:
   *   get:
   *     summary: Generuje obrazek Captcha
   *     description: Zwraca identyfikator oraz kod SVG obrazka, który służy do weryfikacji przy logowaniu.
   *     tags: [Autoryzacja]
   *     responses:
   *       200:
   *         description: Sukces. Zwraca SVG z captchą.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 captchaId:
   *                   type: string
   *                   example: "a1b2c3d4"
   *                 svg:
   *                   type: string
   *                   example: "<svg>...</svg>"
   *                 enabled:
   *                   type: boolean
   *                   example: true
   */
  router.get('/captcha', (_req: Request, res: Response) => {
    const { id, svg } = createCaptcha();
    res.json({ captchaId: id, svg, enabled: CAPTCHA_ON });
  });

  /**
   * @swagger
   * /api/auth:
   * post:
   * summary: Logowanie użytkownika do systemu
   * description: Weryfikuje nazwę użytkownika, hasło oraz kod Captcha. Jeśli użytkownik ma włączone MFA, zwraca flagę `requiresMfa: true` i oczekuje na weryfikację kodu MFA w osobnym endpoincie.
   * tags: [Autoryzacja]
   * requestBody:
   * required: true
   * content:
   * application/json:
   * schema:
   * type: object
   * required:
   * - username
   * - password
   * properties:
   * username:
   * type: string
   * example: "admin"
   * password:
   * type: string
   * example: "secret123"
   * captchaId:
   * type: string
   * description: Identyfikator pobrany z endpointu /captcha
   * captchaText:
   * type: string
   * description: Znaki przepisane z obrazka
   * responses:
   * 200:
   * description: Zalogowano pomyślnie LUB wymagana dalsza autoryzacja MFA.
   * content:
   * application/json:
   * schema:
   * type: object
   * properties:
   * id:
   * type: integer
   * username:
   * type: string
   * role:
   * type: string
   * email:
   * type: string
   * requiresMfa:
   * type: boolean
   * description: Zwracane jako `true`, gdy logowanie czeka na kod MFA
   * 400:
   * description: Nieprawidłowy kod Captcha
   * 401:
   * description: Nieprawidłowe dane logowania (login lub hasło)
   */
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    if (CAPTCHA_ON) {
      const { captchaId, captchaText } = req.body;
      if (!verifyCaptcha(captchaId, captchaText)) {
        return next(createError(400, 'Nieprawidłowy kod Captcha'));
      }
    }

    passport.authenticate('local', (err: any, user: any, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) return next(createError(401, info?.message ?? 'Nieprawidłowe dane logowania'));

      if (user.mfa_enabled) {
        (req.session as any).pendingMfaUserId = user.id;
        res.json({ requiresMfa: true, username: user.username });
        return;
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.json({ id: user.id, username: user.username, role: user.role, email: user.email });
      });
    })(req, res, next);
  });

  /**
   * @swagger
   * /api/auth/mfa/verify:
   * post:
   * summary: Weryfikacja kodu MFA podczas logowania
   * description: Drugi krok logowania dla użytkowników z aktywnym uwierzytelnianiem dwuetapowym.
   * tags: [Autoryzacja]
   * requestBody:
   * required: true
   * content:
   * application/json:
   * schema:
   * type: object
   * required:
   * - code
   * properties:
   * code:
   * type: string
   * description: 6-cyfrowy kod z aplikacji Google Authenticator
   * example: "123456"
   * responses:
   * 200:
   * description: Kod prawidłowy, logowanie zakończone sukcesem.
   * 400:
   * description: Brak aktywnego wyzwania MFA (np. użytkownik nie przeszedł pierwszego etapu logowania).
   * 401:
   * description: Nieprawidłowy kod MFA.
   */
  router.post('/mfa/verify', (req: Request, res: Response, next: NextFunction) => {
    const pendingId = (req.session as any).pendingMfaUserId;
    const { code } = req.body;
    if (!pendingId) return next(createError(400, 'Brak aktywnego wyzwania MFA'));

    db.get('SELECT * FROM users WHERE id = ?', [pendingId], (err, user: any) => {
      if (err) return next(err);
      if (!user?.mfa_secret) return next(createError(401, 'MFA nie skonfigurowane'));
      verifyTotp(user.mfa_secret, code).then((valid) => {
        if (!valid) return next(createError(401, 'Nieprawidłowy kod MFA'));
        delete (req.session as any).pendingMfaUserId;
        const sessionUser = {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          mfa_enabled: true
        };
        req.logIn(sessionUser, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email
          });
        });
      }).catch(next);
    });
  });

  /**
   * @swagger
   * /api/auth/mfa/setup:
   * post:
   * summary: Rozpoczęcie konfiguracji MFA
   * description: Generuje nowy sekret MFA i kod QR dla autoryzowanego użytkownika. Zwraca dane, które trzeba zweryfikować w endpoincie `/mfa/enable`.
   * tags: [Autoryzacja]
   * responses:
   * 200:
   * description: Zwrócono parametry dla aplikacji Authenticator.
   * content:
   * application/json:
   * schema:
   * type: object
   * properties:
   * secret:
   * type: string
   * otpauthUrl:
   * type: string
   * qrCode:
   * type: string
   * description: Obrazek QR zakodowany w Base64 (Data URL)
   * 401:
   * description: Brak autoryzacji (niezalogowany).
   */
  router.post('/mfa/setup', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const { secret, otpauthUrl } = generateMfaSecret(user.username);
      const qrCode = await qrDataUrl(otpauthUrl);
      (req.session as any).pendingMfaSecret = secret;
      res.json({ secret, otpauthUrl, qrCode });
    } catch (e) {
      next(e);
    }
  });

  /**
   * @swagger
   * /api/auth/mfa/enable:
   * post:
   * summary: Aktywacja MFA
   * description: Aktywuje MFA po wprowadzeniu pierwszego prawidłowego kodu weryfikującego konfigurację.
   * tags: [Autoryzacja]
   * requestBody:
   * required: true
   * content:
   * application/json:
   * schema:
   * type: object
   * required:
   * - code
   * properties:
   * code:
   * type: string
   * example: "123456"
   * responses:
   * 200:
   * description: MFA pomyślnie włączone.
   * 400:
   * description: Nieprawidłowy kod weryfikacyjny lub brak wygenerowanego sekretu MFA.
   * 401:
   * description: Brak autoryzacji.
   */
  router.post('/mfa/enable', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    const secret = (req.session as any).pendingMfaSecret;
    const { code } = req.body;
    if (!secret) return next(createError(400, 'Najpierw wygeneruj sekret MFA'));
    verifyTotp(secret, code).then((valid) => {
      if (!valid) return next(createError(400, 'Nieprawidłowy kod — MFA nie aktywowane'));
      db.run(
        'UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE id = ?',
        [secret, user.id],
        (err) => {
          if (err) return next(err);
          delete (req.session as any).pendingMfaSecret;
          res.json({ message: 'MFA włączone' });
        }
      );
    }).catch(next);
  });

  /**
   * @swagger
   * /api/auth/mfa/disable:
   * post:
   * summary: Wyłączenie MFA
   * description: Deaktywuje uwierzytelnianie dwuetapowe dla zalogowanego użytkownika. Wymaga weryfikacji hasłem.
   * tags: [Autoryzacja]
   * requestBody:
   * required: true
   * content:
   * application/json:
   * schema:
   * type: object
   * required:
   * - password
   * properties:
   * password:
   * type: string
   * description: Hasło logowania użytkownika
   * example: "secret123"
   * responses:
   * 200:
   * description: MFA wyłączone pomyślnie.
   * 401:
   * description: Nieprawidłowe hasło lub brak autoryzacji.
   */
  router.post('/mfa/disable', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    const { password } = req.body;
    db.get('SELECT password FROM users WHERE id = ?', [user.id], async (err, row: any) => {
      if (err) return next(err);
      const ok = await bcrypt.compare(password, row.password);
      if (!ok) return next(createError(401, 'Nieprawidłowe hasło'));
      db.run('UPDATE users SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?', [user.id], (e2) => {
        if (e2) return next(e2);
        res.json({ message: 'MFA wyłączone' });
      });
    });
  });

  /**
   * @swagger
   * /api/auth:
   * delete:
   * summary: Wylogowanie
   * description: Niszczy sesję po stronie serwera i usuwa przypisane ciasteczka autoryzacyjne.
   * tags: [Autoryzacja]
   * responses:
   * 200:
   * description: Pomyślnie wylogowano.
   * content:
   * application/json:
   * schema:
   * type: object
   * properties:
   * message:
   * type: string
   * example: "Wylogowano z systemu apteki"
   */
  router.delete('/', (req: Request, res: Response, next: NextFunction) => {
    const destroySession = () => {
      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr);
        res.clearCookie('connect.sid');
        res.json({ message: 'Wylogowano z systemu apteki' });
      });
    };

    if (req.isAuthenticated()) {
      req.logout((err) => {
        if (err) return next(err);
        destroySession();
      });
      return;
    }

    destroySession();
  });

  /**
   * @swagger
   * /api/auth:
   * get:
   * summary: Odczyt danych sesji
   * description: Weryfikuje aktywną sesję i pobiera dane obecnie zalogowanego użytkownika. Zwraca `null`, jeśli brak sesji.
   * tags: [Autoryzacja]
   * responses:
   * 200:
   * description: Zwraca dane użytkownika lub `null`.
   * content:
   * application/json:
   * schema:
   * $ref: '#/components/schemas/User'
   */
  router.get('/', (req: Request, res: Response) => {
    res.json(req.isAuthenticated() ? req.user : null);
  });

  return router;
}
