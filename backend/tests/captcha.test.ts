import request from 'supertest';
import { createApp } from '../src/app';

describe('Captcha API', () => {
  const app = createApp();

  it('GET /api/auth/captcha returns svg', async () => {
    const res = await request(app).get('/api/auth/captcha');
    expect(res.status).toBe(200);
    expect(res.body.captchaId).toBeDefined();
    expect(res.body.svg).toContain('<svg');
  });
});
