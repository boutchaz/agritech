// Team Members Screen
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/providers/ThemeProvider';
import { api } from '@/lib/api';

interface TeamMember {
  id: string;
  full_name?: string;
  email: string;
  role: string;
}

export default function TeamScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { colors: themeColors } = useTheme();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get<TeamMember[] | { data: TeamMember[] }>('/organization-users');
      const data = Array.isArray(response) ? response : (response as { data: TeamMember[] }).data || [];
      setMembers(data);
    } catch (error) {
      Alert.alert(
        t('settings.error', 'Error'),
        t('settings.teamFetchFailed', 'Failed to load team members.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = () => {
    Alert.alert(
      t('settings.inviteMember', 'Invite Member'),
      t('settings.inviteComingSoon', 'Team invitations will be available soon.'),
    );
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return themeColors.brandPrimary;
      case 'admin':
        return themeColors.warning;
      default:
        return themeColors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <PageHeader title={t('settings.team', 'Team Members')} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
          {t('settings.teamMembers', 'Team Members')}
        </Text>
        <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
          {t('settings.teamDescription', 'People with access to your organization')}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.brandPrimary} />
          </View>
        ) : members.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: themeColors.surfaceLowest }]}>
            <Ionicons name="people-outline" size={40} color={themeColors.iconSubtle} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              {t('settings.noMembers', 'No team members found')}
            </Text>
          </View>
        ) : (
          <View style={styles.memberList}>
            {members.map((member) => (
              <View
                key={member.id}
                style={[styles.memberCard, { backgroundColor: themeColors.surfaceLowest }]}
              >
                <View
                  style={[styles.avatarContainer, { backgroundColor: themeColors.brandContainer + '25' }]}
                >
                  <Ionicons name="person-outline" size={22} color={themeColors.brandPrimary} />
                </View>
                <View style={styles.memberContent}>
                  <Text style={[styles.memberName, { color: themeColors.textPrimary }]}>
                    {member.full_name || member.email}
                  </Text>
                  <Text style={[styles.memberEmail, { color: themeColors.textSecondary }]}>
                    {member.email}
                  </Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                  <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                    {member.role}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={[styles.inviteButton, { backgroundColor: themeColors.brandPrimary }]}
          onPress={handleInvite}
        >
          <Ionicons name="person-add-outline" size={20} color={themeColors.onBrand} />
          <Text style={[styles.inviteButtonText, { color: themeColors.onBrand }]}>
            {t('settings.inviteMember', 'Invite Member')}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
  },
  memberList: {
    gap: spacing.sm,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
