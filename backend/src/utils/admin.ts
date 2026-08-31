/**
 * Admins are just a trusted-id allowlist, not a stored role — this is a
 * small app with a handful of manually-provisioned accounts (see
 * authController: "No self-registration"), so a comma-separated env var
 * matches how CRON_SECRET etc. already handle "who's trusted to do X"
 * without a schema migration.
 */
export function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}
