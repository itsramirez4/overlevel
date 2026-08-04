import { supabaseAdmin } from '../config/supabase';
import { Exercise } from '../types';
import { AppError } from '../middleware/errorHandler';

export class ExerciseService {
  async list(userId: string): Promise<Exercise[]> {
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw new AppError('Failed to fetch exercises');
    return (data || []) as Exercise[];
  }

  async getById(id: string, userId: string): Promise<Exercise> {
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new AppError('Exercise not found', 404);
    return data as Exercise;
  }

  async create(userId: string, input: Partial<Exercise>): Promise<Exercise> {
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .insert({ ...input, user_id: userId })
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to create exercise');
    return data as Exercise;
  }

  async update(id: string, userId: string, updates: Partial<Exercise>): Promise<Exercise> {
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to update exercise');
    return data as Exercise;
  }

  async remove(id: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('exercises')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new AppError('Failed to delete exercise');
  }
}

export const exerciseService = new ExerciseService();
