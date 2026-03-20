import { Stack } from 'expo-router';

export default function DomainLayout() {
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" /></Stack>;
}
