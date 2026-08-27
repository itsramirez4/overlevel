import request from 'supertest';
import app from '../../src/index';
import { supabaseAdmin } from '../../src/config/supabase';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

/**
 * The real API deliberately never lets a client set a workout's started_at
 * (workoutService.start always uses the server's own clock — see the
 * mass-assignment fix in workouts.test.ts). Analytics is fundamentally
 * about bucketing by date, so exercising anything beyond "today" requires
 * writing historical rows directly, same as importHevy.test.ts's dates are
 * the only other place this app accepts a caller-supplied started_at.
 */
async function insertHistoricalWorkout(userId: string, startedAt: Date, completed = true) {
  const { data } = await supabaseAdmin
    .from('workouts')
    .insert({
      user_id: userId,
      started_at: startedAt.toISOString(),
      completed_at: completed ? startedAt.toISOString() : null,
    })
    .select()
    .single();
  return data;
}

async function insertSet(
  workoutId: string,
  exerciseId: string,
  setNumber: number,
  weight: number,
  reps: number,
  isWarmup = false
) {
  await supabaseAdmin.from('sets').insert({
    workout_id: workoutId,
    exercise_id: exerciseId,
    set_number: setNumber,
    weight,
    reps,
    is_warmup: isWarmup,
    is_pr: false,
  });
}

async function insertCardioSet(workoutId: string, exerciseId: string, setNumber: number, distanceKm: number) {
  await supabaseAdmin.from('sets').insert({
    workout_id: workoutId,
    exercise_id: exerciseId,
    set_number: setNumber,
    distance_km: distanceKm,
    duration_seconds: 1800,
    is_warmup: false,
    is_pr: false,
  });
}

function utcDaysAgo(days: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0); // midday, safely clear of any date-boundary rounding
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

