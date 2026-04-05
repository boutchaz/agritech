import { Redirect, Stack, type Href } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';

const authenticatedHome = '/(drawer)/(tabs)' as Href;

export default function AuthLayout() {
  const { isAuthenticated, profile } = useAuthStore();
  const needsPasswordReset = isAuthenticated && profile?.password_set === false;

  if (isAuthenticated && !needsPasswordReset) {
    return <Redirect href={authenticatedHome} />;
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="set-password" />
      </Stack>
    </ErrorBoundary>
  );
}
