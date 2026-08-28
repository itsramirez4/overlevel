import { api } from './api';

/**
 * No Sentry/native crash SDK in this app (that would pull in native code and
 * force a full rebuild) — this ships errors to our own backend instead,
 * which logs them and forwards to Sentry itself if it has SENTRY_DSN
 * configured, so one Sentry project can still cover both sides.
 *
 * Fire-and-forget: reporting a crash must never itself throw, block the UI
 * it's reporting from, or wait on the request.
 */
export function reportError(error: unknown, extra?: { componentStack?: string; context?: string }) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  api
    .post('/client-errors', { message, stack, componentStack: extra?.componentStack, context: extra?.context })
    .catch(() => {});
}
