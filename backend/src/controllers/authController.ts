import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase, supabaseAdmin } from '../config/supabase';
import { verifyToken } from '../config/auth';
import { issueTokenPair, revokeRefreshToken, rotateRefreshToken, RefreshTokenReuseError } from '../services/tokenService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class AuthController {
  /**
   * No self-registration: users are provisioned in Supabase Auth (dashboard/admin only).
   * The matching `users` profile row is created lazily on first successful login.
   */
  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) throw new AppError('Invalid credentials', 401);

      const { accessToken, refreshToken } = await issueTokenPair(data.user.id);

      let { data: userData } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!userData) {
        const { data: createdUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username: data.user.email?.split('@')[0] || data.user.id,
          })
          .select()
          .single();

        if (createError || !createdUser) throw new AppError('Failed to provision user profile');
        userData = createdUser;
      }

      res.json({
        user: userData,
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error: any) {
      res.status(401).json({
        error: 'LOGIN_FAILED',
        message: error.message,
      });
    }
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
