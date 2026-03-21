import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { Redirect, useRouter, usePathname, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useTranslation } from 'react-i18next';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAbility } from '@/hooks/useAbility';
import type { Action, Subject } from '@/lib/ability';
import { useAuthStore } from '@/stores/authStore';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type NavItem = {
  key: string;
  route: Href;
  icon: IconName;
  labelKey: string;
  permission?: {
    action: Action;
    subject: Subject;
  };
};

type NavSection = {
  key: string;
  titleKey: string;
  items: NavItem[];
};

// ──────────────────────────────────────────────────────────────
// Drawer navigation grouped by domain
// ──────────────────────────────────────────────────────────────
const NAV_SECTIONS: NavSection[] = [
  {
    key: 'overview',
    titleKey: '',
    items: [
      {
        key: 'home',
        route: '/(drawer)/(tabs)' as Href,
        icon: 'home-outline',
        labelKey: 'tabs.home',
      },
    ],
  },
  {
    key: 'farm',
    titleKey: 'drawer.farmManagement',
    items: [
      {
        key: 'production',
        route: '/(drawer)/(tabs)/production' as Href,
        icon: 'leaf-outline',
        labelKey: 'domains.production',
        permission: { action: 'read', subject: 'Parcel' },
      },
      {
        key: 'inventory',
        route: '/(drawer)/(inventory)' as Href,
        icon: 'cube-outline',
        labelKey: 'domains.inventory',
        permission: { action: 'read', subject: 'Inventory' },
      },
    ],
  },
  {
    key: 'people',
    titleKey: 'drawer.peopleWork',
    items: [
      {
        key: 'workforce',
        route: '/(drawer)/(workforce)' as Href,
        icon: 'people-outline',
        labelKey: 'domains.workforce',
        permission: { action: 'read', subject: 'Task' },
      },
    ],
  },
  {
    key: 'business',
    titleKey: 'drawer.business',
    items: [
      {
        key: 'accounting',
        route: '/(drawer)/(accounting)' as Href,
        icon: 'wallet-outline',
        labelKey: 'domains.accounting',
        permission: { action: 'read', subject: 'Invoice' },
      },
    ],
  },
];

const SECTION_DEFAULTS: Record<string, string> = {
  farm: 'Farm Management',
  people: 'People & Work',
  business: 'Business',
};

const BOTTOM_ITEMS: NavItem[] = [
  {
    key: 'settings',
    route: '/(drawer)/(settings)' as Href,
    icon: 'settings-outline',
    labelKey: 'domains.settings',
  },
];

