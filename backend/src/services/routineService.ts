import { supabaseAdmin } from '../config/supabase';
import { Routine, RoutineExercise } from '../types';
import { AppError } from '../middleware/errorHandler';
import { fetchAllRows } from '../utils/pagination';

export class RoutineService {
  // Not bounded by a workout/time range — a user with a lot of routines
  // could otherwise hit PostgREST's 1000-row response cap and have this
  // silently truncate instead of erroring. See utils/pagination.ts.
  async list(userId: string): Promise<Routine[]> {
    const data = await fetchAllRows<Routine>((from, to) =>
      supabaseAdmin
        .from('routines')
        .select('*, routine_exercises(*, exercises(*))')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    return data;
  }

  async getById(id: string, userId: string): Promise<Routine> {
    const { data, error } = await supabaseAdmin
      .from('routines')
      .select('*, routine_exercises(*, exercises(*))')
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !data) throw new AppError('Routine not found', 404);
    return data as Routine;
  }

  async listTrash(userId: string): Promise<Routine[]> {
    const data = await fetchAllRows<Routine>((from, to) =>
      supabaseAdmin
        .from('routines')
        .select('*')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .range(from, to)
    );

    return data;
  }

  async create(userId: string, input: Partial<Routine>): Promise<Routine> {
    const { data, error } = await supabaseAdmin
      .from('routines')
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to create routine');
    return data as Routine;
  }

  async update(id: string, userId: string, updates: Partial<Routine>): Promise<Routine> {
    // .maybeSingle(), not .single() — a not-owned/nonexistent id matches
    // zero rows, which .single() treats as an error indistinguishable from
    // a real failure, collapsing what should be a 404 into a generic 500.
    const { data, error } = await supabaseAdmin
      .from('routines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()
      .maybeSingle();

    if (error) throw new AppError('Failed to update routine');
    if (!data) throw new AppError('Routine not found', 404);
    return data as Routine;
  }

  /** Moves to the trash — the routine and its routine_exercises stay intact
   * and come back exactly as they were if restored. Only permanentlyDelete()
   * actually destroys data. */
  async remove(id: string, userId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('routines')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error) throw new AppError('Failed to delete routine');
    if (!data) throw new AppError('Routine not found', 404);
  }

  async restore(id: string, userId: string): Promise<Routine> {
    const { data, error } = await supabaseAdmin
      .from('routines')
      .update({ deleted_at: null })
      .eq('id', id)
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .select()
      .maybeSingle();

    if (error) throw new AppError('Failed to restore routine');
    if (!data) throw new AppError('Routine not found in trash', 404);
    return data as Routine;
  }

  /** Real, irreversible delete — only reachable for something already in the
   * trash, so it's always a deliberate second step, never an accidental one. */
  async permanentlyDelete(id: string, userId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('routines')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .select('id')
      .maybeSingle();

    if (error) throw new AppError('Failed to permanently delete routine');
    if (!data) throw new AppError('Routine not found in trash', 404);
  }

  async addExercise(
    routineId: string,
    userId: string,
    input: Partial<RoutineExercise>
  ): Promise<RoutineExercise> {
    // The routine must belong to this user; the exercise itself doesn't —
    // exercises are shared, so building a routine around one someone else
    // created is expected, same as logging a set against it.
    const routine = await this.getById(routineId, userId);

    const { data: exercise } = await supabaseAdmin
      .from('exercises')
      .select('id')
      .eq('id', input.exercise_id)
      .is('deleted_at', null)
      .single();

    if (!exercise) throw new AppError('Exercise not found', 404);

    // Computed server-side rather than trusting a client-supplied order_num —
    // nothing enforces uniqueness at the DB level, so two clients (or one
    // buggy one) could otherwise hand out the same order_num within a routine.
    const existingOrders = ((routine as any).routine_exercises || []).map((re: any) => re.order_num || 0);
    const nextOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;

    const { data, error } = await supabaseAdmin
      .from('routine_exercises')
      .insert({ ...input, order_num: nextOrder, routine_id: routineId })
      .select('*, exercises(*)')
      .single();

    if (error || !data) throw new AppError('Failed to add exercise to routine');
    return data as RoutineExercise;
  }

  async removeExercise(routineId: string, userId: string, routineExerciseId: string): Promise<void> {
    await this.getById(routineId, userId);

    const { error } = await supabaseAdmin
      .from('routine_exercises')
      .delete()
      .eq('id', routineExerciseId)
      .eq('routine_id', routineId);

    if (error) throw new AppError('Failed to remove exercise from routine');
  }

  async reorderExercises(routineId: string, userId: string, orderedIds: string[]): Promise<void> {
    await this.getById(routineId, userId);

    const results = await Promise.all(
      orderedIds.map((routineExerciseId, index) =>
        supabaseAdmin
          .from('routine_exercises')
          .update({ order_num: index + 1 })
          .eq('id', routineExerciseId)
          .eq('routine_id', routineId)
      )
    );

    // Otherwise a partial failure (one update hits a transient DB error)
    // leaves the routine's ordering half-applied while the client, seeing a
    // 204, has no idea it needs to retry.
    if (results.some((r) => r.error)) throw new AppError('Failed to reorder exercises');
  }
}

export const routineService = new RoutineService();
