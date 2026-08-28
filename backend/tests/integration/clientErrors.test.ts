import request from 'supertest';
import app from '../../src/index';

describe('POST /api/client-errors', () => {
  it('accepts a report with no auth required and returns 204', async () => {
    const res = await request(app)
      .post('/api/client-errors')
      .send({ message: 'boom', stack: 'Error: boom\n  at Bomb', context: 'jest' });
    expect(res.status).toBe(204);
  });

  it('accepts a report with only the required message field', async () => {
    const res = await request(app).post('/api/client-errors').send({ message: 'boom' });
    expect(res.status).toBe(204);
  });

  it('rejects a report with no message', async () => {
    const res = await request(app).post('/api/client-errors').send({});
    expect(res.status).toBe(400);
  });
});
