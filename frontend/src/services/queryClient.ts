import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

// One deliberate policy instead of every screen's useQuery/useMutation
// silently falling back to React Query's own library defaults (staleTime 0,
// retry 3 for everything including mutations). A standalone module (not
// defined inline in _layout.tsx) so authStore can import the same instance
// and clear it on login/logout — switching accounts must never leave the
// previous account's cached data (workouts, character, stats…) visible.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s: short enough that data feels current, long enough that
      // switching tabs/screens within that window doesn't re-fetch lists
      // that were just loaded — the focus/reconnect listeners in _layout.tsx
      // still force a fresh fetch on backgrounding or reconnecting regardless.
      staleTime: 30_000,
      // A 4xx (not found, validation, unauthorized) won't succeed on retry —
      // only worth retrying transient failures (network blips, 5xx).
      retry: (failureCount, error) => {
        if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // Most mutations here aren't idempotent (POST /sets, POST /workouts) —
      // auto-retrying could double-create data on a flaky connection.
      // useOfflineSync/SetLogger handle the "no connectivity" case deliberately.
      retry: 0,
    },
  },
});
