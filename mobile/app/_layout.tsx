import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const { refreshSession, isLoading } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        await refreshSession();
      } catch (e) {
        console.warn('Failed to refresh session:', e);
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, [refreshSession]);

  if (isLoading) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.primary[600],
            },
            headerTintColor: colors.white,
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="task/[id]"
            options={{
              title: 'Task Details',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="harvest/new"
            options={{
              title: 'Record Harvest',
              presentation: 'modal',
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
