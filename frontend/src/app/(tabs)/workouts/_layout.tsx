import { Stack } from 'expo-router';

export default function WorkoutsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="log" />
      <Stack.Screen name="history" />
      <Stack.Screen name="add-exercise" />
      <Stack.Screen name="detail" />
    </Stack>
  );
}
