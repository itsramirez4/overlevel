import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { authStore } from '../stores/authStore';
import { Loader } from '../components/ui/Loader';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { isLoading, isSignedIn } = useAuth();

  useEffect(() => {
    authStore.getState().checkAuth();
  }, []);

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
    return <Loader />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        {isSignedIn ? (
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        )}
      </Stack>
    </QueryClientProvider>
  );
}
