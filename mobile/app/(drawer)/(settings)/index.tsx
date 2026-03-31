// Settings Hub Screen
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import PageHeader from '@/components/PageHeader';
import { useAuthStore } from '@/stores/authStore';

function MenuCard({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  themeColors,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Pressable
      style={[styles.menuCard, { backgroundColor: themeColors.surfaceLowest }]}
      onPress={onPress}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: themeColors.brandContainer + '25' }]}>
        <Ionicons name={icon as any} size={22} color={themeColors.brandPrimary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color: themeColors.textPrimary }]}>{title}</Text>
        <Text style={[styles.menuSubtitle, { color: themeColors.textSecondary }]}>{subtitle}</Text>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={18} color={themeColors.iconSubtle} />}
    </Pressable>
  );
}

function SectionHeader({ title, themeColors }: { title: string; themeColors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Text style={[styles.sectionHeader, { color: themeColors.textTertiary }]}>{title}</Text>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { colors: themeColors } = useTheme();
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
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <PageHeader
        title={t('domains.settings', { ns: 'navigation', defaultValue: 'Settings' })}
        onMorePress={() => {}}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Account Section */}
        <SectionHeader title={t('settings.account', 'Account')} themeColors={themeColors} />

        <MenuCard
          icon="person-outline"
          title={t('settings.profile', 'Profile')}
          subtitle={user?.email || t('settings.manageProfile', 'Manage your profile')}
          onPress={() => router.push('/(drawer)/(settings)/profile')}
          themeColors={themeColors}
        />

        <MenuCard
          icon="business-outline"
          title={t('settings.organization', 'Organization')}
          subtitle={organization?.name || t('settings.manageOrg', 'Manage organization')}
          onPress={() => router.push('/(drawer)/(settings)/organization')}
          themeColors={themeColors}
        />

        <MenuCard
          icon="people-outline"
          title={t('settings.team', 'Team Members')}
          subtitle={t('settings.teamSubtitle', 'Manage team access')}
          onPress={() => router.push('/(drawer)/(settings)/team')}
          themeColors={themeColors}
        />

        {/* Preferences Section */}
        <SectionHeader title={t('settings.preferences', 'Preferences')} themeColors={themeColors} />

        <MenuCard
          icon="globe-outline"
          title={t('settings.language', 'Language')}
          subtitle="English, Français, العربية"
          onPress={() => router.push('/(drawer)/(settings)/language')}
          themeColors={themeColors}
        />

        <MenuCard
          icon="moon-outline"
          title={t('settings.theme', 'Theme')}
          subtitle={t('settings.themeSubtitle', 'Light, Dark, System')}
          onPress={() => router.push('/(drawer)/(settings)/appearance')}
          themeColors={themeColors}
        />

        <MenuCard
          icon="notifications-outline"
          title={t('settings.notifications', 'Notifications')}
          subtitle={t('settings.notificationsSubtitle', 'Configure alerts')}
          onPress={() => {}}
          themeColors={themeColors}
        />

        {/* Support Section */}
        <SectionHeader title={t('settings.support', 'Support')} themeColors={themeColors} />

        <MenuCard
          icon="help-circle-outline"
          title={t('settings.help', 'Help Center')}
          subtitle={t('settings.helpSubtitle', 'FAQs and guides')}
          onPress={() => {}}
          themeColors={themeColors}
        />

        <MenuCard
          icon="chatbubble-outline"
          title={t('settings.feedback', 'Send Feedback')}
          subtitle={t('settings.feedbackSubtitle', 'Report issues or suggest features')}
          onPress={() => {}}
          themeColors={themeColors}
        />

        <MenuCard
          icon="information-circle-outline"
          title={t('settings.about', 'About')}
          subtitle="AgriTech v1.0.0"
          onPress={() => {}}
          themeColors={themeColors}
        />

        {/* Legal Section */}
        <SectionHeader title={t('settings.legal', 'Legal')} themeColors={themeColors} />

        <MenuCard
          icon="document-text-outline"
          title={t('settings.termsOfService', "Conditions Générales d'Utilisation")}
          subtitle={t('settings.termsSubtitle', "Règles d'utilisation de la plateforme")}
          onPress={() => Linking.openURL('https://app.agrogina.com/terms-of-service')}
          themeColors={themeColors}
        />

        <MenuCard
          icon="shield-checkmark-outline"
          title={t('settings.privacyPolicy', 'Politique de Confidentialité')}
          subtitle={t('settings.privacySubtitle', 'Protection de vos données')}
          onPress={() => Linking.openURL('https://app.agrogina.com/privacy-policy')}
          themeColors={themeColors}
        />

        {/* Logout */}
        <Pressable
          style={[styles.logoutButton, { backgroundColor: themeColors.errorContainer }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color={themeColors.error} />
          <Text style={[styles.logoutText, { color: themeColors.error }]}>
            {t('settings.logout', 'Logout')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl + spacing.xl,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xs,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
