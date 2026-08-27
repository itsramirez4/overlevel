import { supabaseAdmin } from '../config/supabase';
import { Set } from '../types';
import { AppError } from '../middleware/errorHandler';
import { battleService, ExerciseBattle } from './battleService';
import { fetchAllRows } from '../utils/pagination';
import { calculateSetEffort, ExerciseCategory } from '../utils/calculations';

/**
 * A set is a PR when it beats every other set of this exercise. Strength: on
 * weight, or ties the best weight with more reps. Cardio: on distance, or
 * ties the best distance in less time (faster pace over the same ground).
 * Exported so bulk-insert paths (e.g. CSV import) can reuse the exact same
 * rule without paying for a per-row workout-ownership round trip.
 */
export async function computeSetIsPr(
  exerciseId: string,
  userId: string,
  category: ExerciseCategory,
  weight: number | undefined,
  reps: number | undefined,
  distanceKm: number | undefined,
  durationSeconds: number | undefined,
  excludeSetId?: string
): Promise<boolean> {
  let query = supabaseAdmin
    .from('sets')
    .select('weight, reps, distance_km, duration_seconds, workouts!inner(user_id)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.user_id', userId)
    .eq('is_warmup', false);

  if (excludeSetId) query = query.neq('id', excludeSetId);

  if (category === 'cardio') {
    const { data: priorBest } = await query
      .order('distance_km', { ascending: false, nullsFirst: false })
      .order('duration_seconds', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (!priorBest) return true;
    const dist = distanceKm || 0;
    const priorDist = priorBest.distance_km || 0;
    if (dist !== priorDist) return dist > priorDist;
    return (durationSeconds ?? Infinity) < (priorBest.duration_seconds ?? Infinity);
  }

  const { data: priorBest } = await query
    .order('weight', { ascending: false, nullsFirst: false })
    .order('reps', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const w = weight || 0;
  const r = reps || 0;
  return !priorBest || w > (priorBest.weight || 0) || (w === (priorBest.weight || 0) && r > (priorBest.reps || 0));
}

/**
 * computeSetIsPr only checks a set against whatever else already exists —
 * correct for a brand-new set (nothing later can exist yet), but editing or
 * deleting an *older* set can change which sets after it were genuinely PRs
 * at the time. Recomputes is_pr for the whole exercise history in true
 * chronological order so it stays consistent no matter what got edited.
 */
export async function recomputeIsPrForExercise(exerciseId: string, userId: string): Promise<void> {
  const { data: exercise } = await supabaseAdmin
    .from('exercises')
    .select('category')
    .eq('id', exerciseId)
    .maybeSingle();
  const category: ExerciseCategory = exercise?.category || 'compound';

  const data = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('sets')
      .select(
        'id, weight, reps, distance_km, duration_seconds, is_warmup, is_pr, set_number, workouts!inner(started_at, user_id)'
      )
      .eq('exercise_id', exerciseId)
      .eq('workouts.user_id', userId)
      .range(from, to)
  );

  const sorted = data
    .filter((s) => !s.is_warmup)
    .sort((a, b) => {
      const dateDiff = new Date(a.workouts.started_at).getTime() - new Date(b.workouts.started_at).getTime();
      return dateDiff !== 0 ? dateDiff : a.set_number - b.set_number;
    });

  const changed: { id: string; is_pr: boolean }[] = [];

  if (category === 'cardio') {
    let bestDistance = -Infinity;
    let bestDuration = Infinity;
    for (const s of sorted) {
      const dist = s.distance_km || 0;
      const dur = s.duration_seconds ?? Infinity;
      const isPr = dist > bestDistance || (dist === bestDistance && dur < bestDuration);
      if (isPr) {
        bestDistance = dist;
        bestDuration = dur;
      }
      if (isPr !== s.is_pr) changed.push({ id: s.id, is_pr: isPr });
    }
  } else {
    let bestWeight = -Infinity;
    let bestReps = -Infinity;
    for (const s of sorted) {
      const w = s.weight || 0;
      const r = s.reps || 0;
      const isPr = w > bestWeight || (w === bestWeight && r > bestReps);
      if (isPr) {
        bestWeight = w;
        bestReps = r;
      }
      if (isPr !== s.is_pr) changed.push({ id: s.id, is_pr: isPr });
    }
  }

  await Promise.all(changed.map((s) => supabaseAdmin.from('sets').update({ is_pr: s.is_pr }).eq('id', s.id)));
}

export class SetService {
  private async assertWorkoutOwnership(workoutId: string, userId: string): Promise<void> {
    const { data } = await supabaseAdmin
      .from('workouts')
      .select('id')
      .eq('id', workoutId)
      .eq('user_id', userId)
      .single();

    if (!data) throw new AppError('Workout not found', 404);
  }

  /**
   * A completed workout can still be edited (add/edit/delete sets, even
   * whole exercises) after the fact — it just doesn't re-fight battles or
   * re-award XP, both of which only ever happen once, at completion time.
   * `log()` uses the returned completed_at to skip battleService entirely
   * for that case: applying damage post-completion would either silently
   * create a new exercise_battles row that complete_workout() (migration
   * 031) already ran and will never finish again, or land a hit on a battle
   * that's already a defeated one-way ratchet.
   */
  private async getWorkoutForLog(workoutId: string, userId: string): Promise<{ completed_at: string | null }> {
    const { data } = await supabaseAdmin
      .from('workouts')
      .select('id, completed_at')
      .eq('id', workoutId)
      .eq('user_id', userId)
      .single();

    if (!data) throw new AppError('Workout not found', 404);
    return data;
  }

  async listByWorkout(workoutId: string, userId: string): Promise<Set[]> {
    await this.assertWorkoutOwnership(workoutId, userId);

    const { data, error } = await supabaseAdmin
      .from('sets')
      .select('*')
      .eq('workout_id', workoutId)
      .order('set_number');

    if (error) throw new AppError('Failed to fetch sets');
    return (data || []) as Set[];
  }

  async log(userId: string, input: Partial<Set>): Promise<Set & { battle?: ExerciseBattle }> {
    const workout = await this.getWorkoutForLog(input.workout_id!, userId);

    const { data: exercise } = await supabaseAdmin
      .from('exercises')
      .select('id, category')
      .eq('id', input.exercise_id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (!exercise) throw new AppError('Exercise not found', 404);

    const category: ExerciseCategory = exercise.category;
    if (category === 'cardio') {
      if (!input.duration_seconds || !input.distance_km) {
        throw new AppError('Los ejercicios de cardio necesitan duración y distancia', 400);
      }
    } else if (!input.weight || !input.reps) {
      throw new AppError('Este ejercicio necesita peso y repeticiones', 400);
    }

    const isPr = input.is_warmup
      ? false
      : await computeSetIsPr(
          input.exercise_id!,
          userId,
          category,
          input.weight,
          input.reps,
          input.distance_km,
          input.duration_seconds
        );

    const { data, error } = await supabaseAdmin
      .from('sets')
      .insert({ ...input, is_pr: isPr })
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to log set');

    // Warmups don't land hits, and neither does editing a workout after the
    // fact — battles only fight during the live session (see getWorkoutForLog).
    const battle = input.is_warmup || workout.completed_at
      ? undefined
      : await battleService.applyDamage(
          input.workout_id!,
          input.exercise_id!,
          userId,
          calculateSetEffort(category, input.weight, input.reps, input.distance_km),
          category
        );

    return { ...(data as Set), battle };
  }

  async update(id: string, userId: string, updates: Partial<Set>): Promise<Set> {
    const { data: existing } = await supabaseAdmin
      .from('sets')
      .select('*, workouts!inner(user_id)')
      .eq('id', id)
      .eq('workouts.user_id', userId)
      .single();

    if (!existing) throw new AppError('Set not found', 404);

    const nextIsWarmup = updates.is_warmup ?? existing.is_warmup;
    const affectsRanking =
      updates.weight !== undefined ||
      updates.reps !== undefined ||
      updates.duration_seconds !== undefined ||
      updates.distance_km !== undefined ||
      updates.is_warmup !== undefined;

    const { data, error } = await supabaseAdmin
      .from('sets')
      .update({ ...updates, is_pr: nextIsWarmup ? false : existing.is_pr })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to update set');

    // Editing weight/reps/warmup status on this set can change whether
    // later sets of the same exercise still count as PRs, not just this one.
    if (affectsRanking) {
      await recomputeIsPrForExercise(existing.exercise_id, userId);
      const { data: refreshed } = await supabaseAdmin.from('sets').select('*').eq('id', id).single();
      return (refreshed || data) as Set;
    }

    return data as Set;
  }

  /**
   * The last time this exercise was trained (excluding the in-progress
   * workout, if any) — shown while logging so the previous session's numbers
   * are visible without leaving the screen.
   */
  async getLastSession(exerciseId: string, userId: string, excludeWorkoutId?: string) {
    let query = supabaseAdmin
      .from('sets')
      .select('workout_id, set_number, weight, reps, duration_seconds, distance_km, rpe, workouts!inner(started_at, user_id)')
      .eq('exercise_id', exerciseId)
      .eq('workouts.user_id', userId)
      .eq('is_warmup', false);

    if (excludeWorkoutId) query = query.neq('workout_id', excludeWorkoutId);

    // PostgREST's foreignTable ordering only sorts *within* an embedded
    // resource — since sets→workouts is many-to-one, it can't reorder the
    // outer rows by the related workout's date, so we sort client-side
    // instead. 500 comfortably covers even a very frequently trained
    // exercise's full history while staying under the project's row cap.
    const { data, error } = await query.limit(500);

    if (error) throw new AppError('Failed to fetch last session');
    if (!data || data.length === 0) return null;

    const sorted = (data as any[]).sort(
      (a, b) => new Date(b.workouts.started_at).getTime() - new Date(a.workouts.started_at).getTime()
    );

    const lastWorkoutId = sorted[0].workout_id;
    const sets = sorted
      .filter((s) => s.workout_id === lastWorkoutId)
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({
        set_number: s.set_number,
        weight: s.weight,
        reps: s.reps,
        duration_seconds: s.duration_seconds,
        distance_km: s.distance_km,
        rpe: s.rpe,
      }));

    return { date: sorted[0].workouts.started_at, sets };
  }

  async remove(id: string, userId: string): Promise<void> {
    const { data: set } = await supabaseAdmin
      .from('sets')
      .select('id, exercise_id, is_warmup, workouts!inner(user_id)')
      .eq('id', id)
      .eq('workouts.user_id', userId)
      .single();

    if (!set) throw new AppError('Set not found', 404);

    const { error } = await supabaseAdmin.from('sets').delete().eq('id', id);
    if (error) throw new AppError('Failed to delete set');

    // Removing a set can change which of the remaining ones were genuinely
    // PRs at the time (e.g. deleting the current record un-hides whichever
    // set was the real best before it).
    if (!set.is_warmup) {
      await recomputeIsPrForExercise(set.exercise_id, userId);
    }
  }
}

export const setService = new SetService();
