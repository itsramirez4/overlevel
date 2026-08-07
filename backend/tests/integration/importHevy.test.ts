import request from 'supertest';
import app from '../../src/index';
import { createTestUser, deleteTestUser, authHeader, TestUser } from '../helpers/testUser';

const HEADER =
  'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_type,weight_kg,weight_lbs,reps,distance_km,distance_miles,duration_seconds,rpe';

/** Quotes any field containing a comma (Hevy's date format does: "1 Jan 2025, 10:00"). */
const row = (fields: Record<string, string>) =>
  [
    'title', 'start_time', 'end_time', 'description', 'exercise_title', 'superset_id', 'exercise_notes',
    'set_type', 'weight_kg', 'weight_lbs', 'reps', 'distance_km', 'distance_miles', 'duration_seconds', 'rpe',
  ]
    .map((k) => {
      const v = fields[k] ?? '';
      return v.includes(',') ? `"${v}"` : v;
    })
    .join(',');

const csv = (rows: Record<string, string>[]) => [HEADER, ...rows.map(row)].join('\n');

const importCsv = (user: TestUser, csvText: string) =>
  request(app).post('/api/users/me/import/hevy').set(authHeader(user)).send({ csv: csvText });

describe('Hevy CSV import', () => {
  let user: TestUser;

  beforeEach(async () => {
    user = await createTestUser('import');
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  it('imports a basic workout with sets', async () => {
    const res = await importCsv(
      user,
      csv([
        {
          title: 'Push Day',
          start_time: '1 Jan 2025, 10:00',
          end_time: '1 Jan 2025, 10:30',
          exercise_title: 'Import Bench Press',
          set_type: 'normal',
          weight_kg: '60',
          reps: '8',
        },
      ])
    );

    expect(res.status).toBe(200);
    expect(res.body.workouts_created).toBe(1);
    expect(res.body.exercises_created).toBe(1);
    expect(res.body.sets_created).toBe(1);
  });

  it('re-importing the same file skips duplicate workouts', async () => {
    const text = csv([
      {
        title: 'Dup Day',
        start_time: '2 Jan 2025, 10:00',
        end_time: '2 Jan 2025, 10:30',
        exercise_title: 'Import Squat',
        set_type: 'normal',
        weight_kg: '80',
        reps: '5',
      },
    ]);

    const first = await importCsv(user, text);
    expect(first.body.workouts_created).toBe(1);

    const second = await importCsv(user, text);
    expect(second.body.workouts_created).toBe(0);
    expect(second.body.duplicate_workouts_skipped).toBe(1);
  });

  it('imports 0kg bodyweight sets instead of dropping them', async () => {
    const res = await importCsv(
      user,
      csv([
        {
          title: 'Bodyweight Day',
          start_time: '3 Jan 2025, 10:00',
          end_time: '3 Jan 2025, 10:15',
          exercise_title: 'Import Pull Up',
          set_type: 'normal',
          weight_kg: '0',
          reps: '10',
        },
      ])
    );

    expect(res.body.sets_created).toBe(1);
    expect(res.body.rows_skipped).toBe(0);
  });

  it('clamps an out-of-range RPE (0) to missing instead of dropping the whole set', async () => {
    const res = await importCsv(
      user,
      csv([
        {
          title: 'RPE Day',
          start_time: '4 Jan 2025, 10:00',
          end_time: '4 Jan 2025, 10:15',
          exercise_title: 'Import Overhead Press',
          set_type: 'normal',
          weight_kg: '40',
          reps: '6',
          rpe: '0',
        },
      ])
    );

    expect(res.body.sets_created).toBe(1);
  });

  it('rejects a CSV where every date is unparseable, instead of a fake empty success', async () => {
    const res = await importCsv(
      user,
      csv([
        {
          title: 'Bad Dates',
          start_time: 'not-a-real-date',
          end_time: 'not-a-real-date',
          exercise_title: 'Import Deadlift',
          set_type: 'normal',
          weight_kg: '100',
          reps: '5',
        },
      ])
    );

    expect(res.status).toBe(400);
  });

  it('rejects malformed CSV text', async () => {
    const res = await importCsv(user, '"unterminated quote,,,\n');
    expect([400]).toContain(res.status);
  });

  it('groups rows sharing a superset_id into the same superset_group', async () => {
    const res = await importCsv(
      user,
      csv([
        {
          title: 'Superset Day',
          start_time: '5 Jan 2025, 10:00',
          end_time: '5 Jan 2025, 10:30',
          exercise_title: 'Import Curl',
          superset_id: '1',
          set_type: 'normal',
          weight_kg: '15',
          reps: '10',
        },
        {
          title: 'Superset Day',
          start_time: '5 Jan 2025, 10:00',
          end_time: '5 Jan 2025, 10:30',
          exercise_title: 'Import Triceps Pushdown',
          superset_id: '1',
          set_type: 'normal',
          weight_kg: '20',
          reps: '10',
        },
      ])
    );

    expect(res.body.sets_created).toBe(2);

    const exercises = await request(app).get('/api/exercises').set(authHeader(user));
    const curl = exercises.body.find((e: any) => e.name === 'Import Curl');
    const workouts = await request(app).get('/api/workouts').set(authHeader(user));
    const workout = workouts.body[0];
    const sets = await request(app).get(`/api/sets/workout/${workout.id}`).set(authHeader(user));

    const curlSet = sets.body.find((s: any) => s.exercise_id === curl.id);
    expect(curlSet.superset_group).toBeTruthy();
    expect(curlSet.superset_group).toContain(workout.id);
  });

  it('infers a cardio category for a distance-only row with no weight (and skips the unloggable set)', async () => {
    const res = await importCsv(
      user,
      csv([
        {
          title: 'Cardio Day',
          start_time: '6 Jan 2025, 10:00',
          end_time: '6 Jan 2025, 10:30',
          exercise_title: 'Import Running',
          set_type: 'normal',
          distance_km: '5',
          duration_seconds: '1800',
        },
      ])
    );

    expect(res.body.exercises_created).toBe(1);
    expect(res.body.rows_skipped).toBe(1); // no weight/reps -> can't be logged as a set

    const exercises = await request(app).get('/api/exercises').set(authHeader(user));
    const running = exercises.body.find((e: any) => e.name === 'Import Running');
    expect(running.category).toBe('cardio');
  });

  it('matches an existing exercise case-insensitively instead of creating a duplicate', async () => {
    await request(app).post('/api/exercises').set(authHeader(user)).send({ name: 'Import Lat Pulldown', category: 'compound' });

    const res = await importCsv(
      user,
      csv([
        {
          title: 'Case Day',
          start_time: '7 Jan 2025, 10:00',
          end_time: '7 Jan 2025, 10:15',
          exercise_title: 'import lat pulldown',
          set_type: 'normal',
          weight_kg: '50',
          reps: '10',
        },
      ])
    );

    expect(res.body.exercises_created).toBe(0);
    expect(res.body.sets_created).toBe(1);

    const exercises = await request(app).get('/api/exercises').set(authHeader(user));
    const matches = exercises.body.filter((e: any) => e.name.toLowerCase() === 'import lat pulldown');
    expect(matches).toHaveLength(1);
  });
});
