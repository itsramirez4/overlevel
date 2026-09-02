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

  it('starting a workout while one is already incomplete returns the existing one instead of creating a second', async () => {
    const first = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    expect(first.status).toBe(201);
    expect(first.body.resumed).toBeFalsy();

    const second = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.resumed).toBe(true);

    const list = await request(app).get('/api/workouts').set(authHeader(user));
    expect(list.body).toHaveLength(1);
  });

  it('resuming an incomplete workout embeds its already-logged sets (for rebuilding the session exercise list)', async () => {
    const started = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Resume Test Row', category: 'compound' });
    await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: started.body.id, exercise_id: exercise.body.id, set_number: 1, weight: 40, reps: 10 });

    const resumed = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    expect(resumed.body.resumed).toBe(true);
    expect(resumed.body.sets).toHaveLength(1);
    expect(resumed.body.sets[0].exercises.name).toBe('Resume Test Row');
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

  it('corrects the date of a completed workout (logging it after the fact)', async () => {
    const started = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    const workoutId = started.body.id;
    await request(app).put(`/api/workouts/${workoutId}/complete`).set(authHeader(user)).send({});

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).put(`/api/workouts/${workoutId}`).set(authHeader(user)).send({ started_at: yesterday });

    expect(res.status).toBe(200);
    // Postgres round-trips the timestamp as "+00:00" instead of "Z" — same
    // instant, different string, so compare parsed values.
    expect(new Date(res.body.started_at).getTime()).toBe(new Date(yesterday).getTime());
  });

  it('rejects a future started_at', async () => {
    const started = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    const workoutId = started.body.id;

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).put(`/api/workouts/${workoutId}`).set(authHeader(user)).send({ started_at: tomorrow });

    expect(res.status).toBe(400);
  });

  it('rejects a started_at set after the workout was already completed', async () => {
    const started = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    const workoutId = started.body.id;
    const completed = await request(app).put(`/api/workouts/${workoutId}/complete`).set(authHeader(user)).send({});

    const afterCompletion = new Date(new Date(completed.body.completed_at).getTime() + 60_000).toISOString();
    const res = await request(app).put(`/api/workouts/${workoutId}`).set(authHeader(user)).send({ started_at: afterCompletion });

    expect(res.status).toBe(400);
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
