"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMiddleware = void 0;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const auth_1 = require("./routes/auth");
const medicines_1 = __importDefault(require("./routes/medicines"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const patients_1 = __importDefault(require("./routes/patients"));
const prescriptions_1 = __importDefault(require("./routes/prescriptions"));
const sales_1 = __importDefault(require("./routes/sales"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const audit_1 = __importDefault(require("./routes/audit"));
const deliveries_1 = __importDefault(require("./routes/deliveries"));
const search_1 = __importDefault(require("./routes/search"));
const preferences_1 = __importDefault(require("./routes/preferences"));
const swagger_1 = require("./swagger");
exports.sessionMiddleware = (0, express_session_1.default)({
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
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: ['http://localhost:4200', 'http://localhost:4201'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express_1.default.json());
    app.use(exports.sessionMiddleware);
    app.use(passport_1.default.initialize());
    app.use(passport_1.default.session());
    app.get('/api/health', (_req, res) => {
        res.json({ message: 'Backend is running!', features: ['fts', 'ws', 'mfa', 'captcha', 'pagination'] });
    });
    app.use('/api/auth', (0, auth_1.authRouter)());
    app.use('/api/medicines', medicines_1.default);
    app.use('/api/suppliers', suppliers_1.default);
    app.use('/api/patients', patients_1.default);
    app.use('/api/prescriptions', prescriptions_1.default);
    app.use('/api/sales', sales_1.default);
    app.use('/api/dashboard', dashboard_1.default);
    app.use('/api/audit', audit_1.default);
    app.use('/api/deliveries', deliveries_1.default);
    app.use('/api/search', search_1.default);
    app.use('/api/preferences', preferences_1.default);
    (0, swagger_1.setupSwagger)(app);
    app.use((err, _req, res, _next) => {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Internal Server Error' });
    });
    return app;
}
//# sourceMappingURL=app.js.map