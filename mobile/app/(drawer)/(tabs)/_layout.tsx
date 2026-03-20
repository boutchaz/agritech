import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { palette } from '@/constants/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <Ionicons size={22} name={name} color={color} />;
}

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
};

const SHELLS: Record<RoleShell, TabConfig[]> = {
  worker: [
    { name: 'index', title: 'Home', icon: 'home' },
    { name: 'tasks', title: 'Tasks', icon: 'checkbox' },
    { name: 'harvest', title: 'Harvest', icon: 'leaf' },
    { name: 'clock', title: 'Clock', icon: 'time' },
    { name: 'profile', title: 'Profile', icon: 'person' },
  ],
  manager: [
    { name: 'index', title: 'Overview', icon: 'grid' },
    { name: 'operations', title: 'Operations', icon: 'construct' },
    { name: 'team', title: 'Team', icon: 'people' },
    { name: 'harvest', title: 'Harvest', icon: 'leaf' },
    { name: 'alerts', title: 'Alerts', icon: 'notifications' },
  ],
  owner: [
    { name: 'index', title: 'Executive', icon: 'stats-chart' },
    { name: 'farms-overview', title: 'Farms', icon: 'business' },
    { name: 'finance', title: 'Finance', icon: 'wallet' },
    { name: 'approvals', title: 'Approvals', icon: 'checkmark-done' },
    { name: 'alerts', title: 'Alerts', icon: 'notifications' },
  ],
};

const ALL_SCREENS = [
  'index', 'tasks', 'harvest', 'clock', 'profile',
  'operations', 'team', 'alerts',
  'farms-overview', 'finance', 'approvals',
];

export default function TabsLayout() {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const shell = resolveShell(role);
  const visibleTabs = new Set(SHELLS[shell].map((t) => t.name));

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.outline,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 6,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },
        headerShown: false,
      }}
    >
      {ALL_SCREENS.map((screenName) => {
        const tabCfg = SHELLS[shell].find((t) => t.name === screenName);
        const isVisible = visibleTabs.has(screenName);

        return (
          <Tabs.Screen
            key={screenName}
            name={screenName}
            options={{
              title: tabCfg?.title ?? screenName,
              href: isVisible ? undefined : null,
              tabBarIcon: tabCfg
                ? ({ color }) => <TabIcon name={tabCfg.icon} color={color} />
                : undefined,
            }}
          />
        );
      })}
    </Tabs>
  );
}
