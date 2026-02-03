import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function AuthLayout() {
  const { isAuthenticated, profile } = useAuthStore();
  const needsPasswordReset = isAuthenticated && profile?.password_set === false;

  if (isAuthenticated && !needsPasswordReset) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="set-password" />
    </Stack>
  );
}
