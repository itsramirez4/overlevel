import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

describe('users', () => {
  let user: TestUser;

  beforeEach(async () => {
    user = await createTestUser('users');
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  describe('GET /users/me is_admin', () => {
    const originalAdminIds = process.env.ADMIN_USER_IDS;
    afterEach(() => {
      process.env.ADMIN_USER_IDS = originalAdminIds;
    });

    it('is false/absent for a regular account', async () => {
      process.env.ADMIN_USER_IDS = '';
      const res = await request(app).get('/api/users/me').set(authHeader(user));
      expect(res.body.is_admin).toBeFalsy();
    });

    it('is true when the account id is in ADMIN_USER_IDS', async () => {
      process.env.ADMIN_USER_IDS = `some-other-id,${user.id}`;
      const res = await request(app).get('/api/users/me').set(authHeader(user));
      expect(res.body.is_admin).toBe(true);
    });
  });

  describe('GET /users/me/export', () => {
    it('includes exercises, workouts, character, and battles — not just the tracker data', async () => {
      await request(app).post('/api/characters').set(authHeader(user)).send({ character_type: 'powerlifter' });

      const exercise = await request(app)
        .post('/api/exercises')
        .set(authHeader(user))
        .send({ name: 'Export Squat', category: 'compound' });
      const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
      await request(app)
        .post('/api/sets')
        .set(authHeader(user))
        .send({ workout_id: workout.body.id, exercise_id: exercise.body.id, set_number: 1, weight: 60, reps: 8 });

      const res = await request(app).get('/api/users/me/export').set(authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.exercises.some((e: any) => e.id === exercise.body.id)).toBe(true);
      expect(res.body.workouts.some((w: any) => w.id === workout.body.id)).toBe(true);
      // Logging a non-warmup set starts a battle for its exercise — the
      // export should carry it, same as the character it leveled up.
      expect(res.body.character).toBeTruthy();
      expect(res.body.character.character_type).toBe('powerlifter');
      expect(res.body.exercise_battles.some((b: any) => b.exercise_id === exercise.body.id)).toBe(true);
    });

    it('includes an exercise created by someone else, if this user\'s workout/routine references it', async () => {
      const other = await createTestUser('users-export-other');
      try {
        const sharedExercise = await request(app)
          .post('/api/exercises')
          .set(authHeader(other))
          .send({ name: 'Export Shared Exercise', category: 'compound' });

        const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
        await request(app)
          .post('/api/sets')
          .set(authHeader(user))
          .send({ workout_id: workout.body.id, exercise_id: sharedExercise.body.id, set_number: 1, weight: 40, reps: 10 });

        const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Export Routine' });
        await request(app)
          .post(`/api/routines/${routine.body.id}/exercises`)
          .set(authHeader(user))
          .send({ exercise_id: sharedExercise.body.id, order_num: 1 });

        const res = await request(app).get('/api/users/me/export').set(authHeader(user));
        expect(res.status).toBe(200);
        // Not in this user's own exercises table rows (someone else owns
        // it), but must still appear so sets/routine_exercises resolve.
        expect(res.body.exercises.filter((e: any) => e.id === sharedExercise.body.id).length).toBe(1);
      } finally {
        await deleteTestUser(other.id);
      }
    });

    it('has a null character for a user who never created one — the RPG layer is optional', async () => {
      const res = await request(app).get('/api/users/me/export').set(authHeader(user));
      expect(res.status).toBe(200);
      expect(res.body.character).toBeNull();
      expect(res.body.exercise_battles).toEqual([]);
    });
  });
});
