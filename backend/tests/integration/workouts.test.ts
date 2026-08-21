import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

describe('workouts', () => {
  let user: TestUser;

  beforeEach(async () => {
    user = await createTestUser('workouts');
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  it('starting a routine-based workout embeds the routine name (used to prefill the completion title)', async () => {
    const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Push Day' });
    const started = await request(app)
      .post('/api/workouts')
      .set(authHeader(user))
      .send({ routine_id: routine.body.id });

    expect(started.status).toBe(201);
    expect(started.body.routines?.name).toBe('Push Day');
  });

  it('a freestyle workout (no routine_id) has no routine name embedded', async () => {
    const started = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    expect(started.body.routines).toBeFalsy();
  });

  it('rejects starting a workout against another user\'s routine_id', async () => {
    const victim = await createTestUser('workouts-victim');
    try {
      const routine = await request(app).post('/api/routines').set(authHeader(victim)).send({ name: 'Victim Routine' });
      const res = await request(app).post('/api/workouts').set(authHeader(user)).send({ routine_id: routine.body.id });
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(victim.id);
    }
  });

  it('strips mass-assigned fields (user_id, started_at) on complete instead of applying them', async () => {
    const attacker = await createTestUser('workouts-attacker');
    try {
      const started = await request(app).post('/api/workouts').set(authHeader(user)).send({});
      const workoutId = started.body.id;

      const complete = await request(app)
        .put(`/api/workouts/${workoutId}/complete`)
        .set(authHeader(user))
        .send({ user_id: attacker.id, started_at: '2000-01-01T00:00:00Z', felt_like: 'good' });

      expect(complete.status).toBe(200);
      expect(complete.body.felt_like).toBe('good');

      // The workout must still belong to the original user, not the attacker.
      const stillOwned = await request(app).get(`/api/workouts/${workoutId}`).set(authHeader(user));
      expect(stillOwned.status).toBe(200);

      const attackerCannotSeeIt = await request(app).get(`/api/workouts/${workoutId}`).set(authHeader(attacker));
      expect(attackerCannotSeeIt.status).toBe(404);
    } finally {
      await deleteTestUser(attacker.id);
    }
  });

  it('rejects completing an already-completed workout (no repeat XP)', async () => {
    const started = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    const workoutId = started.body.id;

    const first = await request(app).put(`/api/workouts/${workoutId}/complete`).set(authHeader(user)).send({});
    expect(first.status).toBe(200);

    const second = await request(app).put(`/api/workouts/${workoutId}/complete`).set(authHeader(user)).send({});
    expect(second.status).toBe(400);
  });

  it('allows logging a set on an already-completed workout, but skips battles (no retroactive XP/battle effects)', async () => {
    const started = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    const workoutId = started.body.id;
    await request(app).put(`/api/workouts/${workoutId}/complete`).set(authHeader(user)).send({});

    const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Post-Complete Bench', category: 'compound' });

    const setRes = await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: workoutId, exercise_id: exercise.body.id, set_number: 1, weight: 60, reps: 8 });

    expect(setRes.status).toBe(201);
    expect(setRes.body.battle).toBeUndefined();
    expect(setRes.body.is_pr).toBe(true);
  });

  it('one user cannot view or complete another user\'s workout', async () => {
    const victim = await createTestUser('workouts-view-victim');
    try {
      const started = await request(app).post('/api/workouts').set(authHeader(victim)).send({});
      const workoutId = started.body.id;

      const get = await request(app).get(`/api/workouts/${workoutId}`).set(authHeader(user));
      expect(get.status).toBe(404);

      const complete = await request(app).put(`/api/workouts/${workoutId}/complete`).set(authHeader(user)).send({});
      expect(complete.status).toBe(404);
    } finally {
      await deleteTestUser(victim.id);
    }
  });
});
