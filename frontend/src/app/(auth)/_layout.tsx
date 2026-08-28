import { Stack, Redirect, usePathname } from 'expo-router';
import { authStore } from '../../stores/authStore';

export default function AuthLayout() {
  const isSignedIn = authStore((s) => s.isSignedIn);
  const pathname = usePathname();

  // Already logged in (e.g. the token was still valid, or got silently
  // refreshed, by the time this mounted) — bounce straight to the app
  // instead of making the user look at a login screen for a session that's
  // already active. Except reset-password: tapping the recovery link while
  // already signed in on this device must still reach the reset form
  // instead of getting redirected away from it.
  if (isSignedIn && pathname !== '/reset-password') return <Redirect href="/(tabs)/dashboard" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
