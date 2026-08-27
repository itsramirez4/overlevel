import { supabaseAdmin } from '../config/supabase';
import { Workout } from '../types';
import { AppError } from '../middleware/errorHandler';
import { routineService } from './routineService';
import { userService } from './userService';

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

  /**
   * Another user's completed workouts, for their public profile — gated by
   * the same assertViewable rule as the profile itself (own account, or a
   * public one). Only completed ones: an in-progress session isn't really
   * "content" to show on a profile, and showing it would leak that they're
   * mid-workout right now.
   */
  async listPublic(targetId: string, viewerId: string, limit = 20): Promise<Workout[]> {
    await userService.assertViewable(targetId, viewerId);

    const { data, error } = await supabaseAdmin
      .from('workouts')
      .select('*, sets(*, exercises(name)), routines(name)')
      .eq('user_id', targetId)
      .not('completed_at', 'is', null)
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

  async start(userId: string, routineId?: string): Promise<Workout & { resumed?: boolean }> {
    // Idempotent: if the user already has an incomplete workout, return it
    // instead of creating a new one. Without this, nothing server-side ever
    // guarded against starting a second one — if the client's local
    // "current workout" state was ever lost (reinstall, storage cleared, a
    // crash before it persisted), the old one became permanently orphaned:
    // stuck with completed_at null forever, still counted in
    // workouts_this_month, still showing in "recent workouts" as a
    // confusing "0 sets" entry, with no UI path anywhere that could ever
    // call complete() on it again. Embeds sets(exercises) same as getById
    // so the caller can rebuild its session-exercise list from what's
    // already logged, not just show a blank "no exercises yet" screen.
    const { data: existing } = await supabaseAdmin
      .from('workouts')
      .select('*, sets(*, exercises(*)), routines(name)')
      .eq('user_id', userId)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) return { ...(existing as Workout), resumed: true };

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
    // Marking the workout complete, awarding XP, and finishing battles all
    // happen inside complete_workout() (see migration 031) as one Postgres
    // transaction — either the whole thing lands or none of it does, so
    // there's no partial-failure state to detect or resume here anymore.
    const { data, error } = await supabaseAdmin.rpc('complete_workout', {
      p_workout_id: id,
      p_user_id: userId,
      p_title: updates.title ?? null,
      p_notes: updates.notes ?? null,
      p_felt_like: updates.felt_like ?? null,
    });

    if (error) {
      if (error.message?.includes('WORKOUT_NOT_FOUND')) throw new AppError('Workout not found', 404);
      if (error.message?.includes('WORKOUT_ALREADY_COMPLETED')) throw new AppError('Workout already completed', 400);
      throw new AppError('Failed to complete workout');
    }

    return { ...(data.workout as Workout), xp_award: data.xp_award || undefined };
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
    // .select() + a row-found check, same as exercises/routines' remove() —
    // without it, deleting a nonexistent/not-owned id silently "succeeds"
    // instead of 404ing, masking bugs that every sibling endpoint would catch.
    const { data, error } = await supabaseAdmin
      .from('workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw new AppError('Failed to delete workout');
    if (!data) throw new AppError('Workout not found', 404);
  }
}

export const workoutService = new WorkoutService();
