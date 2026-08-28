import request from 'supertest';
import app from '../../src/index';
import { supabaseAdmin } from '../../src/config/supabase';
import { createTestUser, deleteTestUser } from '../helpers/testUser';

describe('auth', () => {
  it('rejects login with wrong credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody-jest@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  describe('login', () => {
    // Every other test in this file uses createTestUser, which inserts
    // straight into public.users via the admin client — it never exercises
    // the real POST /api/auth/login happy path. That path used to 500 for
    // every brand-new account (the only account-creation flow this app
    // has), because it issued a refresh token — which has a hard FK to
    // users(id) — before the lazy users-row provisioning that same request
    // is supposed to do. Caught by actually running the app, not by any
    // test; this is that missing coverage.
    it("provisions the users profile and logs in successfully on a brand-new account's first login", async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const email = `jest-first-login-${suffix}@example.com`;
      const password = `Test-${suffix}!`;

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      expect(createError).toBeNull();
      const userId = created.user!.id;

      try {
        // No public.users row exists yet — this is the actual first-login case.
        const res = await request(app).post('/api/auth/login').send({ email, password });

        expect(res.status).toBe(200);
        expect(res.body.access_token).toBeTruthy();
        expect(res.body.refresh_token).toBeTruthy();
        expect(res.body.user.id).toBe(userId);
        // Mirrors deriveUsername exactly: strip disallowed chars, then clamp
        // to the same 30-char max updateUserSchema enforces everywhere else.
        expect(res.body.user.username).toBe(`jest-first-login-${suffix}`.replace(/[^a-z0-9_.]/g, '').slice(0, 30));

        const { data: profile } = await supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle();
        expect(profile).toBeTruthy();

        // A second login for the same (now-provisioned) account must also
        // succeed — the profile-already-exists path.
        const second = await request(app).post('/api/auth/login').send({ email, password });
        expect(second.status).toBe(200);
        expect(second.body.user.id).toBe(userId);
      } finally {
        await supabaseAdmin.from('users').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      }
    });
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

  describe('forgot-password', () => {
    // Same response whether or not the email has an account — this endpoint
    // must not let a caller enumerate registered emails by comparing statuses.
    it('accepts a request for a non-existent email and returns 200', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody-jest@example.com' });
      expect(res.status).toBe(200);
    });

    it('rejects a malformed email', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
    });
  });

  describe('reset-password', () => {
    it('rejects an invalid/expired access token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ access_token: 'not-a-real-token', new_password: 'newpassword123' });
      expect(res.status).toBe(401);
    });

    it('rejects a password shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ access_token: 'irrelevant', new_password: '123' });
      expect(res.status).toBe(400);
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
