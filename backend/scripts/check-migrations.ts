/**
 * Run before deploying: confirms the Postgres RPC functions this code
 * depends on (workoutService.complete, battleService.applyDamage) actually
 * exist in the target database. Exists because of a near-miss — this repo's
 * migrations are applied by hand, one at a time, in the Supabase SQL Editor
 * (see backend/migrations/), and it's easy to ship backend code that calls
 * an RPC before that migration has actually been run there.
 *
 * Calls each function with a random UUID that can't match a real row, so a
 * missing function fails with "function does not exist" (42883) while an
 * existing one just reports "not found"/no-op — no real data is touched.
 *
 * Usage: npm run check-migrations
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../src/config/supabase';

async function rpcExists(name: string, args: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabaseAdmin.rpc(name, args);
  const missing = error?.code === '42883' || /function .* does not exist/i.test(error?.message || '');
  return !missing;
}

async function main() {
  const checks: { name: string; args: Record<string, unknown> }[] = [
    { name: 'complete_workout', args: { p_workout_id: randomUUID(), p_user_id: randomUUID() } },
    { name: 'apply_battle_damage', args: { p_battle_id: randomUUID(), p_damage: 0 } },
  ];

  let ok = true;
  for (const check of checks) {
    const exists = await rpcExists(check.name, check.args);
    console.log(`${exists ? '✔' : '✘'} ${check.name}${exists ? '' : ' — MISSING, run backend/migrations/031/032'}`);
    if (!exists) ok = false;
  }

  if (!ok) {
    console.error('\nSome required database functions are missing. Apply the pending migrations before deploying.');
    process.exit(1);
  }
  console.log('\nAll required database functions are present.');
}

main();
