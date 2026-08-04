import { supabaseAdmin } from '../config/supabase';
import { Set } from '../types';
import { AppError } from '../middleware/errorHandler';

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
   * A set is a PR when it beats every other set of this exercise on weight,
   * or ties the best weight with more reps than that set achieved.
   */
  private async computeIsPr(
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
      .eq('workouts.user_id', userId);

    if (excludeSetId) query = query.neq('id', excludeSetId);

    const { data: priorBest } = await query
      .order('weight', { ascending: false })
      .order('reps', { ascending: false })
      .limit(1)
      .maybeSingle();

    return !priorBest || weight > priorBest.weight || (weight === priorBest.weight && reps > priorBest.reps);
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

  async log(userId: string, input: Partial<Set>): Promise<Set> {
    await this.assertWorkoutOwnership(input.workout_id!, userId);

    const { data: exercise } = await supabaseAdmin
      .from('exercises')
      .select('id')
      .eq('id', input.exercise_id)
      .eq('user_id', userId)
      .single();

    if (!exercise) throw new AppError('Exercise not found', 404);

    const isPr = await this.computeIsPr(input.exercise_id!, userId, input.weight!, input.reps!);

    const { data, error } = await supabaseAdmin
      .from('sets')
      .insert({ ...input, is_pr: isPr })
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to log set');
    return data as Set;
  }

  async update(id: string, userId: string, updates: Partial<Set>): Promise<Set> {
    const { data: existing } = await supabaseAdmin
      .from('sets')
      .select('*, workouts!inner(user_id)')
      .eq('id', id)
      .eq('workouts.user_id', userId)
      .single();

    if (!existing) throw new AppError('Set not found', 404);

    const nextWeight = updates.weight ?? existing.weight;
    const nextReps = updates.reps ?? existing.reps;

    const isPr =
      updates.weight !== undefined || updates.reps !== undefined
        ? await this.computeIsPr(existing.exercise_id, userId, nextWeight, nextReps, id)
        : existing.is_pr;

    const { data, error } = await supabaseAdmin
      .from('sets')
      .update({ ...updates, is_pr: isPr })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to update set');
    return data as Set;
  }

  async remove(id: string, userId: string): Promise<void> {
    const { data: set } = await supabaseAdmin
      .from('sets')
      .select('id, workouts!inner(user_id)')
      .eq('id', id)
      .eq('workouts.user_id', userId)
      .single();

    if (!set) throw new AppError('Set not found', 404);

    const { error } = await supabaseAdmin.from('sets').delete().eq('id', id);
    if (error) throw new AppError('Failed to delete set');
  }
}

export const setService = new SetService();
