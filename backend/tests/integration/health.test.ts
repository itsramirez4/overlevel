import request from 'supertest';
import app from '../../src/index';

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /privacy', () => {
  it('serves the privacy policy as HTML', async () => {
    const res = await request(app).get('/privacy');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Política de privacidad');
  });
});
