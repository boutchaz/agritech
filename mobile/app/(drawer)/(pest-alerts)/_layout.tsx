import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function PestAlertsLayout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="list" />
        <Stack.Screen name="[id]" />
        <Stack.Screen name="new" options={{ presentation: 'modal' }} />
      </Stack>
    </ErrorBoundary>
  );
}
