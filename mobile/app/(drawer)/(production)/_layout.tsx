import { Stack } from 'expo-router';

export default function ProductionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="parcels" />
      <Stack.Screen name="farm-hierarchy" />
      <Stack.Screen name="parcel/[id]" />
    </Stack>
  );
}
