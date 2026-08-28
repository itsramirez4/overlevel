import * as Sentry from '@sentry/node';

// Opt-in: no SENTRY_DSN means Sentry.init() is never called, so every
// Sentry.* call elsewhere (captureException etc.) becomes a documented no-op
// instead of throwing — safe to leave wired up unconditionally in the rest
// of the app whether or not a DSN has been configured yet.
export const sentryEnabled = !!process.env.SENTRY_DSN;

if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
  });
}

export { Sentry };
