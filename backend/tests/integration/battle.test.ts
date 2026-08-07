import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

describe('battle (combat layer)', () => {
  let user: TestUser;
  let workoutId: string;
  let exerciseId: string;

  beforeEach(async () => {
    user = await createTestUser('battle');
    const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    workoutId = workout.body.id;
    const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Battle Bench', category: 'compound' });
    exerciseId = exercise.body.id;
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  it('logging a non-warmup set creates a battle and deals damage', async () => {
    const setRes = await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: workoutId, exercise_id: exerciseId, set_number: 1, weight: 60, reps: 8 });

    expect(setRes.body.battle).toBeTruthy();
    expect(setRes.body.battle.hp_current).toBeLessThan(setRes.body.battle.hp_max);
  });

  it('a warmup set does not create or damage a battle', async () => {
    const setRes = await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: workoutId, exercise_id: exerciseId, set_number: 1, weight: 20, reps: 8, is_warmup: true });

    expect(setRes.body.battle).toBeUndefined();
  });

  it('guarantees the enemy is defeated on workout completion no matter how little damage landed', async () => {
    // A single, deliberately tiny set — nowhere near enough to reach 0 HP on its own.
    await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: workoutId, exercise_id: exerciseId, set_number: 1, weight: 1, reps: 1 });

    await request(app).put(`/api/workouts/${workoutId}/complete`).set(authHeader(user)).send({});

    const battles = await request(app).get(`/api/battles/workout/${workoutId}`).set(authHeader(user));
    expect(battles.body).toHaveLength(1);
    expect(battles.body[0].defeated).toBe(true);
    expect(battles.body[0].hp_current).toBe(0);
  });

  it('defeated is a one-way ratchet: deleting the set afterward does not revive the enemy', async () => {
    const setRes = await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: workoutId, exercise_id: exerciseId, set_number: 1, weight: 1, reps: 1 });

    await request(app).put(`/api/workouts/${workoutId}/complete`).set(authHeader(user)).send({});

    // Sets can't normally be deleted post-completion via the API's own
    // guard, so we're really asserting the DB state itself never regresses —
    // delete directly to simulate any future path that might allow it.
    const { supabaseAdmin } = require('../../src/config/supabase');
    await supabaseAdmin.from('sets').delete().eq('id', setRes.body.id);

    const battles = await request(app).get(`/api/battles/workout/${workoutId}`).set(authHeader(user));
    expect(battles.body[0].defeated).toBe(true);
  });

  it('the bestiary counts a defeated exercise after the workout completes', async () => {
    await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: workoutId, exercise_id: exerciseId, set_number: 1, weight: 60, reps: 8 });
    await request(app).put(`/api/workouts/${workoutId}/complete`).set(authHeader(user)).send({});

    const bestiary = await request(app).get('/api/battles/bestiary').set(authHeader(user));
    const entry = bestiary.body.find((e: any) => e.exercise_id === exerciseId);
    expect(entry).toBeTruthy();
    expect(entry.times_defeated).toBe(1);
  });
});
