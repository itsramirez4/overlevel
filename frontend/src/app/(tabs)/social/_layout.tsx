import { Stack } from 'expo-router';

export default function SocialLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="connections" />
      <Stack.Screen name="user/[id]" />
    </Stack>
  );
}
