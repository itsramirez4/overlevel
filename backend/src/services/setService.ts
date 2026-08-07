import { supabaseAdmin } from '../config/supabase';
import { Set } from '../types';
import { AppError } from '../middleware/errorHandler';
import { battleService, ExerciseBattle } from './battleService';
import { fetchAllRows } from '../utils/pagination';

/**
 * A set is a PR when it beats every other set of this exercise on weight,
 * or ties the best weight with more reps than that set achieved.
 * Exported so bulk-insert paths (e.g. CSV import) can reuse the exact same
 * rule without paying for a per-row workout-ownership round trip.
 */
export async function computeSetIsPr(
  exerciseId: string,
  userId: string,
  weight: number,
  reps: number,
  excludeSetId?: string
): Promise<boolean> {
  let query = supabaseAdmin
    .from('sets')
    .select('weight, reps, workouts!inner(user_id)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.user_id', userId)
    .eq('is_warmup', false);

  if (excludeSetId) query = query.neq('id', excludeSetId);

  const { data: priorBest } = await query
    .order('weight', { ascending: false })
    .order('reps', { ascending: false })
    .limit(1)
    .maybeSingle();

  return !priorBest || weight > priorBest.weight || (weight === priorBest.weight && reps > priorBest.reps);
}

/**
 * computeSetIsPr only checks a set against whatever else already exists —
 * correct for a brand-new set (nothing later can exist yet), but editing or
 * deleting an *older* set can change which sets after it were genuinely PRs
 * at the time. Recomputes is_pr for the whole exercise history in true
 * chronological order so it stays consistent no matter what got edited.
 */
export async function recomputeIsPrForExercise(exerciseId: string, userId: string): Promise<void> {
  const data = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('sets')
      .select('id, weight, reps, is_warmup, is_pr, set_number, workouts!inner(started_at, user_id)')
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

  let bestWeight = -Infinity;
  let bestReps = -Infinity;
  const changed: { id: string; is_pr: boolean }[] = [];

  for (const s of sorted) {
    const isPr = s.weight > bestWeight || (s.weight === bestWeight && s.reps > bestReps);
    if (isPr) {
      bestWeight = s.weight;
      bestReps = s.reps;
    }
    if (isPr !== s.is_pr) changed.push({ id: s.id, is_pr: isPr });
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
   * Logging a set on an already-completed workout would silently create a
   * new exercise_battles row that nothing ever finishes again (finishForWorkout
   * already ran) — it'd sit forever un-defeated in that workout's battle list.
   */
  private async assertWorkoutWritable(workoutId: string, userId: string): Promise<void> {
    const { data } = await supabaseAdmin
      .from('workouts')
      .select('id, completed_at')
      .eq('id', workoutId)
      .eq('user_id', userId)
      .single();

    if (!data) throw new AppError('Workout not found', 404);
    if (data.completed_at) throw new AppError('No se pueden añadir series a un entrenamiento ya finalizado', 400);
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
    await this.assertWorkoutWritable(input.workout_id!, userId);

    const { data: exercise } = await supabaseAdmin
      .from('exercises')
      .select('id')
      .eq('id', input.exercise_id)
      .eq('user_id', userId)
      .single();

    if (!exercise) throw new AppError('Exercise not found', 404);

    const isPr = input.is_warmup
      ? false
      : await computeSetIsPr(input.exercise_id!, userId, input.weight!, input.reps!);

    const { data, error } = await supabaseAdmin
      .from('sets')
      .insert({ ...input, is_pr: isPr })
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to log set');

    // Warmups don't land hits — no-op if the exercise doesn't have a battle yet either.
    const battle = input.is_warmup
      ? undefined
      : await battleService.applyDamage(input.workout_id!, input.exercise_id!, userId, input.weight!, input.reps!);

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
      updates.weight !== undefined || updates.reps !== undefined || updates.is_warmup !== undefined;

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
      .select('workout_id, set_number, weight, reps, rpe, workouts!inner(started_at, user_id)')
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
      .map((s) => ({ set_number: s.set_number, weight: s.weight, reps: s.reps, rpe: s.rpe }));

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
