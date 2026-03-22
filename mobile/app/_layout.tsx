import '@/lib/i18n';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { registerForPushNotifications } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function CustomSplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>AgroGina</Text>
        <Text style={styles.logoSubtext}>Field</Text>
      </View>
      <ActivityIndicator size="large" color={colors.white} style={styles.loader} />
    </View>
  );
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function prepare() {
      try {
        const { refreshSession } = useAuthStore.getState();
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        await Promise.race([
          refreshSession(),
          timeoutPromise
        ]).catch((e) => {
          console.warn('Session refresh failed or timed out:', e);
        });
      } catch (e) {
        console.warn('Failed to prepare app:', e);
        if (mounted) setError(String(e));
      } finally {
        if (mounted) {
          setAppIsReady(true);
          SplashScreen.hideAsync().catch(() => {});
        }
      }
    }
    
    prepare();
    
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    registerForPushNotifications();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const taskId = response.notification.request.content.data.taskId;
      if (taskId) {
        router.push(`/task/${taskId}`);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!appIsReady) {
    return <CustomSplashScreen />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Something went wrong</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
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
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(drawer)" options={{ headerShown: false, title: '' }} />
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
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 2,
  },
  logoSubtext: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.primary[100],
    marginTop: -4,
  },
  loader: {
    marginTop: 40,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.red[50],
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.red[600],
    marginBottom: 10,
  },
  errorDetail: {
    fontSize: 14,
    color: colors.red[500],
    textAlign: 'center',
  },
});