describe('analytics', () => {
  let user: TestUser;

  beforeEach(async () => {
    user = await createTestUser('analytics');
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  describe('summary', () => {
    it('is all zero/null with no history', async () => {
      const res = await request(app).get('/api/analytics/summary').set(authHeader(user));
      expect(res.status).toBe(200);
      expect(res.body.workouts_this_month).toBe(0);
      expect(res.body.total_volume).toBe(0);
      expect(res.body.current_streak).toBe(0);
      expect(res.body.recommended_routine).toBeNull();
    });

    it('counts this month\'s workouts and volume, excluding warmup sets', async () => {
      const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Analytics Bench', category: 'compound' });
      const workout = await insertHistoricalWorkout(user.id, utcDaysAgo(0));
      await insertSet(workout.id, exercise.body.id, 1, 100, 5); // volume 500
      await insertSet(workout.id, exercise.body.id, 2, 999, 999, true); // warmup, excluded

      const res = await request(app).get('/api/analytics/summary').set(authHeader(user));
      expect(res.body.workouts_this_month).toBe(1);
      expect(res.body.total_volume).toBe(500);
    });

    // Cardio sets have no weight/reps (they're NULL by design), so a plain
    // weight*reps sum silently counts every cardio set as 0 volume — this
    // used to disagree with XP/battle damage, which are category-aware.
    it("counts a cardio set's distance-based effort as volume, not zero", async () => {
      const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Analytics Run', category: 'cardio' });
      const workout = await insertHistoricalWorkout(user.id, utcDaysAgo(0));
      await insertCardioSet(workout.id, exercise.body.id, 1, 5); // 5km -> effort 500

      const res = await request(app).get('/api/analytics/summary').set(authHeader(user));
      expect(res.body.total_volume).toBe(500);
    });

    it('recommends the only active routine when there is just one', async () => {
      const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Only Routine' });
      const res = await request(app).get('/api/analytics/summary').set(authHeader(user));
      expect(res.body.recommended_routine.id).toBe(routine.body.id);
    });

    it('does not recommend a trashed routine', async () => {
      const routine = await request(app).post('/api/routines').set(authHeader(user)).send({ name: 'Trashed Routine' });
      await request(app).delete(`/api/routines/${routine.body.id}`).set(authHeader(user));

      const res = await request(app).get('/api/analytics/summary').set(authHeader(user));
      expect(res.body.recommended_routine).toBeNull();
    });
  });

  describe('current_streak', () => {
    it('counts consecutive days ending today', async () => {
      await insertHistoricalWorkout(user.id, utcDaysAgo(0));
      await insertHistoricalWorkout(user.id, utcDaysAgo(1));
      await insertHistoricalWorkout(user.id, utcDaysAgo(2));

      const res = await request(app).get('/api/analytics/summary').set(authHeader(user));
      expect(res.body.current_streak).toBe(3);
    });

    it('stops at a gap day', async () => {
      await insertHistoricalWorkout(user.id, utcDaysAgo(0));
      await insertHistoricalWorkout(user.id, utcDaysAgo(1));
      // gap at 2 days ago
      await insertHistoricalWorkout(user.id, utcDaysAgo(3));

      const res = await request(app).get('/api/analytics/summary').set(authHeader(user));
      expect(res.body.current_streak).toBe(2);
    });

    it('still counts an intact streak even if today has no workout yet', async () => {
      await insertHistoricalWorkout(user.id, utcDaysAgo(1));
      await insertHistoricalWorkout(user.id, utcDaysAgo(2));

      const res = await request(app).get('/api/analytics/summary').set(authHeader(user));
      expect(res.body.current_streak).toBe(2);
    });

    it('does not count an incomplete (not completed_at) workout', async () => {
      await insertHistoricalWorkout(user.id, utcDaysAgo(0), false);
      const res = await request(app).get('/api/analytics/summary').set(authHeader(user));
      expect(res.body.current_streak).toBe(0);
    });
  });

  describe('volume-history and heatmap', () => {
    it('buckets volume into the correct week and excludes warmups', async () => {
      const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Volume History Squat', category: 'compound' });
      const workout = await insertHistoricalWorkout(user.id, utcDaysAgo(0));
      await insertSet(workout.id, exercise.body.id, 1, 50, 10); // volume 500
      await insertSet(workout.id, exercise.body.id, 2, 500, 500, true); // warmup, excluded

      const res = await request(app).get('/api/analytics/volume-history?weeks=4').set(authHeader(user));
      expect(res.status).toBe(200);
      const total = res.body.reduce((sum: number, w: any) => sum + w.total_volume, 0);
      expect(total).toBe(500);
    });

    it('returns a dense day-by-day heatmap of the requested length', async () => {
      const res = await request(app).get('/api/analytics/heatmap?weeks=3').set(authHeader(user));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(21);
    });

    it('rejects a non-numeric weeks param with 400, not 500', async () => {
      const res = await request(app).get('/api/analytics/volume-history?weeks=abc').set(authHeader(user));
      expect(res.status).toBe(400);
    });
  });

  describe('muscle-distribution', () => {
    it('attributes volume to every muscle group tagged on the exercise', async () => {
      const exercise = await request(app)
        .post('/api/exercises')
        .set(authHeader(user))
        .send({ name: 'Muscle Dist Row', category: 'compound', muscle_groups: ['back', 'biceps'] });
      const workout = await insertHistoricalWorkout(user.id, utcDaysAgo(0));
      await insertSet(workout.id, exercise.body.id, 1, 40, 10); // volume 400

      const res = await request(app).get('/api/analytics/muscle-distribution?weeks=4').set(authHeader(user));
      const back = res.body.find((g: any) => g.muscle_group === 'back');
      const biceps = res.body.find((g: any) => g.muscle_group === 'biceps');
      expect(back.volume).toBe(400);
      expect(biceps.volume).toBe(400);
    });

    it('falls back to "Sin clasificar" for an exercise with no muscle groups', async () => {
      const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Unclassified Exercise', category: 'compound' });
      const workout = await insertHistoricalWorkout(user.id, utcDaysAgo(0));
      await insertSet(workout.id, exercise.body.id, 1, 20, 10);

      const res = await request(app).get('/api/analytics/muscle-distribution?weeks=4').set(authHeader(user));
      const unclassified = res.body.find((g: any) => g.muscle_group === 'Sin clasificar');
      expect(unclassified.volume).toBe(200);
    });
  });

  describe('personal records and progress history', () => {
    it('only counts PR sets, and picks the one from the most recent workout per exercise', async () => {
      const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'PR History Deadlift', category: 'compound' });

      // Two distinct workouts (distinct started_at) so "most recent" has
      // something real to distinguish — same-timestamp sets within one
      // workout have no meaningful chronological order to pick between.
      const olderWorkout = await insertHistoricalWorkout(user.id, utcDaysAgo(2));
      await supabaseAdmin.from('sets').insert({
        workout_id: olderWorkout.id, exercise_id: exercise.body.id, set_number: 1, weight: 100, reps: 5, is_warmup: false, is_pr: true,
      });

      const newerWorkout = await insertHistoricalWorkout(user.id, utcDaysAgo(1));
      await supabaseAdmin.from('sets').insert({
        workout_id: newerWorkout.id, exercise_id: exercise.body.id, set_number: 1, weight: 120, reps: 5, is_warmup: false, is_pr: true,
      });

      const res = await request(app).get('/api/analytics/records').set(authHeader(user));
      const record = res.body.find((r: any) => r.exercise_id === exercise.body.id);
      expect(record.weight).toBe(120);
    });

    it('progress history has one point per session using the best set that session', async () => {
      const exercise = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Progress History Press', category: 'compound' });
      const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
      await request(app).post('/api/sets').set(authHeader(user)).send({ workout_id: workout.body.id, exercise_id: exercise.body.id, set_number: 1, weight: 40, reps: 8 });
      await request(app).post('/api/sets').set(authHeader(user)).send({ workout_id: workout.body.id, exercise_id: exercise.body.id, set_number: 2, weight: 50, reps: 5 });

      const res = await request(app).get(`/api/analytics/exercise/${exercise.body.id}/progress`).set(authHeader(user));
      expect(res.body).toHaveLength(1);
      expect(res.body[0].weight).toBe(50);
    });
  });

  describe('trained-exercises', () => {
    it('only lists exercises with at least one logged set', async () => {
      await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Untrained Exercise', category: 'compound' });
      const trained = await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Trained Exercise', category: 'compound' });
      const workout = await request(app).post('/api/workouts').set(authHeader(user)).send({});
      await request(app).post('/api/sets').set(authHeader(user)).send({ workout_id: workout.body.id, exercise_id: trained.body.id, set_number: 1, weight: 30, reps: 10 });

      const res = await request(app).get('/api/analytics/trained-exercises').set(authHeader(user));
      const names = res.body.map((e: any) => e.name);
      expect(names).toContain('Trained Exercise');
      expect(names).not.toContain('Untrained Exercise');
    });
  });
});
