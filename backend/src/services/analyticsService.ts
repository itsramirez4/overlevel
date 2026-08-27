import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { fetchAllRows } from '../utils/pagination';
import { calculatePaceMinPerKm, calculateSetEffort } from '../utils/calculations';

interface EffortSet {
  weight: number | null;
  reps: number | null;
  distance_km: number | null;
  is_warmup: boolean;
  // A many-to-one embed (many sets, one exercise) is a single object at
  // runtime — same as everywhere else in this codebase that reads
  // `.exercises`. Supabase's query typing can't know that without a
  // generated Database schema type and defaults to an array instead; the
  // `as EffortSet[]` casts below the query sites are what paper over that,
  // not this type.
  exercises: { category: 'compound' | 'isolation' | 'cardio' } | null;
}

const setCategory = (exercises: EffortSet['exercises']) => exercises?.category || 'compound';

/** Sums calculateSetEffort across non-warmup sets, category-aware — a plain
 * weight*reps sum silently zeroes out every cardio set (weight/reps are
 * NULL for those), which used to make analytics disagree with XP/battle
 * damage (characterService/battleService) about how much a cardio session
 * "counts". Shared here so the four functions below can't drift again. */
function nonWarmupEffort(sets: EffortSet[]): number {
  return sets
    .filter((s) => !s.is_warmup)
    .reduce((sum, s) => sum + calculateSetEffort(setCategory(s.exercises), s.weight, s.reps, s.distance_km), 0);
}

export class AnalyticsService {
  async getSummary(userId: string) {
    // UTC, not local server time — same reasoning as getCurrentStreak below:
    // otherwise this month's cutoff and the streak/heatmap's day buckets in
    // the very same response could disagree about which calendar day a
    // workout logged near midnight actually falls on.
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { data: monthWorkouts, error } = await supabaseAdmin
      .from('workouts')
      .select('id, sets(weight, reps, distance_km, is_warmup, exercises(category))')
      .eq('user_id', userId)
      .gte('started_at', startOfMonth.toISOString());

    if (error) throw new AppError('Failed to compute analytics summary');

    const workoutsThisMonth = monthWorkouts?.length || 0;
    const totalVolume = (monthWorkouts || []).reduce((sum, w) => sum + nonWarmupEffort((w.sets || []) as unknown as EffortSet[]), 0);

    const recommendedRoutine = await this.recommendRoutine(userId);
    const currentStreak = await this.getCurrentStreak(userId);

    return {
      workouts_this_month: workoutsThisMonth,
      total_volume: totalVolume,
      recommended_routine: recommendedRoutine,
      current_streak: currentStreak,
    };
  }

  /**
   * Consecutive days with a completed workout, counting back from today.
   * If today has no workout yet, counting starts from yesterday instead —
   * an in-progress day shouldn't zero out an otherwise-intact streak.
   */
  async getCurrentStreak(userId: string): Promise<number> {
    // A hardcoded row cap here would undercount a genuine long streak for
    // anyone who trains more than once a day (their most-recent N rows can
    // cover fewer distinct days than N) — fetch everything instead.
    const data = await fetchAllRows<{ started_at: string }>((from, to) =>
      supabaseAdmin
        .from('workouts')
        .select('started_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .range(from, to)
    );

    const workoutDays = new Set(data.map((w) => new Date(w.started_at).toISOString().split('T')[0]));

    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);
    if (!workoutDays.has(cursor.toISOString().split('T')[0])) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    let streak = 0;
    while (workoutDays.has(cursor.toISOString().split('T')[0])) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return streak;
  }

  /**
   * `fixed_day` routines are suggested on their matching day of the week.
   * Everything else (alternating_ab/abc) round-robins: whichever active
   * routine follows the one used in the most recent routine-based workout.
   */
  private async recommendRoutine(userId: string) {
    const { data: activeRoutines } = await supabaseAdmin
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    const routines = activeRoutines || [];
    if (routines.length === 0) return null;
    if (routines.length === 1) return routines[0];

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const today = dayNames[new Date().getUTCDay()];

    const fixedToday = routines.find(
      (r) => r.pattern === 'fixed_day' && r.day_of_week && normalize(r.day_of_week) === today
    );
    if (fixedToday) return fixedToday;

    const rotationPool = routines.filter((r) => r.pattern !== 'fixed_day');
    const pool = rotationPool.length ? rotationPool : routines;
    if (pool.length === 1) return pool[0];

    const { data: lastWorkout } = await supabaseAdmin
      .from('workouts')
      .select('routine_id')
      .eq('user_id', userId)
      .not('routine_id', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastWorkout?.routine_id) return pool[0];

    const lastIndex = pool.findIndex((r) => r.id === lastWorkout.routine_id);
    if (lastIndex === -1) return pool[0];

    return pool[(lastIndex + 1) % pool.length];
  }

