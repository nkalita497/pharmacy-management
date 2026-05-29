"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCaptcha = createCaptcha;
exports.verifyCaptcha = verifyCaptcha;
const svg_captcha_1 = __importDefault(require("svg-captcha"));
const crypto_1 = require("crypto");
const store = new Map();
const TTL_MS = 5 * 60 * 1000;
function createCaptcha() {
    const captcha = svg_captcha_1.default.create({
        size: 5,
        noise: 2,
        color: true,
        background: '#f8fafc',
        width: 180,
        height: 60
    });
    const id = (0, crypto_1.randomUUID)();
    store.set(id, {
        text: captcha.text.toLowerCase(),
        expiresAt: Date.now() + TTL_MS
    });
    return { id, svg: captcha.data };
}
function verifyCaptcha(id, answer) {
    const entry = store.get(id);
    if (!entry)
        return false;
    store.delete(id);
    if (Date.now() > entry.expiresAt)
        return false;
    return entry.text === String(answer || '').trim().toLowerCase();
}
// periodic cleanup
setInterval(() => {
    const now = Date.now();
    for (const [id, e] of store.entries()) {
        if (e.expiresAt < now)
            store.delete(id);
    }
}, 60000).unref();
//# sourceMappingURL=captcha.js.map