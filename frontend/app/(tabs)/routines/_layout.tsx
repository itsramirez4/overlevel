import { Stack } from 'expo-router';

export default function RoutinesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="create" />
      <Stack.Screen name="add-exercise" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="trash" />
    </Stack>
  );
}