function CustomDrawerContent({ navigation }: DrawerContentComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation(['auth', 'common', 'navigation']);
  const { can } = useAbility();
  const { colors: themeColors } = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const role = useAuthStore((state) => state.role);
  const abilities = useAuthStore((state) => state.abilities);
  const currentOrganization = useAuthStore((state) => state.currentOrganization);
  const signOut = useAuthStore((state) => state.signOut);

  // Filter sections based on permissions, remove empty sections
  const visibleSections = useMemo(() => {
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permission || can(item.permission.action, item.permission.subject)
      ),
    })).filter((section) => section.items.length > 0);
  }, [can]);

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const initials =
    [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const roleLabel =
    abilities?.role?.display_name?.trim() ||
    (typeof role === 'string' && role.length > 0
      ? role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
      : null);

  function isActive(route: string) {
    // Check for tabs sub-routes like (tabs)/production
    if (route.includes('(tabs)/')) {
      const tabSubRoute = route.split('(tabs)/')[1];
      if (tabSubRoute) return pathname.includes(`/${tabSubRoute}`);
    }
    if (route.endsWith('(tabs)')) return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    const segment = route.match(/\((\w+)\)/)?.[1];
    return segment ? pathname.includes(`(${segment})`) : false;
  }

  async function handleSignOut() {
    Alert.alert(t('logout.title', { ns: 'auth' }), t('logout.confirm', { ns: 'auth' }), [
      {
        text: t('actions.cancel', { ns: 'common' }),
        style: 'cancel',
      },
      {
        text: t('logout.title', { ns: 'auth' }),
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  function renderItem(item: NavItem) {
    const active = isActive(item.route as string);
    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.drawerItem,
          {
            backgroundColor: active ? themeColors.brandContainer + '30' : 'transparent',
          },
        ]}
        activeOpacity={0.65}
        onPress={() => {
          navigation.closeDrawer();
          router.push(item.route);
        }}
      >
        <View
          style={[
            styles.itemIconWrap,
            {
              backgroundColor: active ? themeColors.brandContainer : themeColors.surfaceContainer,
            },
          ]}
        >
          <Ionicons
            name={active ? (item.icon.replace('-outline', '') as IconName) : item.icon}
            size={20}
            color={active ? themeColors.onBrand : themeColors.iconSubtle}
          />
        </View>
        <Text
          style={[
            styles.drawerItemLabel,
            {
              color: active ? themeColors.brandText : themeColors.textPrimary,
              fontWeight: active ? '600' : '400',
            },
          ]}
        >
          {t(item.labelKey, { ns: 'navigation' })}
        </Text>
        {active && (
          <View style={[styles.activeIndicator, { backgroundColor: themeColors.brandPrimary }]} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.drawerContainer, { backgroundColor: themeColors.background }]}>
      {/* Profile header */}
      <TouchableOpacity
        style={[styles.drawerHeader, { backgroundColor: themeColors.brandContainer }]}
        activeOpacity={0.8}
        onPress={() => {
          navigation.closeDrawer();
          router.push('/(drawer)/(settings)' as Href);
        }}
      >
        <View style={[styles.avatar, { backgroundColor: themeColors.brandPrimary }]}>
          <Text style={[styles.avatarText, { color: themeColors.onBrand }]}>{initials}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.userName, { color: themeColors.onBrand }]} numberOfLines={1}>
            {userName || profile?.email || t('selectOrganization', { ns: 'auth' })}
          </Text>
          {roleLabel ? (
            <Text style={[styles.userRole, { color: themeColors.brandText }]}>{roleLabel}</Text>
          ) : null}
          <Text style={[styles.orgName, { color: themeColors.brandText }]} numberOfLines={1}>
            {currentOrganization?.name ?? t('app.name', { ns: 'common' })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={themeColors.brandText} />
      </TouchableOpacity>

      {/* Grouped navigation */}
      <ScrollView
        style={styles.itemsContainer}
        contentContainerStyle={styles.itemsContent}
        showsVerticalScrollIndicator={false}
      >
        {visibleSections.map((section, sectionIdx) => (
          <View key={section.key}>
            {/* Section header (skip for first "overview" section with no title) */}
            {section.titleKey ? (
              <Text style={[styles.sectionTitle, { color: themeColors.textTertiary }]}>
                {t(section.titleKey, { ns: 'navigation', defaultValue: SECTION_DEFAULTS[section.key] ?? section.key })}
              </Text>
            ) : null}
            {section.items.map(renderItem)}
            {/* Divider between groups (not after last) */}
            {sectionIdx < visibleSections.length - 1 && (
              <View style={[styles.divider, { backgroundColor: themeColors.outlineVariant }]} />
            )}
          </View>
        ))}
      </ScrollView>

      {/* Bottom: Settings + Logout */}
      <View style={[styles.bottomSection, { borderTopColor: themeColors.outlineVariant }]}>
        {BOTTOM_ITEMS.map(renderItem)}

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.65}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={themeColors.error} />
          <Text style={[styles.logoutLabel, { color: themeColors.error }]}>
            {t('logout.title', { ns: 'auth' })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profile = useAuthStore((state) => state.profile);
  const { colors: themeColors } = useTheme();
  const needsPasswordReset = isAuthenticated && profile?.password_set === false;

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (needsPasswordReset) {
    return <Redirect href="/(auth)/set-password" />;
  }

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 280 },
        sceneStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Drawer.Screen name="(tabs)" options={{ headerShown: false }} />
      <Drawer.Screen name="(production)" options={{ headerShown: false }} />
      <Drawer.Screen name="(workforce)" options={{ headerShown: false }} />
      <Drawer.Screen name="(inventory)" options={{ headerShown: false }} />
      <Drawer.Screen name="(accounting)" options={{ headerShown: false }} />
      <Drawer.Screen name="(settings)" options={{ headerShown: false }} />
      <Drawer.Screen name="(misc)" options={{ headerShown: false }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl + spacing.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userRole: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  orgName: {
    marginTop: 2,
    fontSize: 12,
    opacity: 0.8,
  },
  itemsContainer: {
    flex: 1,
  },
  itemsContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginVertical: 1,
    borderRadius: 12,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemLabel: {
    flex: 1,
    fontSize: 14,
  },
  activeIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
  },
  bottomSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginVertical: 1,
  },
  logoutLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
