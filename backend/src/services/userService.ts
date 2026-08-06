import { supabase, supabaseAdmin } from '../config/supabase';
import { BodyWeightLog, User } from '../types';
import { AppError } from '../middleware/errorHandler';
import { fetchAllRows } from '../utils/pagination';

export class UserService {
  async getUserById(userId: string): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) throw new AppError('User not found', 404);
    return data as User;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to update user');

    if (typeof updates.body_weight === 'number') {
      await supabaseAdmin.from('body_weight_logs').insert({
        user_id: userId,
        weight: updates.body_weight,
      });
    }

    return data as User;
  }

  async getBodyWeightHistory(userId: string, days = 90): Promise<BodyWeightLog[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('body_weight_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: true });

    if (error) throw new AppError('Failed to fetch body weight history');
    return (data || []) as BodyWeightLog[];
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.getUserById(userId);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (authError) throw new AppError('Contraseña actual incorrecta', 400);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw new AppError('No se pudo actualizar la contraseña');
  }

  async exportData(userId: string) {
    const user = await this.getUserById(userId);

    const [exercises, routines, bodyWeightLogs] = await Promise.all([
      supabaseAdmin.from('exercises').select('*').eq('user_id', userId),
      supabaseAdmin.from('routines').select('*, routine_exercises(*)').eq('user_id', userId),
      supabaseAdmin.from('body_weight_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: true }),
    ]);

    if (exercises.error || routines.error || bodyWeightLogs.error) {
      throw new AppError('Failed to export data');
    }

    let workouts: any[];
    try {
      workouts = await fetchAllRows((from, to) =>
        supabaseAdmin
          .from('workouts')
          .select('*, sets(*)')
          .eq('user_id', userId)
          .order('started_at', { ascending: true })
          .range(from, to)
      );
    } catch {
      throw new AppError('Failed to export data');
    }

    return {
      exported_at: new Date().toISOString(),
      user: { email: user.email, username: user.username, full_name: user.full_name },
      exercises: exercises.data,
      routines: routines.data,
      workouts,
      body_weight_logs: bodyWeightLogs.data,
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    return data as User | null;
  }
}

export const userService = new UserService();
