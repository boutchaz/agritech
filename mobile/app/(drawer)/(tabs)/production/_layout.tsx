import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ProductionTabLayout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="parcels" />
        <Stack.Screen name="farm-hierarchy" />
        <Stack.Screen name="parcel/[id]" />
      </Stack>
    </ErrorBoundary>
  );
}
