import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase, supabaseAdmin } from '../config/supabase';
import { verifyToken } from '../config/auth';
import { issueTokenPair, revokeRefreshToken, rotateRefreshToken, RefreshTokenReuseError } from '../services/tokenService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/** Same shape updateUserSchema enforces for a user-driven username change
 * (lowercase, [a-z0-9_.]+, 3-30 chars) — the auto-generated one from a
 * first login has to satisfy it too, or it'd be a username the user could
 * never re-save from settings without changing it first. */
function deriveUsername(email: string, userId: string): string {
  const stripped = (email.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9_.]/g, '');
  const trimmed = stripped.slice(0, 30);
  return trimmed.length >= 3 ? trimmed : `user_${userId.slice(0, 8)}`;
}

export class AuthController {
  /**
   * No self-registration: users are provisioned in Supabase Auth (dashboard/admin only).
   * The matching `users` profile row is created lazily on first successful login.
   */
  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    // No try/catch here: express-async-errors forwards any rejection (ours or
    // Supabase's) to the shared errorHandler, which is what actually decides
    // what's safe to expose — an AppError's own message, or a sanitized
    // "Something went wrong" for anything unexpected. Catching locally had
    // been bypassing that and echoing raw error.message straight to the client.
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) throw new AppError('Invalid credentials', 401);

    let { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!userData) {
      const username = deriveUsername(data.user.email || '', data.user.id);
      const { data: createdUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({ id: data.user.id, email: data.user.email, username })
        .select()
        .single();

      if (createError?.code === '23505') {
        // Two different emails normalized to the same username (stripping
        // punctuation collapsed them) — retry once with a short unique
        // suffix instead of failing this user's very first login outright.
        const { data: retried, error: retryError } = await supabaseAdmin
          .from('users')
          .insert({ id: data.user.id, email: data.user.email, username: `${username}_${data.user.id.slice(0, 6)}` })
          .select()
          .single();

        if (retryError || !retried) throw new AppError('Failed to provision user profile');
        userData = retried;
      } else if (createError || !createdUser) {
        throw new AppError('Failed to provision user profile');
      } else {
        userData = createdUser;
      }
    }

    // Only after the users row is guaranteed to exist: refresh_tokens.user_id
    // has a hard FK to users(id), so issuing tokens before provisioning the
    // profile (the previous order) made every brand-new user's very first
    // login — the only account-creation path this app has — fail outright
    // with a 500. Caught by actually running the app, not by any test: every
    // test helper pre-creates the users row directly, sidestepping this exact
    // ordering.
    const { accessToken, refreshToken } = await issueTokenPair(data.user.id);

    res.json({
      user: userData,
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  /**
   * Was a stub that never issued new tokens — with a 15-minute access token
   * and no working refresh, the frontend's 401 handler was logging users out
   * every 15 minutes during normal use. Access tokens are short-lived by
   * design; this is what's supposed to renew them transparently.
   */
  async refresh(req: Request, res: Response) {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'No refresh token provided' });
    }

    try {
      const decoded = verifyToken(refresh_token);
      if (decoded.type !== 'refresh') throw new Error('Not a refresh token');

      // A JWT's signature staying valid doesn't mean the account still does —
      // without this, a deleted user's refresh token could keep minting new
      // 15min/7day token pairs indefinitely, forever.
      const { data: user } = await supabaseAdmin.from('users').select('id').eq('id', decoded.userId).maybeSingle();
      if (!user) throw new Error('User no longer exists');

      // Validates against the DB record (not just the JWT signature), and
      // rotates: this token is marked used, a new pair is issued. Reusing
      // an already-rotated token past this point revokes every refresh
      // token this user has outstanding — see tokenService for why.
      const { accessToken, refreshToken } = await rotateRefreshToken(decoded.userId, refresh_token);
      res.json({ access_token: accessToken, refresh_token: refreshToken });
    } catch (error) {
      if (error instanceof RefreshTokenReuseError) {
        logger.warn('Refresh token reuse detected — all sessions revoked for user', { error: error.message });
      }
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid refresh token' });
    }
  }

  async logout(req: Request, res: Response) {
    const { refresh_token } = req.body;
    if (refresh_token) {
      await revokeRefreshToken(refresh_token);
    }
    res.json({ message: 'Logged out' });
  }
}

export const authController = new AuthController();
