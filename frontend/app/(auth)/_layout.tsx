import { Stack, Redirect } from 'expo-router';
import { authStore } from '../../stores/authStore';

export default function AuthLayout() {
  const isSignedIn = authStore((s) => s.isSignedIn);
  // Already logged in (e.g. the token was still valid, or got silently
  // refreshed, by the time this mounted) — bounce straight to the app
  // instead of making the user look at a login screen for a session that's
  // already active.
  if (isSignedIn) return <Redirect href="/(tabs)/dashboard" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
