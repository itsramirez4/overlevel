import { supabaseAdmin } from '../config/supabase';
import { Workout } from '../types';
import { AppError } from '../middleware/errorHandler';
import { routineService } from './routineService';
import { userService } from './userService';
import { followService } from './followService';
import { recomputeIsPrForExercise } from './setService';
import { fetchAllRows } from '../utils/pagination';

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
   * mid-workout right now. Every one of them, not a capped recent slice —
   * fetchAllRows pages past PostgREST's per-response row cap instead of
   * silently truncating a prolific account's history.
   */
  async listPublic(targetId: string, viewerId: string): Promise<Workout[]> {
    await userService.assertViewable(targetId, viewerId);

    return fetchAllRows<Workout>((from, to) =>
      supabaseAdmin
        .from('workouts')
        .select('*, sets(*, exercises(name)), routines(name)')
        .eq('user_id', targetId)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false })
        .range(from, to)
    );
  }

  /**
   * Recent completed workouts from everyone `userId` follows — the social
   * feed. Re-checks `profile_public` live (not "was public when followed")
   * via the `users!inner` embed filter: an account that's gone private
   * since must disappear from here the same way it disappears from
   * direct-profile viewing, not just freeze at whatever it looked like at
   * follow time.
   */
  async getFeed(userId: string): Promise<(Workout & { character_type: string | null })[]> {
    const followingIds = await followService.getFollowingIds(userId);
    if (followingIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('workouts')
      .select('*, sets(*, exercises(name)), users!inner(username, full_name, profile_public)')
      .in('user_id', followingIds)
      .not('completed_at', 'is', null)
      .eq('users.profile_public', true)
      .order('started_at', { ascending: false })
      .limit(30);

    if (error) throw new AppError('Failed to fetch feed');

    const characterTypes = await userService.getCharacterTypes(followingIds);
    return (data || []).map((w: any) => ({ ...w, character_type: characterTypes[w.user_id] || null }));
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

  /** A single completed workout from someone else's public profile — same
   * visibility gate and "completed only" rule as listPublic, embedding the
   * full sets(exercises) shape so the detail screen needs no separate fetch. */
  async getPublicById(workoutId: string, targetId: string, viewerId: string): Promise<Workout> {
    await userService.assertViewable(targetId, viewerId);

    const { data, error } = await supabaseAdmin
      .from('workouts')
      .select('*, sets(*, exercises(*)), routines(name)')
      .eq('id', workoutId)
      .eq('user_id', targetId)
      .not('completed_at', 'is', null)
      .maybeSingle();

    if (error) throw new AppError('Failed to fetch workout');
    if (!data) throw new AppError('Workout not found', 404);
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

  /** Editing title/notes/felt_like/started_at after the fact — deliberately
   * separate from complete() so it never touches completed_at/duration_minutes
   * (a corrected started_at leaves the already-recorded duration as-is; it's
   * only fixing which day this was logged under, not recomputing anything). */
  async update(id: string, userId: string, updates: Partial<Workout>): Promise<Workout> {
    if (updates.started_at) {
      const startedAt = new Date(updates.started_at);
      if (startedAt.getTime() > Date.now()) {
        throw new AppError('La fecha no puede ser en el futuro', 400);
      }

      const { data: existing, error: existingError } = await supabaseAdmin
        .from('workouts')
        .select('completed_at')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      if (existingError) throw new AppError('Failed to fetch workout');
      if (!existing) throw new AppError('Workout not found', 404);
      if (existing.completed_at && startedAt.getTime() > new Date(existing.completed_at).getTime()) {
        throw new AppError('La fecha no puede ser posterior a cuando terminaste el entrenamiento', 400);
      }
    }

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

    if (error) {
      // workouts_user_started_at_unique (migration 018) — another workout of
      // this user already has that exact timestamp.
      if (error.code === '23505') {
        throw new AppError('Ya tienes otro entrenamiento registrado en esa fecha y hora exacta', 409);
      }
      throw new AppError('Failed to update workout');
    }
    if (!data) throw new AppError('Workout not found', 404);

    // A workout's started_at feeds every exercise's chronological PR
    // ordering (see recomputeIsPrForExercise in setService) — moving it
    // earlier/later than other sessions of the same exercise can change
    // which sets were genuinely PRs, so every exercise this workout
    // touched needs its is_pr flags rechecked, not just this workout's own row.
    if (updates.started_at) {
      const { data: setRows } = await supabaseAdmin.from('sets').select('exercise_id').eq('workout_id', id);
      const exerciseIds = [...new Set((setRows || []).map((s) => s.exercise_id))];
      await Promise.all(exerciseIds.map((exerciseId) => recomputeIsPrForExercise(exerciseId, userId)));
    }

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
