import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

export class PushTokenService {
  /**
   * Upserts on the token itself, not (user_id, token) — the same physical
   * device re-registering under a different account (a shared device, or
   * someone logging into a new account) must stop the previous account from
   * being pushed to on it, which only works if this reassigns ownership
   * rather than adding a second row for the same token.
   */
  async register(userId: string, token: string, platform?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('push_tokens')
      .upsert({ user_id: userId, token, platform }, { onConflict: 'token' });

    if (error) throw new AppError('Failed to register push token');
  }

  /** Called on logout — a shared/borrowed device must stop receiving this
   * account's pushes the moment its owner signs out of it. */
  async unregister(userId: string, token: string): Promise<void> {
    const { error } = await supabaseAdmin.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
    if (error) throw new AppError('Failed to unregister push token');
  }

  async getTokensForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const { data, error } = await supabaseAdmin.from('push_tokens').select('token').in('user_id', userIds);
    if (error) throw new AppError('Failed to fetch push tokens');
    return (data || []).map((r) => r.token);
  }

  /** Prunes tokens Expo has confirmed are dead (app uninstalled, etc.) —
   * best-effort, never worth failing the push send over. */
  async removeTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await supabaseAdmin.from('push_tokens').delete().in('token', tokens);
  }
}

export const pushTokenService = new PushTokenService();
