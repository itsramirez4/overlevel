import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase, supabaseAdmin } from '../config/supabase';
import { createTokens } from '../config/auth';
import { AppError } from '../middleware/errorHandler';

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

      const { accessToken, refreshToken } = createTokens(data.user.id);

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

  async refresh(req: Request, res: Response) {
    // Implementation
    res.json({ message: 'Refresh token logic here' });
  }

  async logout(req: AuthRequest, res: Response) {
    res.json({ message: 'Logged out' });
  }
}

export const authController = new AuthController();
