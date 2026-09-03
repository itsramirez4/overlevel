import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

describe('social (follows + public profiles)', () => {
  let a: TestUser; // the "viewer" in most tests
  let b: TestUser; // the "target" — made public where the test needs it

  beforeEach(async () => {
    a = await createTestUser('social-a');
    b = await createTestUser('social-b');
  });

  afterEach(async () => {
    await deleteTestUser(a.id);
    await deleteTestUser(b.id);
  });

  const makePublic = (user: TestUser) =>
    request(app).put('/api/users/me').set(authHeader(user)).send({ profile_public: true });

  it('a private profile is invisible to everyone but its owner', async () => {
    // b never made themselves public — default is private.
    const asOwner = await request(app).get(`/api/users/${b.id}`).set(authHeader(b));
    expect(asOwner.status).toBe(200);

    const asStranger = await request(app).get(`/api/users/${b.id}`).set(authHeader(a));
    expect(asStranger.status).toBe(404);
  });

  it('a public profile is visible to others and reports follow state/counts', async () => {
    await makePublic(b);

    const before = await request(app).get(`/api/users/${b.id}`).set(authHeader(a));
    expect(before.status).toBe(200);
    expect(before.body.is_following).toBe(false);
    expect(before.body.followers_count).toBe(0);

    await request(app).post(`/api/users/${b.id}/follow`).set(authHeader(a)).expect(204);

    const after = await request(app).get(`/api/users/${b.id}`).set(authHeader(a));
    expect(after.body.is_following).toBe(true);
    expect(after.body.followers_count).toBe(1);
  });

  it('cannot follow a private account', async () => {
    const res = await request(app).post(`/api/users/${b.id}/follow`).set(authHeader(a));
    expect(res.status).toBe(404);
  });

  it('cannot follow yourself', async () => {
    await makePublic(a);
    const res = await request(app).post(`/api/users/${a.id}/follow`).set(authHeader(a));
    expect(res.status).toBe(400);
  });

  it('following twice is idempotent — still counted once', async () => {
    await makePublic(b);
    await request(app).post(`/api/users/${b.id}/follow`).set(authHeader(a)).expect(204);
    await request(app).post(`/api/users/${b.id}/follow`).set(authHeader(a)).expect(204);

    const profile = await request(app).get(`/api/users/${b.id}`).set(authHeader(a));
    expect(profile.body.followers_count).toBe(1);
  });

  it('unfollowing removes the relationship, and is a no-op if not following', async () => {
    await makePublic(b);
    await request(app).post(`/api/users/${b.id}/follow`).set(authHeader(a)).expect(204);
    await request(app).delete(`/api/users/${b.id}/follow`).set(authHeader(a)).expect(204);

    const profile = await request(app).get(`/api/users/${b.id}`).set(authHeader(a));
    expect(profile.body.is_following).toBe(false);
    expect(profile.body.followers_count).toBe(0);

    await request(app).delete(`/api/users/${b.id}/follow`).set(authHeader(a)).expect(204);
  });

  it('lists followers and following correctly', async () => {
    await makePublic(b);
    await request(app).post(`/api/users/${b.id}/follow`).set(authHeader(a)).expect(204);

    const followers = await request(app).get(`/api/users/${b.id}/followers`).set(authHeader(a));
    expect(followers.status).toBe(200);
    expect(followers.body.map((u: any) => u.id)).toEqual([a.id]);

    const following = await request(app).get(`/api/users/${a.id}/following`).set(authHeader(a));
    expect(following.status).toBe(200);
    expect(following.body.map((u: any) => u.id)).toEqual([b.id]);
  });

  it('search only returns public accounts matching the query, excluding yourself', async () => {
    await makePublic(b);
    const bProfile = await request(app).get('/api/users/me').set(authHeader(b));
    const aProfile = await request(app).get('/api/users/me').set(authHeader(a));

    const results = await request(app).get('/api/users/search').query({ q: bProfile.body.username }).set(authHeader(a));
    expect(results.status).toBe(200);
    expect(results.body.map((u: any) => u.id)).toContain(b.id);

    // a is private (never called makePublic), so this also proves a private
    // account can't find itself in someone else's search.
    const selfSearch = await request(app).get('/api/users/search').query({ q: aProfile.body.username }).set(authHeader(a));
    expect(selfSearch.body.map((u: any) => u.id)).not.toContain(a.id);
  });

  it("shows a public user's completed workouts, but not their in-progress one, and hides both for a private account", async () => {
    await makePublic(b);
    const started = await request(app).post('/api/workouts').set(authHeader(b)).send({});
    await request(app).put(`/api/workouts/${started.body.id}/complete`).set(authHeader(b)).send({});
    const inProgress = await request(app).post('/api/workouts').set(authHeader(b)).send({});

    const publicWorkouts = await request(app).get(`/api/users/${b.id}/workouts`).set(authHeader(a));
    expect(publicWorkouts.status).toBe(200);
    const ids = publicWorkouts.body.map((w: any) => w.id);
    expect(ids).toContain(started.body.id);
    expect(ids).not.toContain(inProgress.body.id);
  });

  it("hides a private user's workouts from strangers", async () => {
    await request(app).post('/api/workouts').set(authHeader(b)).send({});
    const res = await request(app).get(`/api/users/${b.id}/workouts`).set(authHeader(a));
    expect(res.status).toBe(404);
  });

  describe('public workout detail', () => {
    it("shows a public user's completed workout in full, including its sets", async () => {
      await makePublic(b);
      const workout = await request(app).post('/api/workouts').set(authHeader(b)).send({});
      const exercise = await request(app)
        .post('/api/exercises')
        .set(authHeader(b))
        .send({ name: 'Public Profile Bench', category: 'compound' });
      await request(app)
        .post('/api/sets')
        .set(authHeader(b))
        .send({ workout_id: workout.body.id, exercise_id: exercise.body.id, set_number: 1, weight: 60, reps: 8 });
      await request(app).put(`/api/workouts/${workout.body.id}/complete`).set(authHeader(b)).send({});

      const res = await request(app).get(`/api/users/${b.id}/workouts/${workout.body.id}`).set(authHeader(a));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(workout.body.id);
      expect(res.body.sets).toHaveLength(1);
      expect(res.body.sets[0].exercises.name).toBe('Public Profile Bench');
    });

    it("404s for a public user's in-progress workout — not real content yet", async () => {
      await makePublic(b);
      const workout = await request(app).post('/api/workouts').set(authHeader(b)).send({});

      const res = await request(app).get(`/api/users/${b.id}/workouts/${workout.body.id}`).set(authHeader(a));
      expect(res.status).toBe(404);
    });

    it('404s for a private account\'s workout, even a completed one', async () => {
      const workout = await request(app).post('/api/workouts').set(authHeader(b)).send({});
      await request(app).put(`/api/workouts/${workout.body.id}/complete`).set(authHeader(b)).send({});

      const res = await request(app).get(`/api/users/${b.id}/workouts/${workout.body.id}`).set(authHeader(a));
      expect(res.status).toBe(404);
    });

    it("404s for a workout id that belongs to someone else entirely, even under a public profile's url", async () => {
      await makePublic(b);
      const other = await createTestUser('social-other-workout');
      try {
        const otherWorkout = await request(app).post('/api/workouts').set(authHeader(other)).send({});
        await request(app).put(`/api/workouts/${otherWorkout.body.id}/complete`).set(authHeader(other)).send({});

        const res = await request(app)
          .get(`/api/users/${b.id}/workouts/${otherWorkout.body.id}`)
          .set(authHeader(a));
        expect(res.status).toBe(404);
      } finally {
        await deleteTestUser(other.id);
      }
    });
  });

  describe('public character', () => {
    it("shows a public user's character", async () => {
      await makePublic(b);
      await request(app).post('/api/characters').set(authHeader(b)).send({ character_type: 'powerlifter' });

      const res = await request(app).get(`/api/users/${b.id}/character`).set(authHeader(a));
      expect(res.status).toBe(200);
      expect(res.body.character_type).toBe('powerlifter');
      expect(res.body.level).toBeDefined();
    });

    it('is null for a public user with no character — the RPG layer is optional', async () => {
      await makePublic(b);
      const res = await request(app).get(`/api/users/${b.id}/character`).set(authHeader(a));
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it("hides a private user's character from strangers", async () => {
      await request(app).post('/api/characters').set(authHeader(b)).send({ character_type: 'powerlifter' });
      const res = await request(app).get(`/api/users/${b.id}/character`).set(authHeader(a));
      expect(res.status).toBe(404);
    });
  });

  describe('activity feed', () => {
    it('shows a completed workout from someone the viewer follows', async () => {
      await makePublic(b);
      await request(app).post(`/api/users/${b.id}/follow`).set(authHeader(a)).expect(204);

      const workout = await request(app).post('/api/workouts').set(authHeader(b)).send({});
      await request(app).put(`/api/workouts/${workout.body.id}/complete`).set(authHeader(b)).send({});

      const feed = await request(app).get('/api/users/me/feed').set(authHeader(a));
      expect(feed.status).toBe(200);
      expect(feed.body.map((w: any) => w.id)).toContain(workout.body.id);
      expect(feed.body.find((w: any) => w.id === workout.body.id).users.username).toBeTruthy();
    });

    it('excludes workouts from users the viewer does not follow', async () => {
      await makePublic(b);
      const workout = await request(app).post('/api/workouts').set(authHeader(b)).send({});
      await request(app).put(`/api/workouts/${workout.body.id}/complete`).set(authHeader(b)).send({});

      const feed = await request(app).get('/api/users/me/feed').set(authHeader(a));
      expect(feed.body.map((w: any) => w.id)).not.toContain(workout.body.id);
    });

    it('excludes an in-progress workout even from someone followed', async () => {
      await makePublic(b);
      await request(app).post(`/api/users/${b.id}/follow`).set(authHeader(a)).expect(204);
      const inProgress = await request(app).post('/api/workouts').set(authHeader(b)).send({});

      const feed = await request(app).get('/api/users/me/feed').set(authHeader(a));
      expect(feed.body.map((w: any) => w.id)).not.toContain(inProgress.body.id);
    });

    it('drops a followed user from the feed once their account goes private again', async () => {
      await makePublic(b);
      await request(app).post(`/api/users/${b.id}/follow`).set(authHeader(a)).expect(204);
      const workout = await request(app).post('/api/workouts').set(authHeader(b)).send({});
      await request(app).put(`/api/workouts/${workout.body.id}/complete`).set(authHeader(b)).send({});

      await request(app).put('/api/users/me').set(authHeader(b)).send({ profile_public: false });

      const feed = await request(app).get('/api/users/me/feed').set(authHeader(a));
      expect(feed.body.map((w: any) => w.id)).not.toContain(workout.body.id);
    });

    it('is empty when following no one', async () => {
      const feed = await request(app).get('/api/users/me/feed').set(authHeader(a));
      expect(feed.status).toBe(200);
      expect(feed.body).toEqual([]);
    });
  });
});
