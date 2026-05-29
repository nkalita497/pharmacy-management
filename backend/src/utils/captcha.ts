import svgCaptcha from 'svg-captcha';
import { randomUUID } from 'crypto';

interface CaptchaEntry {
  text: string;
  expiresAt: number;
}

const store = new Map<string, CaptchaEntry>();
const TTL_MS = 5 * 60 * 1000;

export function createCaptcha(): { id: string; svg: string } {
  const captcha = svgCaptcha.create({
    size: 5,
    noise: 2,
    color: true,
    background: '#f8fafc',
    width: 180,
    height: 60
  });
  const id = randomUUID();
  store.set(id, {
    text: captcha.text.toLowerCase(),
    expiresAt: Date.now() + TTL_MS
  });
  return { id, svg: captcha.data };
}

export function verifyCaptcha(id: string, answer: string): boolean {
  const entry = store.get(id);
  if (!entry) return false;
  store.delete(id);
  if (Date.now() > entry.expiresAt) return false;
  return entry.text === String(answer || '').trim().toLowerCase();
}

// periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [id, e] of store.entries()) {
    if (e.expiresAt < now) store.delete(id);
  }
}, 60_000).unref();
