import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function WorkforceLayout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="workers" />
        <Stack.Screen name="[id]" />
        <Stack.Screen name="time-logs" />
      </Stack>
    </ErrorBoundary>
  );
}
