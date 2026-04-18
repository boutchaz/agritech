import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function SettingsLayout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="organization" />
        <Stack.Screen name="team" />
        <Stack.Screen name="language" />
        <Stack.Screen name="appearance" />
      </Stack>
    </ErrorBoundary>
  );
}
