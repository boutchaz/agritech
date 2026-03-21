import { Stack } from 'expo-router';

export default function WorkforceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="workers" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="time-logs" />
    </Stack>
  );
}
