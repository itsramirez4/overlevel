import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase, supabaseAdmin } from '../config/supabase';
import { verifyToken } from '../config/auth';
import {
  issueTokenPair,
  revokeAllForUser,
  revokeRefreshToken,
  rotateRefreshToken,
  RefreshTokenReuseError,
} from '../services/tokenService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { DEFAULT_EXERCISE_CATALOG } from '../config/defaultExerciseCatalog';

/** Same shape updateUserSchema enforces for a user-driven username change
 * (lowercase, [a-z0-9_.]+, 3-30 chars) — the auto-generated one from a
 * first login has to satisfy it too, or it'd be a username the user could
 * never re-save from settings without changing it first. */
function deriveUsername(email: string, userId: string): string {
  const stripped = (email.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9_.]/g, '');
  const trimmed = stripped.slice(0, 30);
  return trimmed.length >= 3 ? trimmed : `user_${userId.slice(0, 8)}`;
}

/** Best-effort — a brand-new account with zero exercises otherwise has to
 * create every single one by hand before logging its first set (migration
 * 016 only ever seeded this retroactively, for users that already existed
 * at the time it ran). Never blocks/fails account creation over it: whoever
 * calls this already has a real users row either way. */
async function seedDefaultExercises(userId: string): Promise<void> {
  try {
    const rows = DEFAULT_EXERCISE_CATALOG.map((e) => ({
      user_id: userId,
      name: e.name,
      category: e.category,
      muscle_groups: e.muscle_groups,
      equipment: e.equipment,
      is_custom: false,
    }));
    const { error } = await supabaseAdmin.from('exercises').insert(rows);
    if (error) logger.error('Failed to seed default exercise catalog', error);
  } catch (err) {
    logger.error('Failed to seed default exercise catalog', err);
  }
}

/** Shared by login, register (when email confirmation is off), and
 * confirm-email (when it's on) — every path a Supabase Auth user can first
 * become "signed in" through needs the matching `users` profile row to
 * exist before issueTokenPair runs (refresh_tokens.user_id has a hard FK
 * to users(id)). */
async function provisionUserProfile(authUser: { id: string; email?: string }) {
  // .maybeSingle(), not .single() — "no row yet" (the normal case on a
  // first-ever login) must resolve as data: null, error: null so it's
  // distinguishable from a real DB failure below. .single() sets an error
  // for both cases alike, which used to make a transient read error here
  // fall through to the INSERT path same as a genuine first login — for a
  // RETURNING user that then hits a 23505 on the id itself, which the
  // retry-with-a-suffixed-username logic below can't actually resolve
  // (the conflict isn't the username), turning a blip into a failed login.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();
  if (existingError) throw new AppError('Failed to fetch user profile');
  if (existing) return existing;

  const username = deriveUsername(authUser.email || '', authUser.id);
  const { data: createdUser, error: createError } = await supabaseAdmin
    .from('users')
    .insert({ id: authUser.id, email: authUser.email, username })
    .select()
    .single();

  if (createError?.code === '23505') {
    // Two different emails normalized to the same username (stripping
    // punctuation collapsed them) — retry once with a short unique
    // suffix instead of failing this account's first session outright.
    const { data: retried, error: retryError } = await supabaseAdmin
      .from('users')
      .insert({ id: authUser.id, email: authUser.email, username: `${username}_${authUser.id.slice(0, 6)}` })
      .select()
      .single();

    if (retryError || !retried) throw new AppError('Failed to provision user profile');
    await seedDefaultExercises(retried.id);
    return retried;
  }
  if (createError || !createdUser) throw new AppError('Failed to provision user profile');
  await seedDefaultExercises(createdUser.id);
  return createdUser;
}

