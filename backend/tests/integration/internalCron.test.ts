import request from 'supertest';
import app from '../../src/index';

describe('POST /api/internal/cron/*', () => {
  const endpoints = ['/api/internal/cron/daily-report', '/api/internal/cron/weekly-stats', '/api/internal/cron/cleanup-tokens'];

  it.each(endpoints)('rejects %s with no secret', async (path) => {
    const res = await request(app).post(path);
    expect(res.status).toBe(401);
  });

  it.each(endpoints)('rejects %s with the wrong secret', async (path) => {
    const res = await request(app).post(path).set('X-Cron-Secret', 'wrong-secret');
    expect(res.status).toBe(401);
  });

  it.each(endpoints)('runs %s and returns 204 with the right secret', async (path) => {
    const res = await request(app).post(path).set('X-Cron-Secret', process.env.CRON_SECRET!);
    expect(res.status).toBe(204);
  });
});
