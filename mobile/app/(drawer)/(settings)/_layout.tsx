import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="organization" />
      <Stack.Screen name="team" />
      <Stack.Screen name="language" />
      <Stack.Screen name="appearance" />
    </Stack>
  );
}
