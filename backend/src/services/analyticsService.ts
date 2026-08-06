import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { fetchAllRows } from '../utils/pagination';

export class AnalyticsService {
  async getSummary(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthWorkouts, error } = await supabaseAdmin
      .from('workouts')
      .select('id, sets(weight, reps, is_warmup)')
      .eq('user_id', userId)
      .gte('started_at', startOfMonth.toISOString());

    if (error) throw new AppError('Failed to compute analytics summary');

    const workoutsThisMonth = monthWorkouts?.length || 0;
    const totalVolume = (monthWorkouts || []).reduce((sum, w: any) => {
      const workoutVolume = (w.sets || [])
        .filter((s: any) => !s.is_warmup)
        .reduce((setSum: number, s: any) => setSum + s.weight * s.reps, 0);
      return sum + workoutVolume;
    }, 0);

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
  private async getCurrentStreak(userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('workouts')
      .select('started_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(400);

    if (error) throw new AppError('Failed to compute streak');

    const workoutDays = new Set((data || []).map((w) => new Date(w.started_at).toISOString().split('T')[0]));

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
    const today = dayNames[new Date().getDay()];

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
      .select('started_at, sets(weight, reps, is_warmup)')
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
      const volume = (w.sets || [])
        .filter((s: any) => !s.is_warmup)
        .reduce((sum: number, s: any) => sum + s.weight * s.reps, 0);
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
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const { data: workouts, error } = await supabaseAdmin
      .from('workouts')
      .select('sets(weight, reps, is_warmup, exercises(muscle_groups))')
      .eq('user_id', userId)
      .gte('started_at', since.toISOString());

    if (error) throw new AppError('Failed to compute muscle group distribution');

    const totals = new Map<string, number>();
    for (const w of workouts || []) {
      for (const s of (w as any).sets || []) {
        if (s.is_warmup) continue;
        const volume = s.weight * s.reps;
        const groups: string[] = s.exercises?.muscle_groups?.length
          ? s.exercises.muscle_groups
          : ['Sin clasificar'];
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
      .select('started_at, sets(weight, reps, is_warmup)')
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
      const volume = (w.sets || [])
        .filter((s: any) => !s.is_warmup)
        .reduce((sum: number, s: any) => sum + s.weight * s.reps, 0);
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
    const { data, error } = await supabaseAdmin
      .from('sets')
      .select('weight, reps, workouts!inner(id, started_at, user_id)')
      .eq('exercise_id', exerciseId)
      .eq('workouts.user_id', userId)
      .eq('is_warmup', false);

    if (error) throw new AppError('Failed to compute exercise progress');

    const bestBySession = new Map<string, { date: string; weight: number; reps: number; estimated_1rm: number }>();
    for (const s of (data || []) as any[]) {
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
          .select('weight, reps, exercise_id, exercises!inner(name, user_id), workouts!inner(started_at)')
          .eq('exercises.user_id', userId)
          .eq('is_pr', true)
          .range(from, to)
      );
    } catch {
      throw new AppError('Failed to compute personal records');
    }

    const bestByExercise = new Map<
      string,
      { exercise_id: string; exercise_name: string; weight: number; reps: number; estimated_1rm: number; date: string }
    >();
    for (const s of data as any[]) {
      const date = s.workouts.started_at;
      const existing = bestByExercise.get(s.exercise_id);
      if (!existing || date > existing.date) {
        bestByExercise.set(s.exercise_id, {
          exercise_id: s.exercise_id,
          exercise_name: s.exercises.name,
          weight: s.weight,
          reps: s.reps,
          estimated_1rm: Math.round(s.weight * (1 + s.reps / 30) * 100) / 100,
          date,
        });
      }
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
