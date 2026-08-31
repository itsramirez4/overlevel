import { supabaseAdmin } from '../config/supabase';
import { Exercise } from '../types';
import { AppError } from '../middleware/errorHandler';
import { fetchAllRows } from '../utils/pagination';

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
   * scoped). */
  async listAll(): Promise<Exercise[]> {
    const data = await fetchAllRows<Exercise>((from, to) =>
      supabaseAdmin
        .from('exercises')
        .select('*')
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
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()
      .maybeSingle();

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
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

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
