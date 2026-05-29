import request from 'supertest';
import { createApp } from '../src/app';

describe('Health API', () => {
  const app = createApp();

  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/running/i);
  });
});
