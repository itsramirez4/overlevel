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

  it('sets and clears a per-exercise unit override', async () => {
    const created = await request(app)
      .post('/api/exercises')
      .set(authHeader(user))
      .send({ name: 'Curl', category: 'isolation' });
    expect(created.body.weight_unit).toBeFalsy();

    const updated = await request(app)
      .put(`/api/exercises/${created.body.id}`)
      .set(authHeader(user))
      .send({ weight_unit: 'lbs' });
    expect(updated.status).toBe(200);
    expect(updated.body.weight_unit).toBe('lbs');

    const cleared = await request(app)
      .put(`/api/exercises/${created.body.id}`)
      .set(authHeader(user))
      .send({ weight_unit: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.weight_unit).toBeFalsy();
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

  describe('sharing — exercises are usable across users, but only editable by their creator', () => {
    it('GET /exercises stays scoped to your own; ?scope=all includes everyone\'s', async () => {
      const other = await createTestUser('exercises-shared-owner');
      try {
        const created = await request(app)
          .post('/api/exercises')
          .set(authHeader(other))
          .send({ name: 'Shared By Other', category: 'compound' });

        const mine = await request(app).get('/api/exercises').set(authHeader(user));
        expect(mine.body.map((e: any) => e.id)).not.toContain(created.body.id);

        const all = await request(app).get('/api/exercises?scope=all').set(authHeader(user));
        expect(all.status).toBe(200);
        expect(all.body.map((e: any) => e.id)).toContain(created.body.id);
      } finally {
        await deleteTestUser(other.id);
      }
    });

    it('can log a set against another user\'s exercise', async () => {
      const other = await createTestUser('exercises-shared-log');
      try {
        const created = await request(app)
          .post('/api/exercises')
          .set(authHeader(other))
          .send({ name: 'Shared For Logging', category: 'compound' });

        const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
        const setRes = await request(app)
          .post('/api/sets')
          .set(authHeader(user))
          .send({ workout_id: workout.body.id, exercise_id: created.body.id, set_number: 1, weight: 50, reps: 5 });
        expect(setRes.status).toBe(201);
      } finally {
        await deleteTestUser(other.id);
      }
    });

    it('can add another user\'s exercise to a routine', async () => {
      const other = await createTestUser('exercises-shared-routine');
      try {
        const created = await request(app)
          .post('/api/exercises')
          .set(authHeader(other))
          .send({ name: 'Shared For Routine', category: 'compound' });

        const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Shared Routine' });
        const addRes = await request(app)
          .post(`/api/routines/${routine.body.id}/exercises`)
          .set(authHeader(user))
          .send({ exercise_id: created.body.id, order_num: 1 });
        expect(addRes.status).toBe(201);
      } finally {
        await deleteTestUser(other.id);
      }
    });
  });

  describe('admin moderation (ADMIN_USER_IDS)', () => {
    const originalAdminIds = process.env.ADMIN_USER_IDS;
    afterEach(() => {
      process.env.ADMIN_USER_IDS = originalAdminIds;
    });

    it('an admin can edit and delete another user\'s exercise', async () => {
      const other = await createTestUser('exercises-admin-target');
      try {
        const created = await request(app)
          .post('/api/exercises')
          .set(authHeader(other))
          .send({ name: 'Needs Moderation', category: 'compound' });

        process.env.ADMIN_USER_IDS = user.id;

        const update = await request(app)
          .put(`/api/exercises/${created.body.id}`)
          .set(authHeader(user))
          .send({ name: 'Fixed Name' });
        expect(update.status).toBe(200);
        expect(update.body.name).toBe('Fixed Name');

        const del = await request(app).delete(`/api/exercises/${created.body.id}`).set(authHeader(user));
        expect(del.status).toBe(204);
      } finally {
        await deleteTestUser(other.id);
      }
    });

    it('without ADMIN_USER_IDS set, the same user still gets 404 on another user\'s exercise', async () => {
      const other = await createTestUser('exercises-not-admin');
      try {
        const created = await request(app)
          .post('/api/exercises')
          .set(authHeader(other))
          .send({ name: 'Not Moderatable', category: 'compound' });

        process.env.ADMIN_USER_IDS = '';

        const update = await request(app)
          .put(`/api/exercises/${created.body.id}`)
          .set(authHeader(user))
          .send({ name: 'Should Not Work' });
        expect(update.status).toBe(404);
      } finally {
        await deleteTestUser(other.id);
      }
    });
  });

  describe('merge (admin only)', () => {
    const originalAdminIds = process.env.ADMIN_USER_IDS;
    afterEach(() => {
      process.env.ADMIN_USER_IDS = originalAdminIds;
    });

    it('rejects a non-admin with 403', async () => {
      process.env.ADMIN_USER_IDS = '';
      const a = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Merge A', category: 'compound' });
      const b = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Merge B', category: 'compound' });

      const res = await request(app)
        .post(`/api/exercises/${a.body.id}/merge`)
        .set(authHeader(user))
        .send({ into: b.body.id });
      expect(res.status).toBe(403);
    });

    it('rejects merging an exercise into itself', async () => {
      process.env.ADMIN_USER_IDS = user.id;
      const a = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Self Merge', category: 'compound' });

      const res = await request(app)
        .post(`/api/exercises/${a.body.id}/merge`)
        .set(authHeader(user))
        .send({ into: a.body.id });
      expect(res.status).toBe(400);
    });

    it('repoints sets and routine slots from the loser to the survivor, and trashes the loser', async () => {
      process.env.ADMIN_USER_IDS = user.id;
      const loser = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Loser', category: 'compound' });
      const survivor = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Survivor', category: 'compound' });

      const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
      const set = await request(app)
        .post('/api/sets')
        .set(authHeader(user))
        .send({ workout_id: workout.body.id, exercise_id: loser.body.id, set_number: 1, weight: 50, reps: 5 });
      expect(set.status).toBe(201);

      const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Merge Routine' });
      const routineExercise = await request(app)
        .post(`/api/routines/${routine.body.id}/exercises`)
        .set(authHeader(user))
        .send({ exercise_id: loser.body.id, order_num: 1 });
      expect(routineExercise.status).toBe(201);

      const merge = await request(app)
        .post(`/api/exercises/${loser.body.id}/merge`)
        .set(authHeader(user))
        .send({ into: survivor.body.id });
      expect(merge.status).toBe(200);
      expect(merge.body.deleted_at).toBeTruthy();

      const setsAfter = await request(app).get(`/api/sets/workout/${workout.body.id}`).set(authHeader(user));
      expect(setsAfter.body.find((s: any) => s.id === set.body.id).exercise_id).toBe(survivor.body.id);

      const routineAfter = await request(app).get(`/api/routines/${routine.body.id}`).set(authHeader(user));
      expect(routineAfter.body.routine_exercises.map((re: any) => re.exercise_id)).toContain(survivor.body.id);

      // The loser no longer shows up as usable — logging against it now 404s.
      const setAfterMerge = await request(app)
        .post('/api/sets')
        .set(authHeader(user))
        .send({ workout_id: workout.body.id, exercise_id: loser.body.id, set_number: 2, weight: 50, reps: 5 });
      expect(setAfterMerge.status).toBe(404);
    });

    it('when both loser and survivor already have a battle in the same workout, keeps the survivor\'s and drops the loser\'s', async () => {
      process.env.ADMIN_USER_IDS = user.id;
      const loser = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Battle Loser', category: 'compound' });
      const survivor = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Battle Survivor', category: 'compound' });

      const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
      await request(app)
        .post('/api/sets')
        .set(authHeader(user))
        .send({ workout_id: workout.body.id, exercise_id: loser.body.id, set_number: 1, weight: 50, reps: 5 });
      await request(app)
        .post('/api/sets')
        .set(authHeader(user))
        .send({ workout_id: workout.body.id, exercise_id: survivor.body.id, set_number: 1, weight: 50, reps: 5 });

      const battlesBefore = await request(app).get(`/api/battles/workout/${workout.body.id}`).set(authHeader(user));
      expect(battlesBefore.body.length).toBe(2);

      const merge = await request(app)
        .post(`/api/exercises/${loser.body.id}/merge`)
        .set(authHeader(user))
        .send({ into: survivor.body.id });
      expect(merge.status).toBe(200);

      const battlesAfter = await request(app).get(`/api/battles/workout/${workout.body.id}`).set(authHeader(user));
      expect(battlesAfter.body.length).toBe(1);
      expect(battlesAfter.body[0].exercise_id).toBe(survivor.body.id);
    });
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
