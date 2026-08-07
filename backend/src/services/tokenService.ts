import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase';
import { createTokens as signTokenPair } from '../config/auth';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Thrown specifically when an already-consumed refresh token is presented
 * again — normal rotation never does this, so it's the signal a token leaked. */
export class RefreshTokenReuseError extends Error {}

// SHA-256, not bcrypt: these are already high-entropy signed JWTs (not
// low-entropy human passwords), so a fast cryptographic hash is the right
// tool — it still means DB read access alone can't yield a usable token.
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function expiryFromJwt(token: string): Date {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) throw new Error('Token has no expiry claim');
  return new Date(decoded.exp * 1000);
}

/** Issues a fresh access+refresh pair and persists a hashed record of the
 * refresh token, so a later /refresh or /logout call has something to
 * validate/rotate/revoke against instead of trusting the JWT signature alone. */
export async function issueTokenPair(userId: string): Promise<TokenPair> {
  const { accessToken, refreshToken } = signTokenPair(userId);

  const { error } = await supabaseAdmin.from('refresh_tokens').insert({
    user_id: userId,
    token_hash: hashToken(refreshToken),
    expires_at: expiryFromJwt(refreshToken).toISOString(),
  });
  if (error) throw new Error('Failed to persist refresh token');

  return { accessToken, refreshToken };
}

/**
 * Validates a refresh token against the DB (not just its JWT signature),
 * rotates it — marks this one used, mints + persists a new pair — and
 * detects reuse of an already-consumed token. On reuse, every outstanding
 * refresh token for the user is revoked, not just this one: a stolen token
 * being replayed after the legitimate client already rotated past it means
 * the whole account's sessions should be considered suspect.
 */
export async function rotateRefreshToken(userId: string, refreshToken: string): Promise<TokenPair> {
  const hash = hashToken(refreshToken);

  const { data: record } = await supabaseAdmin
    .from('refresh_tokens')
    .select('id, revoked_at, expires_at, user_id')
    .eq('token_hash', hash)
    .maybeSingle();

  if (!record || record.user_id !== userId) {
    throw new Error('Refresh token not recognized');
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new Error('Refresh token expired');
  }
  if (record.revoked_at) {
    await revokeAllForUser(userId);
    throw new RefreshTokenReuseError('Refresh token reuse detected');
  }

  await supabaseAdmin.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', record.id);

  return issueTokenPair(userId);
}

/** Logout — revokes just this one refresh token so it can't be used again,
 * even though its JWT signature stays valid until natural expiry. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await supabaseAdmin
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', hashToken(refreshToken))
    .is('revoked_at', null);
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await supabaseAdmin
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);
}
