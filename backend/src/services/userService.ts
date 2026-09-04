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

    if (error || !data) {
      if (error?.code === '23505') throw new AppError(`El nombre de usuario "${updates.username}" ya está en uso`, 409);
      throw new AppError('Failed to update user');
    }

    if (typeof updates.body_weight === 'number') {
      await supabaseAdmin.from('body_weight_logs').insert({
        user_id: userId,
        weight: updates.body_weight,
      });
    }

    return data as User;
  }

  /** Batch user_id -> character_type lookup, used to show each user's chosen
   * character as their avatar in social lists/profiles (some users have no
   * character yet, so entries are simply absent from the map). */
  async getCharacterTypes(ids: string[]): Promise<Record<string, string>> {
    if (ids.length === 0) return {};
    const { data } = await supabaseAdmin.from('characters').select('user_id, character_type').in('user_id', ids);
    const map: Record<string, string> = {};
    (data || []).forEach((c: any) => {
      map[c.user_id] = c.character_type;
    });
    return map;
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
      const [ownExercises, routines, bodyWeightLogs, bodyMeasurements, workouts, character, battles, exerciseNotes] =
        await Promise.all([
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
              .from('body_measurements')
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
          // The RPG layer is additive/optional (see characterService), but a
          // user with a character reasonably expects its level/XP to show up
          // in an "export all my data" — this and battles were missing before.
          supabaseAdmin.from('characters').select('*').eq('user_id', userId).maybeSingle().then((r) => r.data),
          fetchAllRows<any>((from, to) =>
            supabaseAdmin.from('exercise_battles').select('*').eq('user_id', userId).range(from, to)
          ),
          // Missing here before — a user exporting "all my data" lost every
          // per-exercise note they'd written, same class of gap battles/
          // character had before the comment above.
          fetchAllRows<any>((from, to) =>
            supabaseAdmin.from('workout_exercise_notes').select('*').eq('user_id', userId).range(from, to)
          ),
        ]);

      // Exercises are shared across users now (see exerciseService) — a
      // workout or routine here can reference one this user didn't create.
      // Without also fetching those, the export's sets/routine_exercises
      // would carry exercise_ids that don't resolve to anything in it.
      const ownedIds = new Set(ownExercises.map((e: any) => e.id));
      const referencedIds = new Set<string>();
      for (const w of workouts) {
        for (const s of w.sets || []) referencedIds.add(s.exercise_id);
      }
      for (const r of routines) {
        for (const re of r.routine_exercises || []) referencedIds.add(re.exercise_id);
      }
      const missingIds = [...referencedIds].filter((id) => !ownedIds.has(id));
      const otherExercises = missingIds.length
        ? await fetchAllRows<any>((from, to) =>
            supabaseAdmin.from('exercises').select('*').in('id', missingIds).range(from, to)
          )
        : [];

      return {
        exported_at: new Date().toISOString(),
        user: { email: user.email, username: user.username, full_name: user.full_name },
        exercises: [...ownExercises, ...otherExercises],
        routines,
        workouts,
        body_weight_logs: bodyWeightLogs,
        body_measurements: bodyMeasurements,
        character,
        exercise_battles: battles,
        workout_exercise_notes: exerciseNotes,
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
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', targetId).maybeSingle();
    if (error) throw new AppError('Failed to fetch user');
    if (!data) throw new AppError('User not found', 404);
    if (data.id !== viewerId && !data.profile_public) throw new AppError('User not found', 404);
    return data as User;
  }

  /** Public-safe view of another user's profile, plus the viewer's own relationship to them. */
  async getPublicProfile(targetId: string, viewerId: string) {
    const user = await this.assertViewable(targetId, viewerId);
    const { followService } = await import('./followService');
    const [counts, isFollowing, characterTypes] = await Promise.all([
      followService.getCounts(targetId),
      targetId === viewerId ? Promise.resolve(false) : followService.isFollowing(viewerId, targetId),
      this.getCharacterTypes([targetId]),
    ]);

    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      bio: user.bio,
      character_type: characterTypes[targetId] || null,
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
      .select('id, username, full_name')
      .eq('profile_public', true)
      .neq('id', viewerId)
      .ilike('username', `%${query}%`)
      .limit(20);

    if (error) throw new AppError('Failed to search users');
    const characterTypes = await this.getCharacterTypes((data || []).map((u) => u.id));
    return (data || []).map((u) => ({ ...u, character_type: characterTypes[u.id] || null }));
  }
}

export const userService = new UserService();
