import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

describe('workout exercise notes', () => {
  let user: TestUser;
  let workoutId: string;
  let exerciseId: string;

  beforeEach(async () => {
    user = await createTestUser('exnotes');
    const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    workoutId = workout.body.id;
    const exercise = await request(app)
      .post('/api/exercises')
      .set(authHeader(user))
      .send({ name: 'Note Bench', category: 'compound' });
    exerciseId = exercise.body.id;
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  it('sets a note for an exercise even before any set is logged', async () => {
    const res = await request(app)
      .put(`/api/workout-exercise-notes/${workoutId}/${exerciseId}`)
      .set(authHeader(user))
      .send({ notes: 'Me sentí fuerte hoy' });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Me sentí fuerte hoy');

    const list = await request(app).get(`/api/workout-exercise-notes/workout/${workoutId}`).set(authHeader(user));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].exercise_id).toBe(exerciseId);
  });

  it('overwrites the note for the same workout/exercise instead of duplicating it', async () => {
    await request(app)
      .put(`/api/workout-exercise-notes/${workoutId}/${exerciseId}`)
      .set(authHeader(user))
      .send({ notes: 'Primer intento' });
    await request(app)
      .put(`/api/workout-exercise-notes/${workoutId}/${exerciseId}`)
      .set(authHeader(user))
      .send({ notes: 'Nota actualizada' });

    const list = await request(app).get(`/api/workout-exercise-notes/workout/${workoutId}`).set(authHeader(user));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].notes).toBe('Nota actualizada');
  });

  it('an empty note clears it instead of storing a blank row', async () => {
    await request(app)
      .put(`/api/workout-exercise-notes/${workoutId}/${exerciseId}`)
      .set(authHeader(user))
      .send({ notes: 'Se borrará' });

    const cleared = await request(app)
      .put(`/api/workout-exercise-notes/${workoutId}/${exerciseId}`)
      .set(authHeader(user))
      .send({ notes: '   ' });
    expect(cleared.body).toBeNull();

    const list = await request(app).get(`/api/workout-exercise-notes/workout/${workoutId}`).set(authHeader(user));
    expect(list.body).toHaveLength(0);
  });

  it("rejects setting a note on another user's workout", async () => {
    const other = await createTestUser('exnotes-other');
    try {
      const res = await request(app)
        .put(`/api/workout-exercise-notes/${workoutId}/${exerciseId}`)
        .set(authHeader(other))
        .send({ notes: 'Intruso' });
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(other.id);
    }
  });

  it('a note on one exercise does not leak onto another exercise in the same workout', async () => {
    const exercise2 = await request(app)
      .post('/api/exercises')
      .set(authHeader(user))
      .send({ name: 'Note Squat', category: 'compound' });

    await request(app)
      .put(`/api/workout-exercise-notes/${workoutId}/${exerciseId}`)
      .set(authHeader(user))
      .send({ notes: 'Nota de banca' });

    const list = await request(app).get(`/api/workout-exercise-notes/workout/${workoutId}`).set(authHeader(user));
    expect(list.body).toHaveLength(1);
    expect(list.body.some((n: any) => n.exercise_id === exercise2.body.id)).toBe(false);
  });
});
