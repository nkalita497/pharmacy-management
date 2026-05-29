"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMfaSecret = generateMfaSecret;
exports.qrDataUrl = qrDataUrl;
exports.verifyTotp = verifyTotp;
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
function generateMfaSecret(username) {
    const secret = (0, otplib_1.generateSecret)();
    const otpauthUrl = (0, otplib_1.generateURI)({
        issuer: 'PharmaCore',
        label: username,
        secret
    });
    return { secret, otpauthUrl };
}
async function qrDataUrl(otpauthUrl) {
    return qrcode_1.default.toDataURL(otpauthUrl);
}
async function verifyTotp(secret, token) {
    const result = await (0, otplib_1.verify)({ secret, token: String(token).replace(/\s/g, '') });
    return result.valid;
}
//# sourceMappingURL=mfa.js.map