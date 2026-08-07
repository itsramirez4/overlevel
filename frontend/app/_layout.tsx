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
  // /users/me request twice on every app launch.
  const { isLoading, isSignedIn } = useAuth();

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

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          {isSignedIn ? (
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          ) : (
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          )}
        </Stack>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
