// Settings Hub Screen
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useAuthStore } from '@/stores/authStore';

function MenuCard({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.menuCard} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon as any} size={24} color={colors.primary[600]} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.currentOrganization);
  const signOut = useAuthStore((s) => s.signOut);

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout', 'Logout'),
      t('settings.logoutConfirm', 'Are you sure you want to logout?'),
      [
        { text: t('actions.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.logout', 'Logout'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('domains.settings', { ns: 'navigation', defaultValue: 'Settings' })}
        onMorePress={() => {}}
      />

      <View style={styles.content}>
        {/* Profile Section */}
        <SectionHeader title={t('settings.account', 'Account')} />

        <MenuCard
          icon="person-outline"
          title={t('settings.profile', 'Profile')}
          subtitle={user?.email || t('settings.manageProfile', 'Manage your profile')}
          onPress={() => {}}
        />

        <MenuCard
          icon="business-outline"
          title={t('settings.organization', 'Organization')}
          subtitle={organization?.name || t('settings.manageOrg', 'Manage organization')}
          onPress={() => {}}
        />

        <MenuCard
          icon="people-outline"
          title={t('settings.team', 'Team Members')}
          subtitle={t('settings.teamSubtitle', 'Manage team access')}
          onPress={() => {}}
        />

        {/* Preferences Section */}
        <SectionHeader title={t('settings.preferences', 'Preferences')} />

        <MenuCard
          icon="globe-outline"
          title={t('settings.language', 'Language')}
          subtitle="English, Français, العربية"
          onPress={() => {}}
        />

        <MenuCard
          icon="moon-outline"
          title={t('settings.theme', 'Theme')}
          subtitle={t('settings.themeSubtitle', 'Light, Dark, System')}
          onPress={() => router.push('/(drawer)/(settings)/appearance')}
        />

        <MenuCard
          icon="notifications-outline"
          title={t('settings.notifications', 'Notifications')}
          subtitle={t('settings.notificationsSubtitle', 'Configure alerts')}
          onPress={() => {}}
        />

        {/* Support Section */}
        <SectionHeader title={t('settings.support', 'Support')} />

        <MenuCard
          icon="help-circle-outline"
          title={t('settings.help', 'Help Center')}
          subtitle={t('settings.helpSubtitle', 'FAQs and guides')}
          onPress={() => {}}
        />

        <MenuCard
          icon="chatbubble-outline"
          title={t('settings.feedback', 'Send Feedback')}
          subtitle={t('settings.feedbackSubtitle', 'Report issues or suggest features')}
          onPress={() => {}}
        />

        <MenuCard
          icon="information-circle-outline"
          title={t('settings.about', 'About')}
          subtitle="AgriTech v1.0.0"
          onPress={() => {}}
        />

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.red[500]} />
          <Text style={styles.logoutText}>{t('settings.logout', 'Logout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    padding: spacing.md,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  menuTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  menuSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.red[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.red[500],
  },
});
