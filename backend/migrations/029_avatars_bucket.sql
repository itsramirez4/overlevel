-- Public storage bucket for profile pictures. Uploads only ever go through
-- the backend (supabaseAdmin, service role), never directly from the app,
-- so no client-facing storage RLS policies are needed here — the same
-- "client never talks to Supabase directly" pattern as the rest of the API.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
