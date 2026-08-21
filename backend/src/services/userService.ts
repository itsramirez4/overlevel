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

    try {
      const [exercises, routines, bodyWeightLogs, workouts] = await Promise.all([
        fetchAllRows<any>((from, to) =>
          supabaseAdmin.from('exercises').select('*').eq('user_id', userId).range(from, to)
        ),
        fetchAllRows<any>((from, to) =>
          supabaseAdmin.from('routines').select('*, routine_exercises(*)').eq('user_id', userId).range(from, to)
        ),
        fetchAllRows<any>((from, to) =>
          supabaseAdmin
            .from('body_weight_logs')
            .select('*')
            .eq('user_id', userId)
            .order('logged_at', { ascending: true })
            .range(from, to)
        ),
        fetchAllRows<any>((from, to) =>
          supabaseAdmin
            .from('workouts')
            .select('*, sets(*)')
            .eq('user_id', userId)
            .order('started_at', { ascending: true })
            .range(from, to)
        ),
      ]);

      return {
        exported_at: new Date().toISOString(),
        user: { email: user.email, username: user.username, full_name: user.full_name },
        exercises,
        routines,
        workouts,
        body_weight_logs: bodyWeightLogs,
      };
    } catch {
      throw new AppError('Failed to export data');
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    return data as User | null;
  }

  /**
   * Gate for viewing anything about another account (profile, workouts,
   * follower/following lists, following them) — always allowed for your own
   * id regardless of profile_public, 404 for anyone else's private one. A
   * 404 rather than 403 so a private account's existence isn't leaked to
   * someone who isn't already looking at it (e.g. via a guessed/shared id).
   */
  async assertViewable(targetId: string, viewerId: string): Promise<User> {
    const { data } = await supabaseAdmin.from('users').select('*').eq('id', targetId).maybeSingle();
    if (!data) throw new AppError('User not found', 404);
    if (data.id !== viewerId && !data.profile_public) throw new AppError('User not found', 404);
    return data as User;
  }

  /** Public-safe view of another user's profile, plus the viewer's own relationship to them. */
  async getPublicProfile(targetId: string, viewerId: string) {
    const user = await this.assertViewable(targetId, viewerId);
    const { followService } = await import('./followService');
    const [counts, isFollowing] = await Promise.all([
      followService.getCounts(targetId),
      targetId === viewerId ? Promise.resolve(false) : followService.isFollowing(viewerId, targetId),
    ]);

    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      profile_public: user.profile_public,
      created_at: user.created_at,
      followers_count: counts.followers,
      following_count: counts.following,
      is_following: isFollowing,
      is_self: targetId === viewerId,
    };
  }

  /** Public accounts only, by username — private accounts don't show up so they can't be followed via search either. */
  async search(query: string, viewerId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, avatar_url')
      .eq('profile_public', true)
      .neq('id', viewerId)
      .ilike('username', `%${query}%`)
      .limit(20);

    if (error) throw new AppError('Failed to search users');
    return data || [];
  }
}

export const userService = new UserService();
