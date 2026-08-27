import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../../src/config/supabase';

/**
 * createTestUser() (testUser.ts) inserts straight into `public.users` via
 * the service-role client and signs its own app JWT — it never creates a
 * real Supabase Auth user, so it has no `auth.uid()` and can't exercise RLS
 * (every other integration test runs as the service role, which bypasses
 * RLS by design — see migration 030's comment). This creates a real Auth
 * user + session so a test can hit Postgres as the anon key would, with
 * RLS actually enforced.
 */
export interface AuthedTestUser {
  id: string;
  email: string;
  client: typeof supabase;
}

export async function createAuthedTestUser(label = 'rls'): Promise<AuthedTestUser> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `jest-${label}-${suffix}@example.com`;
  const password = `Test-${suffix}!`;

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) throw new Error(`Failed to create auth user: ${createError?.message}`);

  // Mirrors authController.login's lazy profile provisioning (id must equal
  // auth.uid() for the RLS policies keyed off it to resolve to this row).
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({ id: created.user.id, email, username: `jest_${label}_${suffix}`.slice(0, 50) });
  if (profileError) throw new Error(`Failed to provision user profile: ${profileError.message}`);

  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  const { data: session, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError || !session.session) throw new Error(`Failed to sign in test user: ${signInError?.message}`);

  // A plain anon-key client with the session's access token attached — this
  // is what PostgREST actually sees from a real client request, and what
  // resolves auth.uid() inside RLS policies.
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
  });

  return { id: created.user.id, email, client };
}

export async function deleteAuthedTestUser(userId: string): Promise<void> {
  // Cascades away everything under the profile row (see testUser.ts), same
  // as a normal disposable test user.
  await supabaseAdmin.from('users').delete().eq('id', userId);
  await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
}
