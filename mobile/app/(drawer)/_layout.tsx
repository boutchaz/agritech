import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { Redirect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useTranslation } from 'react-i18next';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';
import { useAbility } from '@/hooks/useAbility';
import type { Action, Subject } from '@/lib/ability';
import { useAuthStore } from '@/stores/authStore';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type DomainItem = {
  key: string;
  route: Href;
  icon: IconName;
  labelKey: string;
  permission?: {
    action: Action;
    subject: Subject;
  };
};

const DOMAIN_ITEMS: DomainItem[] = [
  {
    key: 'home',
    route: '/(drawer)/(tabs)' as Href,
    icon: 'home-outline',
    labelKey: 'tabs.home',
  },
  {
    key: 'production',
    route: '/(drawer)/(production)' as Href,
    icon: 'leaf-outline',
    labelKey: 'domains.production',
    permission: { action: 'read', subject: 'Parcel' },
  },
  {
    key: 'workforce',
    route: '/(drawer)/(workforce)' as Href,
    icon: 'people-outline',
    labelKey: 'domains.workforce',
    permission: { action: 'read', subject: 'Task' },
  },
  {
    key: 'inventory',
    route: '/(drawer)/(inventory)' as Href,
    icon: 'cube-outline',
    labelKey: 'domains.inventory',
    permission: { action: 'read', subject: 'Inventory' },
  },
  {
    key: 'accounting',
    route: '/(drawer)/(accounting)' as Href,
    icon: 'wallet-outline',
    labelKey: 'domains.accounting',
    permission: { action: 'read', subject: 'Invoice' },
  },
  {
    key: 'settings',
    route: '/(drawer)/(settings)' as Href,
    icon: 'settings-outline',
    labelKey: 'domains.settings',
  },
  {
    key: 'misc',
    route: '/(drawer)/(misc)' as Href,
    icon: 'grid-outline',
    labelKey: 'domains.misc',
  },
];

function CustomDrawerContent({ navigation }: DrawerContentComponentProps) {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'common', 'navigation']);
  const { can } = useAbility();
  const profile = useAuthStore((state) => state.profile);
  const role = useAuthStore((state) => state.role);
  const abilities = useAuthStore((state) => state.abilities);
  const currentOrganization = useAuthStore((state) => state.currentOrganization);
  const signOut = useAuthStore((state) => state.signOut);

  const visibleItems = useMemo(
    () => DOMAIN_ITEMS.filter((item) => !item.permission || can(item.permission.action, item.permission.subject)),
    [can]
  );

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const roleLabel =
    abilities?.role?.display_name ||
    (role ? role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : null);

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

  return (
    <View style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Text style={styles.orgName}>{currentOrganization?.name ?? t('app.name', { ns: 'common' })}</Text>
        <Text style={styles.userName}>{userName || profile?.email || t('selectOrganization', { ns: 'auth' })}</Text>
        {roleLabel ? <Text style={styles.userRole}>{roleLabel}</Text> : null}
      </View>

      <ScrollView style={styles.itemsContainer} contentContainerStyle={styles.itemsContent}>
        {visibleItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.drawerItem}
            activeOpacity={0.75}
            onPress={() => {
              navigation.closeDrawer();
              router.push(item.route);
            }}
          >
            <Ionicons name={item.icon} size={22} color={colors.gray[600]} />
            <Text style={styles.drawerItemLabel}>{t(item.labelKey, { ns: 'navigation' })}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} activeOpacity={0.75} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={22} color={colors.red[600]} />
        <Text style={styles.logoutLabel}>{t('logout.title', { ns: 'auth' })}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DrawerLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profile = useAuthStore((state) => state.profile);
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
        sceneStyle: { backgroundColor: colors.gray[50] },
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
    backgroundColor: colors.white,
  },
  drawerHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl + spacing.lg,
    backgroundColor: colors.primary[600],
  },
  orgName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  userName: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.primary[100],
  },
  userRole: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.primary[200],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemsContainer: {
    flex: 1,
  },
  itemsContent: {
    paddingVertical: spacing.sm,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  drawerItemLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    padding: spacing.lg,
  },
  logoutLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.red[600],
  },
});
