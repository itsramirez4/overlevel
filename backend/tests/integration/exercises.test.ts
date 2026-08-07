import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

describe('exercises', () => {
  let user: TestUser;

  beforeEach(async () => {
    user = await createTestUser('exercises');
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  it('creates and lists an exercise', async () => {
    const created = await request(app)
      .post('/api/exercises')
      .set(authHeader(user))
      .send({ name: 'Bench Press', category: 'compound' });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Bench Press');

    const list = await request(app).get('/api/exercises').set(authHeader(user));
    expect(list.status).toBe(200);
    expect(list.body.map((e: any) => e.name)).toContain('Bench Press');
  });

  it('rejects a duplicate name for the same user with 409', async () => {
    await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Squat', category: 'compound' });
    const dup = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Squat', category: 'compound' });
    expect(dup.status).toBe(409);
  });

  it('rejects a whitespace-only name', async () => {
    const res = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: '   ', category: 'compound' });
    expect(res.status).toBe(400);
  });

  it('trims a name with stray surrounding whitespace', async () => {
    const res = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: '  Deadlift  ', category: 'compound' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Deadlift');
  });

  it('one user cannot see, edit, or delete another user\'s exercise', async () => {
    const other = await createTestUser('exercises-other');
    try {
      const created = await request(app)
        .post('/api/exercises')
        .set(authHeader(other))
        .send({ name: 'Other User Exercise', category: 'compound' });
      const exerciseId = created.body.id;

      const get = await request(app).get(`/api/exercises/${exerciseId}`).set(authHeader(user));
      expect(get.status).toBe(404);

      const update = await request(app).put(`/api/exercises/${exerciseId}`).set(authHeader(user)).send({ name: 'Hijacked' });
      expect(update.status).toBe(404);

      const del = await request(app).delete(`/api/exercises/${exerciseId}`).set(authHeader(user));
      expect(del.status).toBe(404);
    } finally {
      await deleteTestUser(other.id);
    }
  });

  describe('trash lifecycle', () => {
    it('moves a deleted exercise to the trash instead of destroying it', async () => {
      const created = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Trash Me', category: 'compound' });
      const id = created.body.id;

      const del = await request(app).delete(`/api/exercises/${id}`).set(authHeader(user));
      expect(del.status).toBe(204);

      // No longer in the active list...
      const list = await request(app).get('/api/exercises').set(authHeader(user));
      expect(list.body.map((e: any) => e.id)).not.toContain(id);

      // ...but is in the trash.
      const trash = await request(app).get('/api/exercises/trash').set(authHeader(user));
      expect(trash.status).toBe(200);
      expect(trash.body.map((e: any) => e.id)).toContain(id);
    });

    it('restores a trashed exercise back to active', async () => {
      const created = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Restore Me', category: 'compound' });
      const id = created.body.id;
      await request(app).delete(`/api/exercises/${id}`).set(authHeader(user));

      const restore = await request(app).post(`/api/exercises/${id}/restore`).set(authHeader(user));
      expect(restore.status).toBe(200);
      expect(restore.body.deleted_at).toBeNull();

      const list = await request(app).get('/api/exercises').set(authHeader(user));
      expect(list.body.map((e: any) => e.id)).toContain(id);
    });

    it('allows creating a new exercise with the same name as a trashed one', async () => {
      const created = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Reused Name', category: 'compound' });
      await request(app).delete(`/api/exercises/${created.body.id}`).set(authHeader(user));

      const recreated = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Reused Name', category: 'compound' });
      expect(recreated.status).toBe(201);
      expect(recreated.body.id).not.toBe(created.body.id);
    });

    it('blocks restoring into a name collision with an active exercise, with a clear 409', async () => {
      const created = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Collision', category: 'compound' });
      const trashedId = created.body.id;
      await request(app).delete(`/api/exercises/${trashedId}`).set(authHeader(user));
      await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Collision', category: 'compound' });

      const restore = await request(app).post(`/api/exercises/${trashedId}/restore`).set(authHeader(user));
      expect(restore.status).toBe(409);
    });

    it('permanently deletes only from the trash, not an active exercise', async () => {
      const created = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Still Active', category: 'compound' });
      const stillActiveDelete = await request(app).delete(`/api/exercises/${created.body.id}/permanent`).set(authHeader(user));
      expect(stillActiveDelete.status).toBe(404);

      await request(app).delete(`/api/exercises/${created.body.id}`).set(authHeader(user));
      const permanentDelete = await request(app).delete(`/api/exercises/${created.body.id}/permanent`).set(authHeader(user));
      expect(permanentDelete.status).toBe(204);

      const trash = await request(app).get('/api/exercises/trash').set(authHeader(user));
      expect(trash.body.map((e: any) => e.id)).not.toContain(created.body.id);
    });

    it('a trashed exercise cannot be logged against or added to a routine', async () => {
      const created = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'No Longer Usable', category: 'compound' });
      const exerciseId = created.body.id;
      await request(app).delete(`/api/exercises/${exerciseId}`).set(authHeader(user));

      const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
      const setRes = await request(app)
        .post('/api/sets')
        .set(authHeader(user))
        .send({ workout_id: workout.body.id, exercise_id: exerciseId, set_number: 1, weight: 50, reps: 5 });
      expect(setRes.status).toBe(404);

      const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Trash Test Routine' });
      const addRes = await request(app)
        .post(`/api/routines/${routine.body.id}/exercises`)
        .set(authHeader(user))
        .send({ exercise_id: exerciseId, order_num: 1 });
      expect(addRes.status).toBe(404);
    });
  });
});
