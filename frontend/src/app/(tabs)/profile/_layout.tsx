import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="character" />
      <Stack.Screen name="bestiary" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="exercises" />
      <Stack.Screen name="exercise-edit" />
      <Stack.Screen name="exercise-trash" />
      <Stack.Screen name="exercise-merge" />
    </Stack>
  );
}
