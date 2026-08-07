import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

describe('character (RPG layer)', () => {
  let user: TestUser;

  beforeEach(async () => {
    user = await createTestUser('character');
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  it('has no character by default (RPG layer is optional)', async () => {
    const res = await request(app).get('/api/characters/me').set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it('creates a character at level 1 with zero prior history', async () => {
    const res = await request(app).post('/api/characters').set(authHeader(user)).send({ character_type: 'powerlifter' });
    expect(res.status).toBe(201);
    expect(res.body.level).toBe(1);
    expect(res.body.xp).toBe(0);
  });

  it('rejects an invalid character_type', async () => {
    const res = await request(app).post('/api/characters').set(authHeader(user)).send({ character_type: 'wizard' });
    expect(res.status).toBe(400);
  });

  it('rejects creating a second character for the same user', async () => {
    await request(app).post('/api/characters').set(authHeader(user)).send({ character_type: 'powerlifter' });
    const second = await request(app).post('/api/characters').set(authHeader(user)).send({ character_type: 'bodybuilder' });
    expect(second.status).toBe(409);
  });

  it('completing a workout with no character is a silent no-op (no xp_award)', async () => {
    const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    const complete = await request(app).put(`/api/workouts/${workout.body.id}/complete`).set(authHeader(user)).send({});
    expect(complete.status).toBe(200);
    expect(complete.body.xp_award).toBeUndefined();
  });

  it('awards XP and detects a level-up on workout completion', async () => {
    await request(app).post('/api/characters').set(authHeader(user)).send({ character_type: 'bodybuilder' });

    const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'XP Squat', category: 'compound' });
    // A big first (= PR) set: volume 1000 -> well over the level-2 threshold (50 xp).
    await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: workout.body.id, exercise_id: exercise.body.id, set_number: 1, weight: 100, reps: 10 });

    const complete = await request(app).put(`/api/workouts/${workout.body.id}/complete`).set(authHeader(user)).send({});
    expect(complete.status).toBe(200);
    expect(complete.body.xp_award).toBeTruthy();
    expect(complete.body.xp_award.xpGained).toBeGreaterThan(0);
    expect(complete.body.xp_award.leveledUp).toBe(true);
    expect(complete.body.xp_award.newLevel).toBeGreaterThan(complete.body.xp_award.previousLevel);

    const character = await request(app).get('/api/characters/me').set(authHeader(user));
    expect(character.body.level).toBe(complete.body.xp_award.newLevel);
  });

  it('changing character type keeps level/xp untouched', async () => {
    await request(app).post('/api/characters').set(authHeader(user)).send({ character_type: 'powerlifter' });

    const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
    const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Type Change Squat', category: 'compound' });
    await request(app)
      .post('/api/sets')
      .set(authHeader(user))
      .send({ workout_id: workout.body.id, exercise_id: exercise.body.id, set_number: 1, weight: 100, reps: 10 });
    await request(app).put(`/api/workouts/${workout.body.id}/complete`).set(authHeader(user)).send({});

    const before = await request(app).get('/api/characters/me').set(authHeader(user));

    const changed = await request(app).put('/api/characters/me').set(authHeader(user)).send({ character_type: 'crossfitter' });
    expect(changed.status).toBe(200);
    expect(changed.body.character_type).toBe('crossfitter');
    expect(changed.body.level).toBe(before.body.level);
    expect(changed.body.xp).toBe(before.body.xp);
  });
});
