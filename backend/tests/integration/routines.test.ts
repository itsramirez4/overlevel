import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

describe('routines', () => {
  let user: TestUser;

  beforeEach(async () => {
    user = await createTestUser('routines');
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  it('creates and lists a routine', async () => {
    const created = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Push Day' });
    expect(created.status).toBe(201);

    const list = await request(app).get('/api/routines').set(authHeader(user));
    expect(list.body.map((r: any) => r.id)).toContain(created.body.id);
  });

  it('one user cannot see, edit, or delete another user\'s routine', async () => {
    const other = await createTestUser('routines-other');
    try {
      const created = await request(app).post('/api/routines').set(authHeader(other)).send({ name: 'Other Routine' });
      const routineId = created.body.id;

      const get = await request(app).get(`/api/routines/${routineId}`).set(authHeader(user));
      expect(get.status).toBe(404);

      const update = await request(app).put(`/api/routines/${routineId}`).set(authHeader(user)).send({ name: 'Hijacked' });
      expect(update.status).toBe(404);

      const del = await request(app).delete(`/api/routines/${routineId}`).set(authHeader(user));
      expect(del.status).toBe(404);
    } finally {
      await deleteTestUser(other.id);
    }
  });

  describe('routine exercise targets', () => {
    it('accepts 0 for target_weight and target_reps — a bodyweight exercise is a real target', async () => {
      const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Bodyweight Day' });
      const exercise = await request(app)
        .post('/api/exercises')
        .set(authHeader(user))
        .send({ name: 'Target Pushup', category: 'compound' });

      const res = await request(app)
        .post(`/api/routines/${routine.body.id}/exercises`)
        .set(authHeader(user))
        .send({ exercise_id: exercise.body.id, order_num: 1, target_sets: 3, target_weight: 0, target_reps: 0 });

      expect(res.status).toBe(201);
      expect(res.body.target_weight).toBe(0);
      expect(res.body.target_reps).toBe(0);
    });

    it('still rejects a negative target_weight/target_reps, and a target_sets of 0', async () => {
      const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Invalid Targets' });
      const exercise = await request(app)
        .post('/api/exercises')
        .set(authHeader(user))
        .send({ name: 'Target Squat', category: 'compound' });

      const negativeWeight = await request(app)
        .post(`/api/routines/${routine.body.id}/exercises`)
        .set(authHeader(user))
        .send({ exercise_id: exercise.body.id, order_num: 1, target_weight: -5 });
      expect(negativeWeight.status).toBe(400);

      const zeroSets = await request(app)
        .post(`/api/routines/${routine.body.id}/exercises`)
        .set(authHeader(user))
        .send({ exercise_id: exercise.body.id, order_num: 1, target_sets: 0 });
      expect(zeroSets.status).toBe(400);
    });
  });

  describe('duplicate', () => {
    it("copies the routine's fields and every exercise slot, leaving the original untouched", async () => {
      const routine = await request(app)
        .post('/api/routines')
        .set(authHeader(user))
        .send({ name: 'Push Day', day_of_week: 'Monday', pattern: 'fixed_day', notes: 'Chest focus' });
      const exercise = await request(app)
        .post('/api/exercises')
        .set(authHeader(user))
        .send({ name: 'Duplicate Bench', category: 'compound' });
      await request(app)
        .post(`/api/routines/${routine.body.id}/exercises`)
        .set(authHeader(user))
        .send({ exercise_id: exercise.body.id, order_num: 1, target_sets: 4, target_weight: 60, target_reps: 8 });

      const duplicate = await request(app).post(`/api/routines/${routine.body.id}/duplicate`).set(authHeader(user));

      expect(duplicate.status).toBe(201);
      expect(duplicate.body.id).not.toBe(routine.body.id);
      expect(duplicate.body.name).toBe('Push Day (copia)');
      expect(duplicate.body.day_of_week).toBe('Monday');
      expect(duplicate.body.pattern).toBe('fixed_day');
      expect(duplicate.body.notes).toBe('Chest focus');
      expect(duplicate.body.routine_exercises).toHaveLength(1);
      expect(duplicate.body.routine_exercises[0]).toMatchObject({
        exercise_id: exercise.body.id,
        order_num: 1,
        target_sets: 4,
        target_weight: 60,
        target_reps: 8,
      });

      // The original is untouched — still just its own one exercise slot.
      const original = await request(app).get(`/api/routines/${routine.body.id}`).set(authHeader(user));
      expect(original.body.routine_exercises).toHaveLength(1);
    });

    it('duplicates a routine with no exercises yet', async () => {
      const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Empty Routine' });
      const duplicate = await request(app).post(`/api/routines/${routine.body.id}/duplicate`).set(authHeader(user));
      expect(duplicate.status).toBe(201);
      expect(duplicate.body.routine_exercises).toEqual([]);
    });

    it("cannot duplicate another user's routine", async () => {
      const other = await createTestUser('routines-duplicate-other');
      try {
        const routine = await request(app).post('/api/routines').set(authHeader(other)).send({ name: 'Other Routine' });
        const res = await request(app).post(`/api/routines/${routine.body.id}/duplicate`).set(authHeader(user));
        expect(res.status).toBe(404);
      } finally {
        await deleteTestUser(other.id);
      }
    });
  });

  describe('trash lifecycle', () => {
    it('moves a deleted routine to the trash instead of destroying it', async () => {
      const created = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Trash Me' });
      const id = created.body.id;

      const del = await request(app).delete(`/api/routines/${id}`).set(authHeader(user));
      expect(del.status).toBe(204);

      const list = await request(app).get('/api/routines').set(authHeader(user));
      expect(list.body.map((r: any) => r.id)).not.toContain(id);

      const trash = await request(app).get('/api/routines/trash').set(authHeader(user));
      expect(trash.body.map((r: any) => r.id)).toContain(id);
    });

    it('restores a trashed routine back to active, keeping its exercises intact', async () => {
      const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Routine Trash Squat', category: 'compound' });
      const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Restore Me' });
      await request(app)
        .post(`/api/routines/${routine.body.id}/exercises`)
        .set(authHeader(user))
        .send({ exercise_id: exercise.body.id, order_num: 1 });

      await request(app).delete(`/api/routines/${routine.body.id}`).set(authHeader(user));

      const restore = await request(app).post(`/api/routines/${routine.body.id}/restore`).set(authHeader(user));
      expect(restore.status).toBe(200);
      expect(restore.body.deleted_at).toBeNull();

      const fetched = await request(app).get(`/api/routines/${routine.body.id}`).set(authHeader(user));
      expect(fetched.body.routine_exercises).toHaveLength(1);
    });

    it('permanently deletes only from the trash, not an active routine', async () => {
      const created = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Still Active' });

      const stillActiveDelete = await request(app).delete(`/api/routines/${created.body.id}/permanent`).set(authHeader(user));
      expect(stillActiveDelete.status).toBe(404);

      await request(app).delete(`/api/routines/${created.body.id}`).set(authHeader(user));
      const permanentDelete = await request(app).delete(`/api/routines/${created.body.id}/permanent`).set(authHeader(user));
      expect(permanentDelete.status).toBe(204);

      const trash = await request(app).get('/api/routines/trash').set(authHeader(user));
      expect(trash.body.map((r: any) => r.id)).not.toContain(created.body.id);
    });

    it('a trashed routine cannot be started as a workout or have exercises added to it', async () => {
      const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Unusable' });
      await request(app).delete(`/api/routines/${routine.body.id}`).set(authHeader(user));

      const startRes = await request(app).post('/api/workouts').set(authHeader(user)).send({ routine_id: routine.body.id });
      expect(startRes.status).toBe(404);

      const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Unusable Exercise', category: 'compound' });
      const addRes = await request(app)
        .post(`/api/routines/${routine.body.id}/exercises`)
        .set(authHeader(user))
        .send({ exercise_id: exercise.body.id, order_num: 1 });
      expect(addRes.status).toBe(404);
    });
  });
});
