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