  async getWeeklyVolumeHistory(userId: string, weeks = 8) {
    const weekStart = (date: Date) => {
      const d = new Date(date);
      const day = (d.getUTCDay() + 6) % 7; // Monday = 0
      d.setUTCDate(d.getUTCDate() - day);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    };

    const since = weekStart(new Date());
    since.setUTCDate(since.getUTCDate() - (weeks - 1) * 7);

    const { data: workouts, error } = await supabaseAdmin
      .from('workouts')
      .select('started_at, sets(weight, reps, distance_km, is_warmup, exercises(category))')
      .eq('user_id', userId)
      .gte('started_at', since.toISOString());

    if (error) throw new AppError('Failed to compute volume history');

    const buckets = new Map<string, number>();
    for (let i = 0; i < weeks; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i * 7);
      buckets.set(d.toISOString().split('T')[0], 0);
    }

    for (const w of workouts || []) {
      const key = weekStart(new Date(w.started_at)).toISOString().split('T')[0];
      const volume = nonWarmupEffort((w.sets || []) as unknown as EffortSet[]);
      buckets.set(key, (buckets.get(key) || 0) + volume);
    }

    return Array.from(buckets.entries()).map(([week_start, total_volume]) => ({
      week_start,
      total_volume,
    }));
  }

  /**
   * Attributes each non-warmup set's full volume to every muscle group tagged
   * on its exercise (an exercise can target more than one), so a compound
   * lift contributes to each group it trains rather than splitting volume.
   */
  async getMuscleGroupDistribution(userId: string, weeks = 8) {
    // UTC, not local server time — same reasoning as getCurrentStreak/
    // getSummary above: otherwise this chart's cutoff can disagree with
    // every sibling analytics endpoint about which workouts are "in range".
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - weeks * 7);

    const { data: workouts, error } = await supabaseAdmin
      .from('workouts')
      .select('sets(weight, reps, distance_km, is_warmup, exercises(category, muscle_groups))')
      .eq('user_id', userId)
      .gte('started_at', since.toISOString());

    if (error) throw new AppError('Failed to compute muscle group distribution');

    const totals = new Map<string, number>();
    for (const w of workouts || []) {
      for (const s of (w.sets || []) as unknown as (EffortSet & {
        exercises: { category: 'compound' | 'isolation' | 'cardio'; muscle_groups: string[] } | null;
      })[]) {
        if (s.is_warmup) continue;
        const volume = calculateSetEffort(s.exercises?.category || 'compound', s.weight, s.reps, s.distance_km);
        const groups: string[] = s.exercises?.muscle_groups?.length ? s.exercises.muscle_groups : ['Sin clasificar'];
        for (const g of groups) {
          totals.set(g, (totals.get(g) || 0) + volume);
        }
      }
    }

    return Array.from(totals.entries())
      .map(([muscle_group, volume]) => ({ muscle_group, volume }))
      .sort((a, b) => b.volume - a.volume);
  }

  /** Dense day-by-day volume for the last `weeks` calendar weeks (Monday-aligned), for a GitHub-style heatmap. */
  async getWorkoutHeatmap(userId: string, weeks = 10) {
    const weekStart = (date: Date) => {
      const d = new Date(date);
      const day = (d.getUTCDay() + 6) % 7; // Monday = 0
      d.setUTCDate(d.getUTCDate() - day);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    };

    const rangeStart = weekStart(new Date());
    rangeStart.setUTCDate(rangeStart.getUTCDate() - (weeks - 1) * 7);

    const { data: workouts, error } = await supabaseAdmin
      .from('workouts')
      .select('started_at, sets(weight, reps, distance_km, is_warmup, exercises(category))')
      .eq('user_id', userId)
      .gte('started_at', rangeStart.toISOString());

    if (error) throw new AppError('Failed to compute workout heatmap');

    const days = weeks * 7;
    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart);
      d.setUTCDate(d.getUTCDate() + i);
      buckets.set(d.toISOString().split('T')[0], 0);
    }

    for (const w of workouts || []) {
      const key = new Date(w.started_at).toISOString().split('T')[0];
      if (!buckets.has(key)) continue;
      const volume = nonWarmupEffort((w.sets || []) as unknown as EffortSet[]);
      buckets.set(key, (buckets.get(key) || 0) + volume);
    }

    return Array.from(buckets.entries()).map(([date, volume]) => ({ date, volume }));
  }

  async getExerciseStats(exerciseId: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('user_exercise_stats')
      .select('*')
      .eq('exercise_id', exerciseId)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new AppError('Exercise stats not found', 404);
    return data;
  }

  /**
   * One point per workout session that included this exercise: the best
   * non-warmup set (by estimated 1RM) that session, so the trend reflects
   * genuine effort rather than every individual set logged.
   */
  async getExerciseProgressHistory(exerciseId: string, userId: string) {
    const { data: exercise } = await supabaseAdmin
      .from('exercises')
      .select('category')
      .eq('id', exerciseId)
      .maybeSingle();

    if (exercise?.category === 'cardio') {
      const data = await fetchAllRows<any>((from, to) =>
        supabaseAdmin
          .from('sets')
          .select('distance_km, duration_seconds, workouts!inner(id, started_at, user_id)')
          .eq('exercise_id', exerciseId)
          .eq('workouts.user_id', userId)
          .eq('is_warmup', false)
          .range(from, to)
      );

      // One point per session: the longest distance covered that session.
      const bestBySession = new Map<
        string,
        { date: string; distance_km: number; duration_seconds: number; pace_min_per_km: number | null }
      >();
      for (const s of data) {
        const distance = s.distance_km || 0;
        const existing = bestBySession.get(s.workouts.id);
        if (!existing || distance > existing.distance_km) {
          bestBySession.set(s.workouts.id, {
            date: s.workouts.started_at,
            distance_km: distance,
            duration_seconds: s.duration_seconds || 0,
            pace_min_per_km: calculatePaceMinPerKm(s.duration_seconds || 0, distance),
          });
        }
      }

      return Array.from(bestBySession.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    const data = await fetchAllRows<any>((from, to) =>
      supabaseAdmin
        .from('sets')
        .select('weight, reps, workouts!inner(id, started_at, user_id)')
        .eq('exercise_id', exerciseId)
        .eq('workouts.user_id', userId)
        .eq('is_warmup', false)
        .range(from, to)
    );

    const bestBySession = new Map<string, { date: string; weight: number; reps: number; estimated_1rm: number }>();
    for (const s of data) {
      const estimated1rm = Math.round(s.weight * (1 + s.reps / 30) * 100) / 100;
      const existing = bestBySession.get(s.workouts.id);
      if (!existing || estimated1rm > existing.estimated_1rm) {
        bestBySession.set(s.workouts.id, {
          date: s.workouts.started_at,
          weight: s.weight,
          reps: s.reps,
          estimated_1rm: estimated1rm,
        });
      }
    }

    return Array.from(bestBySession.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * The current standing record per exercise: since `is_pr` is only set true
   * when a set beat every prior one at the time it was logged, the most
   * recent PR set per exercise is necessarily today's best.
   */
  async getPersonalRecords(userId: string) {
    let data: any[];
    try {
      data = await fetchAllRows((from, to) =>
        supabaseAdmin
          .from('sets')
          .select(
            'weight, reps, distance_km, duration_seconds, exercise_id, exercises!inner(name, user_id, category), workouts!inner(started_at)'
          )
          .eq('exercises.user_id', userId)
          .eq('is_pr', true)
          .range(from, to)
      );
    } catch {
      throw new AppError('Failed to compute personal records');
    }

    const bestByExercise = new Map<string, any>();
    for (const s of data as any[]) {
      const date = s.workouts.started_at;
      const existing = bestByExercise.get(s.exercise_id);
      if (existing && date <= existing.date) continue;

      const category = s.exercises.category;
      const base = { exercise_id: s.exercise_id, exercise_name: s.exercises.name, category, date };

      bestByExercise.set(
        s.exercise_id,
        category === 'cardio'
          ? {
              ...base,
              distance_km: s.distance_km,
              duration_seconds: s.duration_seconds,
              pace_min_per_km: calculatePaceMinPerKm(s.duration_seconds || 0, s.distance_km || 0),
            }
          : {
              ...base,
              weight: s.weight,
              reps: s.reps,
              estimated_1rm: Math.round(s.weight * (1 + s.reps / 30) * 100) / 100,
            }
      );
    }

    return Array.from(bestByExercise.values()).sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));
  }

  /** Exercises with at least one logged set — the Analíticas tab shouldn't list untrained catalog entries. */
  async getTrainedExercises(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('user_exercise_stats')
      .select('exercise_id, name, set_count')
      .eq('user_id', userId)
      .gt('set_count', 0)
      .order('name');

    if (error) throw new AppError('Failed to fetch trained exercises');
    return (data || []).map((e) => ({ id: e.exercise_id, name: e.name, set_count: e.set_count }));
  }
}

export const analyticsService = new AnalyticsService();
