import { useEffect } from 'react';
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
