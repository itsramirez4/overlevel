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
    it('includes exercises, workouts, character, battles, and per-exercise notes — not just the tracker data', async () => {
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
      await request(app)
        .put(`/api/workout-exercise-notes/${workout.body.id}/${exercise.body.id}`)
        .set(authHeader(user))
        .send({ notes: 'Se sintió pesado' });

      const res = await request(app).get('/api/users/me/export').set(authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.exercises.some((e: any) => e.id === exercise.body.id)).toBe(true);
      expect(res.body.workouts.some((w: any) => w.id === workout.body.id)).toBe(true);
      // Logging a non-warmup set starts a battle for its exercise — the
      // export should carry it, same as the character it leveled up.
      expect(res.body.character).toBeTruthy();
      expect(res.body.character.character_type).toBe('powerlifter');
      expect(res.body.exercise_battles.some((b: any) => b.exercise_id === exercise.body.id)).toBe(true);
      expect(
        res.body.workout_exercise_notes.some(
          (n: any) => n.exercise_id === exercise.body.id && n.notes === 'Se sintió pesado'
        )
      ).toBe(true);
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
      expect(res.body.workout_exercise_notes).toEqual([]);
      expect(res.body.body_measurements).toEqual([]);
    });

    it('includes logged body measurements', async () => {
      await request(app).post('/api/users/me/measurements').set(authHeader(user)).send({ waist_cm: 80 });
      const res = await request(app).get('/api/users/me/export').set(authHeader(user));
      expect(res.status).toBe(200);
      expect(res.body.body_measurements).toHaveLength(1);
      expect(res.body.body_measurements[0].waist_cm).toBe(80);
    });
  });

  describe('body measurements', () => {
    it('logs a measurement with only some fields filled in, and lists it back', async () => {
      const res = await request(app)
        .post('/api/users/me/measurements')
        .set(authHeader(user))
        .send({ waist_cm: 82.5, bicep_cm: 35 });
      expect(res.status).toBe(201);
      expect(res.body.waist_cm).toBe(82.5);
      expect(res.body.bicep_cm).toBe(35);
      expect(res.body.chest_cm).toBeNull();

      const list = await request(app).get('/api/users/me/measurements').set(authHeader(user));
      expect(list.status).toBe(200);
      expect(list.body.map((m: any) => m.id)).toContain(res.body.id);
    });

    it('rejects an entry with no fields at all', async () => {
      const res = await request(app).post('/api/users/me/measurements').set(authHeader(user)).send({});
      expect(res.status).toBe(400);
    });

    it('rejects a non-positive value', async () => {
      const res = await request(app).post('/api/users/me/measurements').set(authHeader(user)).send({ waist_cm: -5 });
      expect(res.status).toBe(400);
    });

    it('rejects a body_fat_pct over 100', async () => {
      const res = await request(app)
        .post('/api/users/me/measurements')
        .set(authHeader(user))
        .send({ body_fat_pct: 150 });
      expect(res.status).toBe(400);
    });

    it('deletes a measurement, and 404s deleting one that is not this user\'s', async () => {
      const other = await createTestUser('measurements-other');
      try {
        const mine = await request(app).post('/api/users/me/measurements').set(authHeader(user)).send({ waist_cm: 80 });
        const theirs = await request(app).post('/api/users/me/measurements').set(authHeader(other)).send({ waist_cm: 90 });

        const stealDelete = await request(app)
          .delete(`/api/users/me/measurements/${theirs.body.id}`)
          .set(authHeader(user));
        expect(stealDelete.status).toBe(404);

        const ownDelete = await request(app)
          .delete(`/api/users/me/measurements/${mine.body.id}`)
          .set(authHeader(user));
        expect(ownDelete.status).toBe(204);

        const list = await request(app).get('/api/users/me/measurements').set(authHeader(user));
        expect(list.body.map((m: any) => m.id)).not.toContain(mine.body.id);
      } finally {
        await deleteTestUser(other.id);
      }
    });
  });
});
