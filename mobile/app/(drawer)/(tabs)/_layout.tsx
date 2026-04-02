import { Redirect, Tabs } from 'expo-router';
import { Platform, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';


type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, badge }: { name: IconName; color: string; badge?: number }) {
  return (
    <View>
      <Ionicons size={22} name={name} color={color} />
      {badge != null && badge > 0 && (
        <View style={tabStyles.badge}>
          <Text style={tabStyles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

type RoleShell = 'worker' | 'manager' | 'owner';

function resolveShell(role: UserRole | null): RoleShell {
  if (!role) return 'worker';
  if (role === 'system_admin' || role === 'organization_admin') return 'owner';
  if (role === 'farm_manager') return 'manager';
  return 'worker';
}

type TabConfig = {
  name: string;
  title: string;
  icon: IconName;
  showBadge?: boolean;
};

// ──────────────────────────────────────────────────────────────
// Role-based tab shells — max 4 tabs, focused on daily workflow
// ──────────────────────────────────────────────────────────────
const SHELLS: Record<RoleShell, TabConfig[]> = {
  // Worker: daily field work actions
  worker: [
    { name: 'index', title: 'Home', icon: 'home' },
    { name: 'tasks', title: 'My Tasks', icon: 'checkbox-outline' },
    { name: 'harvest', title: 'Record', icon: 'leaf' },
    { name: 'clock', title: 'Clock', icon: 'time-outline' },
  ],
  // Manager: oversight and coordination
  manager: [
    { name: 'index', title: 'Home', icon: 'home' },
    { name: 'harvest', title: 'Field', icon: 'leaf' },
    { name: 'team', title: 'Team', icon: 'people' },
    { name: 'alerts', title: 'Inbox', icon: 'notifications', showBadge: true },
  ],
  // Owner: executive view and decisions
  owner: [
    { name: 'index', title: 'Home', icon: 'stats-chart' },
    { name: 'farms-overview', title: 'Farms', icon: 'business' },
    { name: 'finance', title: 'Finance', icon: 'wallet' },
    { name: 'alerts', title: 'Inbox', icon: 'notifications', showBadge: true },
  ],
};

// All tab screen files must be registered even if hidden for a given role
const ALL_SCREENS = [
  'index', 'tasks', 'harvest', 'clock',
  'operations', 'team', 'alerts',
  'farms-overview', 'finance', 'approvals',
  'notifications',
  // Domain stacks (hidden from tab bar, accessible via drawer)
  'production',
];

export default function TabsLayout() {
  const { isAuthenticated, role } = useAuthStore();
  const { colors: themeColors, isDark } = useTheme();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const shell = resolveShell(role);
  const tabs = SHELLS[shell];
  const visibleTabs = new Set(tabs.map((t) => t.name));

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: themeColors.brandPrimary,
          tabBarInactiveTintColor: themeColors.iconSubtle,
          tabBarStyle: {
            backgroundColor: isDark ? themeColors.surface : themeColors.surfaceLowest,
            borderTopWidth: 0,
            paddingBottom: Platform.OS === 'ios' ? 4 : 8,
            paddingTop: 6,
            height: Platform.OS === 'ios' ? 80 : 64,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.3,
          },
          headerShown: false,
        }}
      >
        {ALL_SCREENS.map((screenName) => {
          const tabCfg = tabs.find((t) => t.name === screenName);
          const isVisible = visibleTabs.has(screenName);

          return (
            <Tabs.Screen
              key={screenName}
              name={screenName}
              options={{
                title: tabCfg?.title ?? screenName,
                href: isVisible ? undefined : null,
                tabBarIcon: tabCfg
                  ? ({ color }) => (
                      <TabIcon
                        name={tabCfg.icon}
                        color={color}
                      />
                    )
                  : undefined,
                tabBarAccessibilityLabel: `Switch to ${(tabCfg?.title ?? screenName).toLowerCase()} tab`,
                tabBarButton: (props) => {
                  const { accessibilityState, ref: _ignoredRef, ...buttonProps } = props as any;
                  return (
                    <Pressable
                      {...buttonProps}
                      accessibilityRole="tab"
                      accessibilityLabel={`Switch to ${(tabCfg?.title ?? screenName).toLowerCase()} tab`}
                      accessibilityState={{
                        ...accessibilityState,
                        selected: Boolean(accessibilityState?.selected),
                      }}
                    />
                  );
                },
              }}
            />
          );
        })}
      </Tabs>
    </ErrorBoundary>
  );
}
