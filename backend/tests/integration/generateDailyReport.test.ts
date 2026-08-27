import { supabaseAdmin } from '../../src/config/supabase';
import { generateDailyReport } from '../../src/jobs/generateDailyReport';
import { createTestUser, deleteTestUser, TestUser } from '../helpers/testUser';

function utcYesterdayAt(hour: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

describe('generateDailyReport', () => {
  let user: TestUser;

  beforeEach(async () => {
    user = await createTestUser('daily-report');
  });

  afterEach(async () => {
    await deleteTestUser(user.id);
  });

  // Not exposed via any API route today, but it's live, scheduled
  // (cronService.ts), and used to have the exact bug pair analyticsService
  // had before being fixed: raw weight*reps (zeroing cardio, whose
  // weight/reps are NULL) and no is_warmup filter at all.
  it("aggregates yesterday's non-warmup sets with cardio-aware volume into workout_stats", async () => {
    const strength = await supabaseAdmin
      .from('exercises')
      .insert({ user_id: user.id, name: 'Daily Report Bench', category: 'compound' })
      .select()
      .single();
    const cardio = await supabaseAdmin
      .from('exercises')
      .insert({ user_id: user.id, name: 'Daily Report Run', category: 'cardio' })
      .select()
      .single();

    const workout = await supabaseAdmin
      .from('workouts')
      .insert({ user_id: user.id, started_at: utcYesterdayAt(12).toISOString() })
      .select()
      .single();

    await supabaseAdmin.from('sets').insert([
      { workout_id: workout.data.id, exercise_id: strength.data.id, set_number: 1, weight: 100, reps: 5, is_warmup: false }, // 500
      { workout_id: workout.data.id, exercise_id: strength.data.id, set_number: 2, weight: 999, reps: 999, is_warmup: true }, // excluded
      { workout_id: workout.data.id, exercise_id: cardio.data.id, set_number: 1, distance_km: 5, duration_seconds: 1800, is_warmup: false }, // 500
    ]);

    await generateDailyReport();

    const date = utcYesterdayAt(0).toISOString().split('T')[0];
    const { data: stats } = await supabaseAdmin
      .from('workout_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    expect(stats?.total_volume).toBe(1000);
    expect(stats?.total_sets).toBe(2);
    expect(stats?.workout_count).toBe(1);
  });
});
