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
