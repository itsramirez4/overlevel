import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { Loader } from '../components/ui/Loader';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

const queryClient = new QueryClient();

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

  if (isLoading) {
    return (
      <ErrorBoundary>
        <Loader />
      </ErrorBoundary>
    );
  }

  // Both groups are always declared here — which one the user actually
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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