export class AuthController {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    // No try/catch here: express-async-errors forwards any rejection (ours or
    // Supabase's) to the shared errorHandler, which is what actually decides
    // what's safe to expose — an AppError's own message, or a sanitized
    // "Something went wrong" for anything unexpected. Catching locally had
    // been bypassing that and echoing raw error.message straight to the client.
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) throw new AppError('Invalid credentials', 401);

    const userData = await provisionUserProfile(data.user);
    const { accessToken, refreshToken } = await issueTokenPair(data.user.id);

    res.json({
      user: userData,
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  /**
   * Self-service signup. Supabase Auth requires email confirmation on this
   * project (verified empirically — signUp() comes back with no session),
   * so the normal path here is "no session yet, check your email", not an
   * immediate login. Still handles the case where confirmation is off
   * (data.session present) by logging straight in, so this keeps working if
   * that project setting ever changes.
   */
  async register(req: Request, res: Response) {
    // Closed for now — flip ENABLE_SELF_REGISTRATION=true on the backend
    // when ready to open signups. Checked before ever touching Supabase Auth
    // so a closed period can't accumulate half-created accounts.
    if (process.env.ENABLE_SELF_REGISTRATION !== 'true') {
      throw new AppError('El registro no está disponible todavía. Más adelante.', 403);
    }

    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: 'overlevel://confirm-email' },
    });

    if (error) {
      // 400 here is Supabase's own validation (bad domain, weak password,
      // etc.) — its message is already user-facing English/plain text, not
      // an internal detail, so it's safe to forward as-is.
      throw new AppError(error.message || 'No se pudo crear la cuenta', 400);
    }
    if (!data.user) throw new AppError('No se pudo crear la cuenta', 400);

    // Signing up with an email that already has an account does NOT come
    // back as an error — Supabase's own anti-enumeration behavior returns a
    // fake `user` (identities: []) instead, same "don't leak who's
    // registered" spirit as forgotPassword below always returning 200
    // regardless. Deliberately not special-cased here either: this response
    // is identical to a genuine new signup either way.
    if (!data.session) {
      return res.status(201).json({ requires_email_confirmation: true });
    }

    const userData = await provisionUserProfile(data.user);
    const { accessToken, refreshToken } = await issueTokenPair(data.user.id);
    res.status(201).json({ user: userData, access_token: accessToken, refresh_token: refreshToken });
  }

  /**
   * Landing spot for the confirmation email's link. `access_token` here is
   * Supabase's own session token from the confirm redirect (overlevel://
   * confirm-email#access_token=...&type=signup), the same fragment shape as
   * the password-recovery link — not this app's own JWT. Validating it and
   * minting our own token pair is exactly resetPassword's pattern, plus
   * provisioning the profile row since this can be the very first time this
   * account is ever "signed in".
   */
  async confirmEmail(req: Request, res: Response) {
    const { access_token } = req.body;

    const { data, error } = await supabase.auth.getUser(access_token);
    if (error || !data.user) throw new AppError('El enlace no es válido o ha caducado', 401);

    const userData = await provisionUserProfile(data.user);
    const { accessToken, refreshToken } = await issueTokenPair(data.user.id);
    res.json({ user: userData, access_token: accessToken, refresh_token: refreshToken });
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
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', decoded.userId)
        .maybeSingle();
      // Checked separately from `!user` below and returned immediately — a
      // transient DB failure here must surface as a retryable 500, not get
      // funneled into this function's catch-all 401, which would otherwise
      // force a real, valid session to fully re-login over a blip.
      if (userError) {
        logger.error('refresh: failed to verify user existence', userError);
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
      }
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

  /**
   * Supabase Auth sends the actual email itself (its built-in mailer, no
   * SMTP/API-key setup needed on our end) — this just triggers it, pointed
   * at a deep link back into the app instead of a web page. Always responds
   * the same way whether or not the email has an account, so this can't be
   * used to enumerate registered emails.
   */
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'overlevel://reset-password' });
    res.json({ message: 'Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la contraseña' });
  }

  /**
   * `access_token` here is the recovery token Supabase put in the deep
   * link's URL fragment (app/(auth)/reset-password.tsx pulls it out
   * client-side) — supabase.auth.getUser() both validates it and identifies
   * whose password this is. Every other outstanding session gets revoked
   * too: a password reset is exactly the moment an account may have just
   * been compromised, so anything logged in under the old password
   * shouldn't get to stay logged in silently.
   */
  async resetPassword(req: Request, res: Response) {
    const { access_token, new_password } = req.body;

    const { data, error } = await supabase.auth.getUser(access_token);
    if (error || !data.user) throw new AppError('El enlace no es válido o ha caducado', 401);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      password: new_password,
    });
    if (updateError) throw new AppError('No se pudo actualizar la contraseña');

    await revokeAllForUser(data.user.id);
    res.json({ message: 'Contraseña actualizada' });
  }
}

export const authController = new AuthController();
