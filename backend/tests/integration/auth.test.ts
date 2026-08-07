import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser } from '../helpers/testUser';

describe('auth', () => {
  it('rejects login with wrong credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody-jest@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('rejects a request with no Authorization header on a protected route', async () => {
    const res = await request(app).get('/api/exercises');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app).get('/api/exercises').set('Authorization', 'not-a-bearer-token');
    expect(res.status).toBe(401);
  });

  describe('refresh', () => {
    it('issues a new token pair for a valid refresh token', async () => {
      const user = await createTestUser('refresh-ok');
      try {
        const res = await request(app).post('/api/auth/refresh').send({ refresh_token: user.refreshToken });
        expect(res.status).toBe(200);
        expect(res.body.access_token).toBeTruthy();
        expect(res.body.refresh_token).toBeTruthy();
      } finally {
        await deleteTestUser(user.id);
      }
    });

    it('rejects a refresh token for a user that no longer exists', async () => {
      const user = await createTestUser('refresh-ghost');
      await deleteTestUser(user.id);

      const res = await request(app).post('/api/auth/refresh').send({ refresh_token: user.refreshToken });
      expect(res.status).toBe(401);
    });

    it('rejects an access token used as a refresh token', async () => {
      const user = await createTestUser('refresh-wrong-type');
      try {
        const res = await request(app).post('/api/auth/refresh').send({ refresh_token: user.token });
        expect(res.status).toBe(401);
      } finally {
        await deleteTestUser(user.id);
      }
    });

    it('rejects a refresh token used as an access token on a protected route', async () => {
      const user = await createTestUser('access-wrong-type');
      try {
        const res = await request(app).get('/api/exercises').set('Authorization', `Bearer ${user.refreshToken}`);
        expect(res.status).toBe(401);
      } finally {
        await deleteTestUser(user.id);
      }
    });

    it('rejects a token signed with a different secret', async () => {
      const jwt = require('jsonwebtoken');
      const forged = jwt.sign({ userId: 'forged-user-id', type: 'access' }, 'wrong-secret');
      const res = await request(app).get('/api/exercises').set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(401);
    });

    it('rotates on use: the same refresh token cannot be used twice', async () => {
      const user = await createTestUser('refresh-rotate');
      try {
        const first = await request(app).post('/api/auth/refresh').send({ refresh_token: user.refreshToken });
        expect(first.status).toBe(200);

        const second = await request(app).post('/api/auth/refresh').send({ refresh_token: user.refreshToken });
        expect(second.status).toBe(401);
      } finally {
        await deleteTestUser(user.id);
      }
    });

    it('reuse of an already-rotated token revokes every session for that user', async () => {
      const user = await createTestUser('refresh-reuse');
      try {
        const first = await request(app).post('/api/auth/refresh').send({ refresh_token: user.refreshToken });
        const rotatedToken = first.body.refresh_token;

        // Replay the old (already-rotated) token — this is the theft signal.
        await request(app).post('/api/auth/refresh').send({ refresh_token: user.refreshToken });

        // Even the legitimately-rotated token from the first call should now be dead too.
        const afterReuse = await request(app).post('/api/auth/refresh').send({ refresh_token: rotatedToken });
        expect(afterReuse.status).toBe(401);
      } finally {
        await deleteTestUser(user.id);
      }
    });

    it('logout revokes the refresh token server-side', async () => {
      const user = await createTestUser('logout-revoke');
      try {
        const logoutRes = await request(app).post('/api/auth/logout').send({ refresh_token: user.refreshToken });
        expect(logoutRes.status).toBe(200);

        const refreshAfterLogout = await request(app)
          .post('/api/auth/refresh')
          .send({ refresh_token: user.refreshToken });
        expect(refreshAfterLogout.status).toBe(401);
      } finally {
        await deleteTestUser(user.id);
      }
    });
  });

  describe('malformed request bodies', () => {
    it('returns 400 (not 500) for invalid JSON', async () => {
      const res = await request(app)
        .post('/api/exercises')
        .set('Content-Type', 'application/json')
        .set('Authorization', 'Bearer irrelevant')
        .send('{ not valid json');

      expect(res.status).toBe(400);
    });
  });
});
