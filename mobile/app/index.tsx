import { Redirect, type Href } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

const authenticatedHome = '/(drawer)/(tabs)' as Href;

export default function Index() {
  const { isAuthenticated, profile } = useAuthStore();
  const needsPasswordReset = isAuthenticated && profile?.password_set === false;

  if (isAuthenticated) {
    return <Redirect href={needsPasswordReset ? '/(auth)/set-password' : authenticatedHome} />;
  }

  return <Redirect href="/(auth)/login" />;
}
