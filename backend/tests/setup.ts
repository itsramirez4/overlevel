// Loaded before any test file. Real .env values win when present (dotenv's
// default config() never overwrites an already-set process.env key) — the
// placeholders below only kick in if this ever runs somewhere without a
// .env (there's no CI for this project yet, but keeps that door open
// without silently masking real credentials the way this used to).
import 'dotenv/config';

process.env.SUPABASE_URL ||= 'https://placeholder.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'placeholder-anon-key';
process.env.SUPABASE_SERVICE_KEY ||= 'placeholder-service-key';
process.env.JWT_SECRET ||= 'test-secret';
process.env.CRON_SECRET ||= 'test-cron-secret';
