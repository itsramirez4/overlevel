import { supabaseAdmin } from '../../src/config/supabase';
import { issueTokenPair } from '../../src/services/tokenService';

/**
 * These tests run against the real (dev) Supabase project — there's no
 * separate test database. Every test MUST go through createTestUser/
 * deleteTestUser so all data it touches lives under a disposable,
 * uniquely-named account; deleting that account cascades away everything
 * created under it (workouts, exercises, sets, characters, battles — see
 * the ON DELETE CASCADE chains in migrations 002/005/019/021). Never
 * hardcode or reuse a real account's id/email here.
 */
export interface TestUser {
  id: string;
  email: string;
  token: string;
  refreshToken: string;
}

let counter = 0;

export async function createTestUser(label = 'test'): Promise<TestUser> {
  counter += 1;
  const suffix = `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `jest-${label}-${suffix}@example.com`;
  const username = `jest_${label}_${suffix}`.slice(0, 50);

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ email, username })
    .select()
    .single();

  if (error || !user) throw new Error(`Failed to create test user: ${error?.message}`);

  // issueTokenPair, not the bare JWT signer — it also persists the
  // refresh_tokens row that /auth/refresh now requires (rotation +
  // reuse detection needs a DB record, not just a valid signature).
  const { accessToken, refreshToken } = await issueTokenPair(user.id);
  return { id: user.id, email: user.email, token: accessToken, refreshToken };
}

export async function deleteTestUser(userId: string): Promise<void> {
  await supabaseAdmin.from('users').delete().eq('id', userId);
}

export function authHeader(user: TestUser): { Authorization: string } {
  return { Authorization: `Bearer ${user.token}` };
}
