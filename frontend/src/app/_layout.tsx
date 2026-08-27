import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider, QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import * as Updates from 'expo-updates';
import { useAuth } from '../hooks/useAuth';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { Loader } from '../components/ui/Loader';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

// One deliberate policy instead of every screen's useQuery/useMutation
// silently falling back to React Query's own library defaults (staleTime 0,
// retry 3 for everything including mutations).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s: short enough that data feels current, long enough that
      // switching tabs/screens within that window doesn't re-fetch lists
      // that were just loaded — the focus/reconnect listeners below still
      // force a fresh fetch on backgrounding or reconnecting regardless.
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

// React Query's "refetch on focus/reconnect" only works out of the box on
// web (it listens for the browser's visibilitychange/online events) — on
// native it needs to be told about those transitions itself. Without this,
// a screen that was already mounted with stale cached data (e.g. the
// dashboard, or a workout list) never re-fetches when you background the
// app and come back, or switch tabs — only an explicit invalidateQueries
// call (or a full app restart, which throws the whole cache away) shows the
// change, which read to the user as "I have to close and reopen the app".
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(!!state.isConnected))
  );
}

// useOfflineSync calls useQueryClient(), which needs a QueryClientProvider
// ancestor — RootLayout itself is the component that *renders* the provider
// below, so calling the hook directly in RootLayout's body throws ("No
// QueryClient set"), since a component isn't its own provider's descendant.
// Mounted as a dedicated child instead.
function OfflineSyncMount() {
  // Was implemented (queue + NetInfo listener) but never mounted anywhere,
  // so nothing ever flushed a queued mutation back to the server — logging a
  // set with no signal just failed with no retry. Mounted once here, at the
  // root, so it's listening for reconnects for the whole app lifetime rather
  // than only while one particular screen happens to be on screen.
  useOfflineSync();
  return null;
}

// expo-updates' own default behavior only downloads a new OTA update on cold
// start and applies it on the *next* one — so a published update used to
// need two closes/reopens before it was visible. Checking, fetching, and
// reloading right here means one reopen is enough: this fires once at
// launch, before the user has done anything worth preserving, so the reload
// it triggers reads as a slightly slower first launch rather than a
// disruptive restart. isEnabled is false in Expo Go/dev builds; any failure
// (offline, update server down) is swallowed — the app just keeps running
// the version it already has.
function AutoUpdateMount() {
  useEffect(() => {
    if (!Updates.isEnabled) return;
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Offline or the update check/fetch failed — not fatal, just stay
        // on the currently running version.
      }
    })();
  }, []);
  return null;
}

export default function RootLayout() {
  // useAuth() already calls authStore.checkAuth() internally and tracks
  // isLoading against it — a second direct call here just fired the same
  // /users/me request twice on every app launch. isSignedIn itself is read
  // directly from authStore by (tabs)/_layout and (auth)/_layout instead
  // of threaded through here — see the comment below the loading gate.
  const { isLoading } = useAuth();

  useEffect(() => {
    // Mobile browsers size `html`/`body`/`#root` off the *layout* viewport,
    // which doesn't shrink for the browser's own address/tab bar — so a
    // fixed bottom tab bar ends up rendered underneath it. `100dvh` tracks
    // the *visual* viewport instead, resizing live as that chrome shows or
    // hides. Native ignores this entirely (no `document`).
    if (Platform.OS === 'web' && typeof document !== 'undefined' && CSS?.supports?.('height', '100dvh')) {
      const style = document.createElement('style');
      style.textContent = 'html, body, #root { height: 100dvh; }';
      document.head.appendChild(style);
    }
  }, []);

  // Both groups are always declared below — which one the user actually
  // lands on is decided inside each group's own layout via <Redirect>
  // (isSignedIn gates (tabs), !isSignedIn gates (auth)). Conditionally
  // omitting a Stack.Screen based on isSignedIn instead used to work most
  // of the time, but Expo Router resolves the initial URL against whatever
  // routes exist in the file system before this component's state is
  // necessarily reflected in the mounted navigator, so a cold start could
  // land on (auth)/login even with a fully valid, already-refreshed
  // session — the API calls would succeed, but the screen wouldn't move.
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AutoUpdateMount />
        <OfflineSyncMount />
        {isLoading ? (
          <Loader />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
