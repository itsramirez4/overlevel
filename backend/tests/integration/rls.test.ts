import { supabaseAdmin } from '../../src/config/supabase';
import { createAuthedTestUser, deleteAuthedTestUser, AuthedTestUser } from '../helpers/authedClient';

/**
 * Every other integration test runs through the backend's own HTTP API
 * (service-role client under the hood), which bypasses RLS by design — so
 * none of them would notice if migration 030's policies regressed. These
 * hit Postgres directly with a real anon-key + Auth-session client, the way
 * PostgREST actually sees a request, to confirm RLS itself is doing
 * something rather than just existing in a migration file.
 */
describe('row level security', () => {
  let userA: AuthedTestUser;
  let userB: AuthedTestUser;

  beforeAll(async () => {
    userA = await createAuthedTestUser('rls-a');
    userB = await createAuthedTestUser('rls-b');
  });

  afterAll(async () => {
    await deleteAuthedTestUser(userA.id);
    await deleteAuthedTestUser(userB.id);
  });

  it('lets a user read their own exercise', async () => {
    await supabaseAdmin
      .from('exercises')
      .insert({ user_id: userA.id, name: 'RLS Own Exercise', category: 'compound' });

    const { data, error } = await userA.client.from('exercises').select('*').eq('name', 'RLS Own Exercise');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("blocks a user from reading another user's exercise", async () => {
    await supabaseAdmin
      .from('exercises')
      .insert({ user_id: userB.id, name: 'RLS Other Exercise', category: 'compound' });

    // RLS filters the row out rather than erroring — a real cross-user leak
    // would show up here as data.length === 1, not as a thrown error.
    const { data, error } = await userA.client.from('exercises').select('*').eq('name', 'RLS Other Exercise');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("blocks a user from updating another user's exercise", async () => {
    const { data: created } = await supabaseAdmin
      .from('exercises')
      .insert({ user_id: userB.id, name: 'RLS Update Target', category: 'compound' })
      .select()
      .single();

    const { data: updated } = await userA.client
      .from('exercises')
      .update({ name: 'Hacked' })
      .eq('id', created.id)
      .select();

    // RLS's USING clause makes the row invisible to the update too, so it
    // matches nothing instead of failing loudly.
    expect(updated).toEqual([]);

    const { data: stillOriginal } = await supabaseAdmin.from('exercises').select('name').eq('id', created.id).single();
    expect(stillOriginal?.name).toBe('RLS Update Target');
  });

  it("blocks a user from reading another user's workouts", async () => {
    const { data: workout } = await supabaseAdmin
      .from('workouts')
      .insert({ user_id: userB.id, started_at: new Date().toISOString() })
      .select()
      .single();

    const { data, error } = await userA.client.from('workouts').select('*').eq('id', workout.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('has no policies granting the refresh_tokens table to non-service roles', async () => {
    await supabaseAdmin.from('refresh_tokens').insert({
      user_id: userB.id,
      token_hash: `rls-test-${Date.now()}`,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });

    // No policy at all (see migration 030) — RLS with zero policies denies
    // every row to every non-service role outright, even the owning user's.
    const { data } = await userA.client.from('refresh_tokens').select('*');
    expect(data).toEqual([]);
  });
});
