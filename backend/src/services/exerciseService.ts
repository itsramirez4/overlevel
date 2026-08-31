import { supabaseAdmin } from '../config/supabase';
import { Exercise } from '../types';
import { AppError } from '../middleware/errorHandler';
import { fetchAllRows } from '../utils/pagination';
import { isAdmin } from '../utils/admin';

export class ExerciseService {
  // Not bounded by a workout/time range — a user with a large exercise
  // catalog could otherwise hit PostgREST's 1000-row response cap and have
  // this silently truncate instead of erroring. See utils/pagination.ts.
  async list(userId: string): Promise<Exercise[]> {
    const data = await fetchAllRows<Exercise>((from, to) =>
      supabaseAdmin
        .from('exercises')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('name')
        .range(from, to)
    );

    return data;
  }

  /** Every user's exercises — for picking/using one, not for managing your
   * own catalog (that's list()). Anyone can log a set or build a routine
   * with an exercise someone else created; only its creator can edit,
   * trash, or delete it (see update/remove/restore below, still user-id
   * scoped). Embeds the creator's username so the picker can show "creado
   * por @x" for anything that isn't the caller's own. */
  async listAll(): Promise<Exercise[]> {
    const data = await fetchAllRows<Exercise>((from, to) =>
      supabaseAdmin
        .from('exercises')
        .select('*, users(username)')
        .is('deleted_at', null)
        .order('name')
        .range(from, to)
    );

    return data;
  }

  async getById(id: string, userId: string): Promise<Exercise> {
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !data) throw new AppError('Exercise not found', 404);
    return data as Exercise;
  }

  async listTrash(userId: string): Promise<Exercise[]> {
    const data = await fetchAllRows<Exercise>((from, to) =>
      supabaseAdmin
        .from('exercises')
        .select('*')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .range(from, to)
    );

    return data;
  }

  async create(userId: string, input: Partial<Exercise>): Promise<Exercise> {
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        throw new AppError(`Ya tienes un ejercicio llamado "${input.name}"`, 409);
      }
      throw new AppError('Failed to create exercise');
    }
    return data as Exercise;
  }

  async update(id: string, userId: string, updates: Partial<Exercise>): Promise<Exercise> {
    // .maybeSingle(), not .single() — a not-owned/nonexistent/trashed id
    // matches zero rows, which .single() itself treats as an error with no
    // way to tell it apart from a real failure, collapsing to a generic 500
    // instead of the 404 this actually is.
    let query = supabaseAdmin.from('exercises').update(updates).eq('id', id).is('deleted_at', null);
    // Admins can moderate anyone's exercise — everyone can already use any
    // exercise (see setService/routineService), so a bad name/category is a
    // shared-visibility problem, not just its creator's.
    if (!isAdmin(userId)) query = query.eq('user_id', userId);
    const { data, error } = await query.select().maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw new AppError(`Ya tienes un ejercicio llamado "${updates.name}"`, 409);
      }
      throw new AppError('Failed to update exercise');
    }
    if (!data) throw new AppError('Exercise not found', 404);
    return data as Exercise;
  }

  /** Moves to the trash — the exercise, and everything that references it
   * (sets, routine slots, battles), stays intact and comes back exactly as
   * it was if restored. Only permanentlyDelete() actually destroys data. */
  async remove(id: string, userId: string): Promise<void> {
    let query = supabaseAdmin
      .from('exercises')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);
    if (!isAdmin(userId)) query = query.eq('user_id', userId);
    const { data, error } = await query.select('id').maybeSingle();

    if (error) throw new AppError('Failed to delete exercise');
    if (!data) throw new AppError('Exercise not found', 404);
  }

  async restore(id: string, userId: string): Promise<Exercise> {
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .update({ deleted_at: null })
      .eq('id', id)
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .select()
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        throw new AppError('Ya tienes un ejercicio activo con ese nombre — cambia su nombre antes de restaurar este', 409);
      }
      throw new AppError('Exercise not found in trash', 404);
    }
    return data as Exercise;
  }

  /**
   * Admin-only (gated by adminOnlyMiddleware at the route, not re-checked
   * here). Absorbs `loserId` into `survivorId`: every set and routine slot
   * that referenced the loser now references the survivor, and the loser
   * is soft-deleted — recoverable from trash like any other delete, in
   * case two exercises turn out not to actually be duplicates.
   *
   * Battles are trickier — exercise_battles has a UNIQUE(workout_id,
   * exercise_id), so a workout that already has a battle against *both*
   * the loser and the survivor can't just have the loser's repointed onto
   * the survivor's slot. Its HP/defeated state isn't worth reconciling for
   * what's a cosmetic gameplay detail, so those just get dropped in favor
   * of the survivor's own battle for that workout.
   */
  async merge(loserId: string, survivorId: string): Promise<Exercise> {
    if (loserId === survivorId) throw new AppError('No se puede fusionar un ejercicio consigo mismo', 400);

    const { data: both } = await supabaseAdmin
      .from('exercises')
      .select('id')
      .in('id', [loserId, survivorId])
      .is('deleted_at', null);
    if (!both || both.length !== 2) throw new AppError('Exercise not found', 404);

    const [{ data: loserBattles }, { data: survivorBattles }] = await Promise.all([
      supabaseAdmin.from('exercise_battles').select('id, workout_id').eq('exercise_id', loserId),
      supabaseAdmin.from('exercise_battles').select('workout_id').eq('exercise_id', survivorId),
    ]);
    const survivorWorkoutIds = new Set((survivorBattles || []).map((b) => b.workout_id));
    const battlesToRepoint = (loserBattles || []).filter((b) => !survivorWorkoutIds.has(b.workout_id)).map((b) => b.id);
    const battlesToDrop = (loserBattles || []).filter((b) => survivorWorkoutIds.has(b.workout_id)).map((b) => b.id);

    await Promise.all([
      battlesToRepoint.length > 0
        ? supabaseAdmin.from('exercise_battles').update({ exercise_id: survivorId }).in('id', battlesToRepoint)
        : Promise.resolve(),
      battlesToDrop.length > 0
        ? supabaseAdmin.from('exercise_battles').delete().in('id', battlesToDrop)
        : Promise.resolve(),
      supabaseAdmin.from('sets').update({ exercise_id: survivorId }).eq('exercise_id', loserId),
      supabaseAdmin.from('routine_exercises').update({ exercise_id: survivorId }).eq('exercise_id', loserId),
    ]);

    const { data: merged, error } = await supabaseAdmin
      .from('exercises')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', loserId)
      .select()
      .single();

    if (error || !merged) throw new AppError('Failed to merge exercise');
    return merged as Exercise;
  }

  /** Real, irreversible delete — only reachable for something already in the
   * trash, so it's always a deliberate second step, never an accidental one. */
  async permanentlyDelete(id: string, userId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .select('id')
      .maybeSingle();

    if (error) throw new AppError('Failed to permanently delete exercise');
    if (!data) throw new AppError('Exercise not found in trash', 404);
  }
}

export const exerciseService = new ExerciseService();
