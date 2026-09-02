import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

describe('sets / PR detection', () => {
  let user: TestUser;
  let workoutId: string;
  let exerciseId: string;

  beforeEach(async () => {
    user = await createTestUser('sets');
    const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    workoutId = workout.body.id;
    const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'PR Bench', category: 'compound' });
    exerciseId = exercise.body.id;
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  const logSet = (overrides: Partial<{ weight: number; reps: number; is_warmup: boolean; set_number: number }>) =>
    request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({
        workout_id: workoutId,
        exercise_id: exerciseId,
        set_number: overrides.set_number ?? 1,
        weight: overrides.weight ?? 60,
        reps: overrides.reps ?? 5,
        is_warmup: overrides.is_warmup ?? false,
      });

  it('accepts 0 for both weight and reps — a failed rep or bodyweight-only work is a real set', async () => {
    const res = await logSet({ set_number: 1, weight: 0, reps: 0 });
    expect(res.status).toBe(201);
    expect(res.body.weight).toBe(0);
    expect(res.body.reps).toBe(0);
  });

  it('still rejects a negative weight or reps', async () => {
    const res = await logSet({ set_number: 1, weight: -10, reps: 5 });
    expect(res.status).toBe(400);
  });

  it('the first set logged for an exercise is a PR', async () => {
    const res = await logSet({ set_number: 1, weight: 60, reps: 5 });
    expect(res.status).toBe(201);
    expect(res.body.is_pr).toBe(true);
  });

  it('a heavier set beats the prior PR', async () => {
    await logSet({ set_number: 1, weight: 60, reps: 5 });
    const res = await logSet({ set_number: 2, weight: 70, reps: 5 });
    expect(res.body.is_pr).toBe(true);
  });

  it('a lighter set is NOT a PR', async () => {
    await logSet({ set_number: 1, weight: 70, reps: 5 });
    const res = await logSet({ set_number: 2, weight: 60, reps: 5 });
    expect(res.body.is_pr).toBe(false);
  });

  it('same weight with more reps IS a PR', async () => {
    await logSet({ set_number: 1, weight: 60, reps: 5 });
    const res = await logSet({ set_number: 2, weight: 60, reps: 8 });
    expect(res.body.is_pr).toBe(true);
  });

  it('same weight with fewer reps is NOT a PR', async () => {
    await logSet({ set_number: 1, weight: 60, reps: 8 });
    const res = await logSet({ set_number: 2, weight: 60, reps: 5 });
    expect(res.body.is_pr).toBe(false);
  });

  it('a warmup set is never a PR, even if it would otherwise be one', async () => {
    const res = await logSet({ set_number: 1, weight: 100, reps: 5, is_warmup: true });
    expect(res.body.is_pr).toBe(false);
  });

  it('deleting the current PR restores the previous best as the PR', async () => {
    const first = await logSet({ set_number: 1, weight: 60, reps: 5 }); // PR
    const second = await logSet({ set_number: 2, weight: 70, reps: 5 }); // new PR, beats first

    await request(app).delete(`/api/sets/${second.body.id}`).set(authHeader(user));

    const list = await request(app).get(`/api/sets/workout/${workoutId}`).set(authHeader(user));
    const remaining = list.body.find((s: any) => s.id === first.body.id);
    expect(remaining.is_pr).toBe(true);
  });

  it('editing an earlier set upward can demote a later one that was only a PR relative to it', async () => {
    const first = await logSet({ set_number: 1, weight: 50, reps: 5 });
    const second = await logSet({ set_number: 2, weight: 60, reps: 5 }); // PR over first
    expect(second.body.is_pr).toBe(true);

    // Bump the first set above the second's weight after the fact.
    await request(app).put(`/api/sets/${first.body.id}`).set(authHeader(user)).send({ weight: 80, reps: 5 });

    const list = await request(app).get(`/api/sets/workout/${workoutId}`).set(authHeader(user));
    const secondAfter = list.body.find((s: any) => s.id === second.body.id);
    expect(secondAfter.is_pr).toBe(false);
  });
});

describe('sets / cardio', () => {
  let user: TestUser;
  let workoutId: string;
  let cardioExerciseId: string;
  let strengthExerciseId: string;

  beforeEach(async () => {
    user = await createTestUser('cardio');
    const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    workoutId = workout.body.id;
    const cardio = await request(app)
      .post('/api/exercises')
      .set(authHeader(user))
      .send({ name: 'Test Run', category: 'cardio' });
    cardioExerciseId = cardio.body.id;
    const strength = await request(app)
      .post('/api/exercises')
      .set(authHeader(user))
      .send({ name: 'Cardio Test Bench', category: 'compound' });
    strengthExerciseId = strength.body.id;
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  const logCardioSet = (overrides: Partial<{ duration_seconds: number; distance_km: number; set_number: number }>) =>
    request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({
        workout_id: workoutId,
        exercise_id: cardioExerciseId,
        set_number: overrides.set_number ?? 1,
        duration_seconds: overrides.duration_seconds ?? 1800,
        distance_km: overrides.distance_km ?? 5,
      });

  it('logs a cardio set with duration/distance instead of weight/reps', async () => {
    const res = await logCardioSet({});
    expect(res.status).toBe(201);
    expect(res.body.duration_seconds).toBe(1800);
    expect(res.body.distance_km).toBe(5);
    expect(res.body.weight).toBeFalsy();
    expect(res.body.reps).toBeFalsy();
  });

  it('rejects a cardio set missing duration or distance', async () => {
    const res = await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: workoutId, exercise_id: cardioExerciseId, set_number: 1, distance_km: 5 });
    expect(res.status).toBe(400);
  });

  it('rejects a strength set missing weight or reps', async () => {
    const res = await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: workoutId, exercise_id: strengthExerciseId, set_number: 1, reps: 5 });
    expect(res.status).toBe(400);
  });

  it('a longer run beats the prior cardio PR', async () => {
    await logCardioSet({ set_number: 1, distance_km: 5, duration_seconds: 1800 });
    const res = await logCardioSet({ set_number: 2, distance_km: 8, duration_seconds: 2700 });
    expect(res.body.is_pr).toBe(true);
  });

  it('a shorter run is NOT a cardio PR', async () => {
    await logCardioSet({ set_number: 1, distance_km: 8, duration_seconds: 2700 });
    const res = await logCardioSet({ set_number: 2, distance_km: 5, duration_seconds: 1800 });
    expect(res.body.is_pr).toBe(false);
  });

  it('same distance in less time IS a cardio PR (faster pace)', async () => {
    await logCardioSet({ set_number: 1, distance_km: 5, duration_seconds: 1800 });
    const res = await logCardioSet({ set_number: 2, distance_km: 5, duration_seconds: 1500 });
    expect(res.body.is_pr).toBe(true);
  });
});
