import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

/** Revoked/expired refresh_tokens rows serve no purpose once their expiry
 * has passed — without this the table grows forever. Keeps a short grace
 * window past expiry rather than deleting the instant a token lapses, in
 * case anything ever wants to inspect recent history for debugging. */
export const cleanupRefreshTokens = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const { error, count } = await supabaseAdmin
    .from('refresh_tokens')
    .delete({ count: 'exact' })
    .lt('expires_at', cutoff.toISOString());

  if (error) {
    logger.error('cleanupRefreshTokens failed', error);
    return;
  }

  logger.info(`cleanupRefreshTokens removed ${count ?? 0} expired token records`);
};
