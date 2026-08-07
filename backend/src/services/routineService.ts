import { supabaseAdmin } from '../config/supabase';
import { Routine, RoutineExercise } from '../types';
import { AppError } from '../middleware/errorHandler';

export class RoutineService {
  async list(userId: string): Promise<Routine[]> {
    const { data, error } = await supabaseAdmin
      .from('routines')
      .select('*, routine_exercises(*, exercises(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError('Failed to fetch routines');
    return (data || []) as Routine[];
  }

  async getById(id: string, userId: string): Promise<Routine> {
    const { data, error } = await supabaseAdmin
      .from('routines')
      .select('*, routine_exercises(*, exercises(*))')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new AppError('Routine not found', 404);
    return data as Routine;
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
    const { data, error } = await supabaseAdmin
      .from('routines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to update routine');
    return data as Routine;
  }

  async remove(id: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('routines')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new AppError('Failed to delete routine');
  }

  async addExercise(
    routineId: string,
    userId: string,
    input: Partial<RoutineExercise>
  ): Promise<RoutineExercise> {
    // Ownership checks: both the routine and the exercise being attached must belong to this user.
    const routine = await this.getById(routineId, userId);

    const { data: exercise } = await supabaseAdmin
      .from('exercises')
      .select('id')
      .eq('id', input.exercise_id)
      .eq('user_id', userId)
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
