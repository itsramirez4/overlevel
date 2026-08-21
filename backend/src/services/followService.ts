import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { userService } from './userService';

export interface PublicUser {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

export class FollowService {
  async follow(followerId: string, followedId: string): Promise<void> {
    if (followerId === followedId) throw new AppError('No puedes seguirte a ti mismo', 400);

    // Also 404s if the account is private — you can't follow someone you
    // can't otherwise see, same rule as viewing their profile/workouts.
    await userService.assertViewable(followedId, followerId);

    const { error } = await supabaseAdmin.from('follows').insert({ follower_id: followerId, followed_id: followedId });
    // 23505 = unique_violation — already following; treat as success (idempotent).
    if (error && error.code !== '23505') throw new AppError('No se pudo seguir al usuario');
  }

  async unfollow(followerId: string, followedId: string): Promise<void> {
    await supabaseAdmin.from('follows').delete().eq('follower_id', followerId).eq('followed_id', followedId);
  }

  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .maybeSingle();
    return !!data;
  }

  async getCounts(userId: string): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
      supabaseAdmin.from('follows').select('id', { count: 'exact', head: true }).eq('followed_id', userId),
      supabaseAdmin.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    return { followers: followers.count || 0, following: following.count || 0 };
  }

  /** Users who follow `userId`. */
  async listFollowers(userId: string): Promise<PublicUser[]> {
    const { data: rows } = await supabaseAdmin.from('follows').select('follower_id').eq('followed_id', userId);
    return this.fetchUsers((rows || []).map((r) => r.follower_id));
  }

  /** Users `userId` follows. */
  async listFollowing(userId: string): Promise<PublicUser[]> {
    const { data: rows } = await supabaseAdmin.from('follows').select('followed_id').eq('follower_id', userId);
    return this.fetchUsers((rows || []).map((r) => r.followed_id));
  }

  // Two queries (ids, then users) instead of an embedded join — follows has
  // two FKs to the same `users` table, and relying on the auto-generated FK
  // constraint name for PostgREST's embed disambiguation is fragile. This
  // is just as fast for list sizes a follower list actually has.
  private async fetchUsers(ids: string[]): Promise<PublicUser[]> {
    if (ids.length === 0) return [];
    const { data } = await supabaseAdmin.from('users').select('id, username, full_name, avatar_url').in('id', ids);
    return (data || []) as PublicUser[];
  }
}

export const followService = new FollowService();
