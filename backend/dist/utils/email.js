"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationEmail = sendNotificationEmail;
exports.buildAlertEmail = buildAlertEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
});
async function sendNotificationEmail(to, subject, html) {
    if (!to)
        return { sent: false, error: 'Brak adresu email' };
    try {
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || 'pharmacore@localhost',
            to,
            subject,
            html
        });
        const preview = nodemailer_1.default.getTestMessageUrl(info);
        return { sent: true, previewUrl: preview || undefined };
    }
    catch (err) {
        console.warn('Email send failed:', err.message);
        return { sent: false, error: err.message };
    }
}
function buildAlertEmail(type, details) {
    return `
    <div style="font-family:monospace;border:4px solid #0f172a;padding:16px;">
      <h2 style="color:#10b981;">PHARMA CORE — ${type}</h2>
      <p>${details}</p>
      <p style="font-size:12px;opacity:0.6;">Wiadomość automatyczna z systemu apteki.</p>
    </div>`;
}
//# sourceMappingURL=email.js.map