import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { isAuthenticated, profile } = useAuthStore();
  const needsPasswordReset = isAuthenticated && profile?.password_set === false;

  if (isAuthenticated) {
    return <Redirect href={needsPasswordReset ? '/(auth)/set-password' : '/(tabs)'} />;
  }

  return <Redirect href="/(auth)/login" />;
}
