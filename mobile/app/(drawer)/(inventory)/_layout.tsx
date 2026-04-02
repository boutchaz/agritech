import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function InventoryLayout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="items/index" />
        <Stack.Screen name="items/[id]" />
        <Stack.Screen name="entries/index" />
        <Stack.Screen name="entries/new" />
        <Stack.Screen name="warehouses" />
      </Stack>
    </ErrorBoundary>
  );
}
