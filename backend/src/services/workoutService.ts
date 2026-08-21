import { supabaseAdmin } from '../config/supabase';
import { Workout } from '../types';
import { AppError } from '../middleware/errorHandler';
import { characterService } from './characterService';
import { battleService } from './battleService';
import { routineService } from './routineService';

export class WorkoutService {
  async list(userId: string, limit = 20): Promise<Workout[]> {
    const { data, error } = await supabaseAdmin
      .from('workouts')
      .select('*, sets(*, exercises(name)), routines(name)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw new AppError('Failed to fetch workouts');
    return (data || []) as Workout[];
  }

  async getById(id: string, userId: string): Promise<Workout> {
    const { data, error } = await supabaseAdmin
      .from('workouts')
      .select('*, sets(*, exercises(*)), routines(name)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new AppError('Workout not found', 404);
    return data as Workout;
  }

  async start(userId: string, routineId?: string): Promise<Workout> {
    // Throws 404 if the routine doesn't exist or belongs to someone else —
    // otherwise a guessed/leaked routine id would get embedded in this
    // workout and leak that other account's routine name back via getById/list.
    if (routineId) await routineService.getById(routineId, userId);

    const { data, error } = await supabaseAdmin
      .from('workouts')
      .insert({
        user_id: userId,
        routine_id: routineId,
        started_at: new Date().toISOString(),
      })
      // Same routines(name) embed as getById — the complete-workout dialog
      // prefills its title from this, so a routine-based session needs the
      // name available right away, not just after a later refetch.
      .select('*, routines(name)')
      .single();

    if (error || !data) throw new AppError('Failed to start workout');
    return data as Workout;
  }

  async complete(
    id: string,
    userId: string,
    updates: Partial<Workout>
  ): Promise<Workout & { xp_award?: { xpGained: number; leveledUp: boolean; previousLevel: number; newLevel: number } }> {
    const { data: existing } = await supabaseAdmin
      .from('workouts')
      .select('started_at, completed_at')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) throw new AppError('Workout not found', 404);
    // Without this, re-calling complete on an already-completed workout
    // would re-award XP every time (characterService.awardXpForWorkout has
    // no idempotency check of its own) — free, unlimited leveling.
    if (existing.completed_at) throw new AppError('Workout already completed', 400);

    const completedAt = new Date();
    const durationMinutes = Math.round(
      (completedAt.getTime() - new Date(existing.started_at).getTime()) / 60000
    );

    const { data, error } = await supabaseAdmin
      .from('workouts')
      .update({ ...updates, completed_at: completedAt.toISOString(), duration_minutes: durationMinutes })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to complete workout');

    // No-op (returns null) if the user hasn't created a character — the RPG
    // layer is additive and never required for the tracker itself to work.
    const xpAward = await characterService.awardXpForWorkout(userId, id);

    // The kill guarantee: whatever HP any battle from this workout has left,
    // finish it off now.
    await battleService.finishForWorkout(id, userId);

    return { ...(data as Workout), xp_award: xpAward || undefined };
  }

  /** Editing title/notes/felt_like after the fact — deliberately separate from
   * complete() so it never touches completed_at/duration_minutes. */
  async update(id: string, userId: string, updates: Partial<Workout>): Promise<Workout> {
    // .maybeSingle(), not .single() — same reasoning as workoutService's
    // sibling update-by-ownership methods elsewhere: zero rows matched
    // (not-owned/nonexistent) shouldn't collapse into a generic 500.
    const { data, error } = await supabaseAdmin
      .from('workouts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw new AppError('Failed to update workout');
    if (!data) throw new AppError('Workout not found', 404);
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
