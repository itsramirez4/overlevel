import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

export interface WorkoutExerciseNote {
  id: string;
  workout_id: string;
  exercise_id: string;
  user_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export class WorkoutExerciseNoteService {
  async getForWorkout(workoutId: string, userId: string): Promise<WorkoutExerciseNote[]> {
    const { data, error } = await supabaseAdmin
      .from('workout_exercise_notes')
      .select('*')
      .eq('workout_id', workoutId)
      .eq('user_id', userId);

    if (error) throw new AppError('Failed to fetch exercise notes');
    return (data || []) as WorkoutExerciseNote[];
  }

  /**
   * A blank note deletes the row instead of storing an empty string — same
   * "clearing it removes it" behavior as the per-set form_notes field, and
   * keeps getForWorkout() from having to filter out empty rows everywhere
   * it's read.
   */
  async set(workoutId: string, exerciseId: string, userId: string, notes: string): Promise<WorkoutExerciseNote | null> {
    const { data: workout, error: workoutError } = await supabaseAdmin
      .from('workouts')
      .select('id')
      .eq('id', workoutId)
      .eq('user_id', userId)
      .maybeSingle();
    if (workoutError) throw new AppError('Failed to fetch workout');
    if (!workout) throw new AppError('Workout not found', 404);

    const { data: exercise, error: exerciseError } = await supabaseAdmin
      .from('exercises')
      .select('id')
      .eq('id', exerciseId)
      .maybeSingle();
    if (exerciseError) throw new AppError('Failed to fetch exercise');
    if (!exercise) throw new AppError('Exercise not found', 404);

    const trimmed = notes.trim();

    if (!trimmed) {
      const { error } = await supabaseAdmin
        .from('workout_exercise_notes')
        .delete()
        .eq('workout_id', workoutId)
        .eq('exercise_id', exerciseId)
        .eq('user_id', userId);
      if (error) throw new AppError('Failed to clear exercise note');
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('workout_exercise_notes')
      .upsert(
        { workout_id: workoutId, exercise_id: exerciseId, user_id: userId, notes: trimmed, updated_at: new Date().toISOString() },
        { onConflict: 'workout_id,exercise_id' }
      )
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to save exercise note');
    return data as WorkoutExerciseNote;
  }
}

export const workoutExerciseNoteService = new WorkoutExerciseNoteService();
