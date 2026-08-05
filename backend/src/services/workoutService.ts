import { supabaseAdmin } from '../config/supabase';
import { Workout } from '../types';
import { AppError } from '../middleware/errorHandler';

export class WorkoutService {
  async list(userId: string, limit = 20): Promise<Workout[]> {
    const { data, error } = await supabaseAdmin
      .from('workouts')
      .select('*, sets(*, exercises(name))')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw new AppError('Failed to fetch workouts');
    return (data || []) as Workout[];
  }

  async getById(id: string, userId: string): Promise<Workout> {
    const { data, error } = await supabaseAdmin
      .from('workouts')
      .select('*, sets(*, exercises(*))')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new AppError('Workout not found', 404);
    return data as Workout;
  }

  async start(userId: string, routineId?: string): Promise<Workout> {
    const { data, error } = await supabaseAdmin
      .from('workouts')
      .insert({
        user_id: userId,
        routine_id: routineId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to start workout');
    return data as Workout;
  }

  async complete(id: string, userId: string, updates: Partial<Workout>): Promise<Workout> {
    const completedAt = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('workouts')
      .update({ ...updates, completed_at: completedAt })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to complete workout');
    return data as Workout;
  }

  async remove(id: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new AppError('Failed to delete workout');
  }
}

export const workoutService = new WorkoutService();
