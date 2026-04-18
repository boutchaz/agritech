// Team Members Screen - Organization Users Management
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/providers/ThemeProvider';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Role {
  id: string;
  name: string;
  display_name: string;
  level: number;
}

interface OrganizationUser {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  is_active: boolean;
  created_at?: string;
  full_name?: string;
  user_profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  roles?: {
    id: string;
    name: string;
    display_name: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  system_admin: { icon: 'shield-checkmark', color: '#7c3aed' },
  organization_admin: { icon: 'settings', color: '#2563eb' },
  farm_manager: { icon: 'leaf', color: '#16a34a' },
  farm_worker: { icon: 'person', color: '#ca8a04' },
  day_laborer: { icon: 'people', color: '#6b7280' },
  viewer: { icon: 'eye', color: '#9ca3af' },
};

function getRoleConfig(roleName: string) {
  return ROLE_CONFIG[roleName] || ROLE_CONFIG.viewer;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TeamScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { colors: themeColors } = useTheme();
  const { user: currentUser, currentOrganization, role: currentRole } = useAuthStore();

  const [members, setMembers] = useState<OrganizationUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Role picker modal
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [rolePickerTarget, setRolePickerTarget] = useState<OrganizationUser | null>(null);
  const [rolePickerMode, setRolePickerMode] = useState<'change' | 'invite'>('change');

  // Password modal state
  const [passwordUser, setPasswordUser] = useState<OrganizationUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [passwordExpiry, setPasswordExpiry] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const orgId = currentOrganization?.id;
  const isAdmin = currentRole === 'system_admin' || currentRole === 'organization_admin';

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    try {
      const response = await api.get<{ data: OrganizationUser[] } | OrganizationUser[]>('/organization-users');
      // API may return { data: [...] } or the array directly
      const list = Array.isArray(response) ? response : (response?.data || []);
      setMembers(list);
    } catch (err) {
      if (__DEV__) console.error('[Team] fetchMembers error:', err);
      Alert.alert(
        t('settings.error', 'Error'),
        t('settings.teamFetchFailed', 'Failed to load team members.'),
      );
    }
  }, [orgId, t]);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await api.get<Role[]>('/roles');
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      // Roles are optional for display
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMembers(), fetchRoles()]);
    setLoading(false);
  }, [fetchMembers, fetchRoles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMembers(), fetchRoles()]);
    setRefreshing(false);
  }, [fetchMembers, fetchRoles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter roles to those at or below current user's level
  const getAvailableRoles = useCallback(() => {
    if (!roles.length) return [];
    const currentOrgRole = currentOrganization?.role;
    if (currentRole === 'system_admin') return roles;
    const currentRoleData = roles.find((r) => r.name === currentOrgRole || r.name === currentRole);
    if (!currentRoleData) return roles;
    return roles.filter((r) => r.level >= currentRoleData.level);
  }, [roles, currentRole, currentOrganization?.role]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleInvite = async () => {
    if (!orgId || !inviteEmail.trim() || !inviteRoleId) {
      Alert.alert(
        t('settings.error', 'Error'),
        t('settings.inviteFieldsRequired', 'Email and role are required.'),
      );
      return;
    }

    setInviteLoading(true);
    try {
      // Call the organization-users invite endpoint through the API
      await api.post('/organization-users/invite', {
        email: inviteEmail.trim().toLowerCase(),
        role_id: inviteRoleId,
        organization_id: orgId,
        first_name: inviteFirstName.trim(),
        last_name: inviteLastName.trim(),
      });

      Alert.alert(
        t('settings.success', 'Success'),
        t('settings.inviteSuccess', 'Invitation sent successfully.'),
      );
      setShowInvite(false);
      resetInviteForm();
      await fetchMembers();
    } catch (error) {
      Alert.alert(
        t('settings.error', 'Error'),
        error instanceof Error ? error.message : t('settings.inviteFailed', 'Failed to send invitation.'),
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const resetInviteForm = () => {
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
    setInviteRoleId('');
  };

  const handleUpdateRole = async (userId: string, newRoleId: string) => {
    if (!orgId) return;
    try {
      await api.patch(`/organization-users/${userId}`, { role_id: newRoleId });
      await fetchMembers();
      Alert.alert(
        t('settings.success', 'Success'),
        t('settings.roleUpdated', 'Role updated successfully.'),
      );
    } catch (error) {
      Alert.alert(
        t('settings.error', 'Error'),
        error instanceof Error ? error.message : t('settings.roleUpdateFailed', 'Failed to update role.'),
      );
    }
  };

  const handleToggleStatus = (member: OrganizationUser) => {
    if (!orgId || member.user_id === currentUser?.id) return;

    const newStatus = !member.is_active;
    const action = newStatus
      ? t('settings.activate', 'activate')
      : t('settings.deactivate', 'deactivate');

    Alert.alert(
      t('settings.confirmAction', 'Confirm'),
      t('settings.confirmToggleStatus', `Are you sure you want to ${action} this member?`, { action }),
      [
        { text: t('settings.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.confirm', 'Confirm'),
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/organization-users/${member.user_id}`, {
                is_active: newStatus,
              });
              await fetchMembers();
            } catch (error) {
              Alert.alert(
                t('settings.error', 'Error'),
                error instanceof Error
                  ? error.message
                  : t('settings.statusUpdateFailed', 'Failed to update status.'),
              );
            }
          },
        },
      ],
    );
  };

  const handleRemoveMember = (member: OrganizationUser) => {
    if (!orgId || member.user_id === currentUser?.id) return;

    Alert.alert(
      t('settings.removeMember', 'Remove Member'),
      t('settings.confirmRemove', 'Are you sure you want to remove this member? This action cannot be undone.'),
      [
        { text: t('settings.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.remove', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/organization-users/${member.user_id}`);
              await fetchMembers();
              Alert.alert(
                t('settings.success', 'Success'),
                t('settings.memberRemoved', 'Member removed successfully.'),
              );
            } catch (error) {
              Alert.alert(
                t('settings.error', 'Error'),
                error instanceof Error
                  ? error.message
                  : t('settings.removeFailed', 'Failed to remove member.'),
              );
            }
          },
        },
      ],
    );
  };

  const handleViewPassword = async (member: OrganizationUser) => {
    if (!orgId) return;

    setPasswordUser(member);
    setPasswordLoading(true);
    setTempPassword('');

    try {
      const result = await api.get<{ temp_password: string; expires_at: string }>(
        `/organization-users/${member.user_id}/temp-password`,
      );
      setTempPassword(result.temp_password);
      setPasswordExpiry(result.expires_at);
    } catch {
      setTempPassword('');
      setPasswordExpiry('');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!orgId || !passwordUser) return;

    setPasswordLoading(true);
    try {
      const result = await api.post<{
        temp_password: string;
        expires_at: string;
      }>(`/organization-users/${passwordUser.user_id}/reset-password`);
      setTempPassword(result.temp_password);
      setPasswordExpiry(result.expires_at);
      Alert.alert(
        t('settings.success', 'Success'),
        t('settings.passwordReset', 'Password has been reset.'),
      );
    } catch (error) {
      Alert.alert(
        t('settings.error', 'Error'),
        error instanceof Error
          ? error.message
          : t('settings.passwordResetFailed', 'Failed to reset password.'),
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSharePassword = async () => {
    if (!tempPassword) return;
    const memberName = getMemberName(passwordUser!);
    try {
      await Share.share({
        message: t(
          'settings.sharePasswordMessage',
          `Temporary password for ${memberName}: ${tempPassword}`,
          { name: memberName, password: tempPassword },
        ),
      });
    } catch {
      // User cancelled share
    }
  };

  const openRolePickerForMember = (member: OrganizationUser) => {
    setRolePickerTarget(member);
    setRolePickerMode('change');
    setShowRolePicker(true);
  };

  const openRolePickerForInvite = () => {
    setRolePickerTarget(null);
    setRolePickerMode('invite');
    setShowRolePicker(true);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getMemberName = (member: OrganizationUser) => {
    if (member.full_name?.trim()) return member.full_name;
    // user_profiles can be an array (Supabase join) or single object
    const profile = Array.isArray(member.user_profiles)
      ? member.user_profiles[0]
      : member.user_profiles;
    if (profile) {
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      if (name) return name;
      if (profile.email) return profile.email;
    }
    return t('settings.unknownUser', 'Unknown User');
  };

  const getMemberEmail = (member: OrganizationUser) => {
    const profile = Array.isArray(member.user_profiles)
      ? member.user_profiles[0]
      : member.user_profiles;
    return profile?.email || '';
  };

  const getMemberRole = (member: OrganizationUser) => {
    // roles can be an array (Supabase join) or single object
    const role = Array.isArray(member.roles) ? member.roles[0] : member.roles;
    return role || { name: 'viewer', display_name: 'Viewer', id: member.role_id };
  };

  const getRoleDisplayName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.display_name || roleId;
  };

  const canModifyMember = (member: OrganizationUser) => {
    if (!isAdmin) return false;
    if (member.user_id === currentUser?.id && currentRole !== 'system_admin') return false;
    return true;
  };

  const isWorkerRole = (member: OrganizationUser) => {
    const role = getMemberRole(member);
    return role.name === 'farm_worker';
  };

  const showMemberActions = (member: OrganizationUser) => {
    if (!canModifyMember(member) && member.user_id === currentUser?.id) return;

    const actions: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }> = [];

    if (canModifyMember(member)) {
      actions.push({
        text: t('settings.changeRole', 'Change Role'),
        onPress: () => openRolePickerForMember(member),
      });

      actions.push({
        text: member.is_active
          ? t('settings.deactivateUser', 'Deactivate')
          : t('settings.activateUser', 'Activate'),
        onPress: () => handleToggleStatus(member),
      });

      if (isWorkerRole(member)) {
        actions.push({
          text: t('settings.managePassword', 'Manage Password'),
          onPress: () => handleViewPassword(member),
        });
      }
    }

    if (isAdmin && member.user_id !== currentUser?.id) {
      actions.push({
        text: t('settings.removeMember', 'Remove Member'),
        style: 'destructive',
        onPress: () => handleRemoveMember(member),
      });
    }

    actions.push({ text: t('settings.cancel', 'Cancel'), style: 'cancel' });

    Alert.alert(
      getMemberName(member),
      getMemberEmail(member) || undefined,
      actions,
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderMemberCard = (member: OrganizationUser) => {
    const name = getMemberName(member);
    const email = getMemberEmail(member);
    const role = getMemberRole(member);
    const roleConfig = getRoleConfig(role.name);
    const isCurrentUser = member.user_id === currentUser?.id;
    const canModify = canModifyMember(member);

    return (
      <Pressable
        key={member.id || member.user_id}
        style={[styles.memberCard, { backgroundColor: themeColors.surfaceLowest }]}
        onPress={() => showMemberActions(member)}
        android_ripple={{ color: themeColors.brandContainer + '30' }}
      >
        {/* Avatar */}
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: roleConfig.color + '18' },
          ]}
        >
          <Text style={[styles.avatarText, { color: roleConfig.color }]}>
            {getInitials(name)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.memberContent}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.memberName, { color: themeColors.textPrimary }]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {isCurrentUser && (
              <View style={[styles.youBadge, { backgroundColor: themeColors.brandContainer + '30' }]}>
                <Text style={[styles.youText, { color: themeColors.brandPrimary }]}>
                  {t('settings.you', 'You')}
                </Text>
              </View>
            )}
          </View>

          {email ? (
            <Text
              style={[styles.memberEmail, { color: themeColors.textSecondary }]}
              numberOfLines={1}
            >
              {email}
            </Text>
          ) : null}

          <View style={styles.badgeRow}>
            {/* Role badge */}
            <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '15' }]}>
              <Ionicons name={roleConfig.icon} size={12} color={roleConfig.color} />
              <Text style={[styles.roleText, { color: roleConfig.color }]}>
                {role.display_name || role.name}
              </Text>
            </View>

            {/* Status badge */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: member.is_active
                    ? themeColors.success + '15'
                    : themeColors.error + '15',
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: member.is_active
                      ? themeColors.success
                      : themeColors.error,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: member.is_active
                      ? themeColors.success
                      : themeColors.error,
                  },
                ]}
              >
                {member.is_active
                  ? t('settings.active', 'Active')
                  : t('settings.inactive', 'Inactive')}
              </Text>
            </View>
          </View>

          {member.created_at && (
            <Text style={[styles.joinedText, { color: themeColors.textTertiary }]}>
              {t('settings.joined', 'Joined')}{' '}
              {new Date(member.created_at).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Action indicator */}
        {(canModify || (isAdmin && !isCurrentUser)) && (
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={themeColors.textSecondary}
          />
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <PageHeader title={t('settings.team', 'Team Members')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.brandPrimary}
          />
        }
      >
        {/* Header section */}
        <View style={styles.headerSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            {t('settings.teamMembers', 'Team Members')}
          </Text>
          <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
            {t('settings.teamDescription', 'People with access to your organization')}
          </Text>
          {members.length > 0 && (
            <Text style={[styles.countText, { color: themeColors.textTertiary }]}>
              {t('settings.memberCount', '{{count}} members', { count: members.length })}
            </Text>
          )}
        </View>

        {/* Loading */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.brandPrimary} />
          </View>
        ) : members.length === 0 ? (
          /* Empty state */
          <View style={[styles.emptyCard, { backgroundColor: themeColors.surfaceLowest }]}>
            <Ionicons name="people-outline" size={48} color={themeColors.iconSubtle} />
            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
              {t('settings.noMembersTitle', 'No team members')}
            </Text>
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              {t('settings.noMembers', 'Invite people to collaborate on your organization.')}
            </Text>
          </View>
        ) : (
          /* Member list */
          <View style={styles.memberList}>{members.map(renderMemberCard)}</View>
        )}

        {/* Invite button */}
        {isAdmin && (
          <Pressable
            style={[styles.inviteButton, { backgroundColor: themeColors.brandPrimary }]}
            onPress={() => setShowInvite(true)}
          >
            <Ionicons name="person-add-outline" size={20} color={themeColors.onBrand} />
            <Text style={[styles.inviteButtonText, { color: themeColors.onBrand }]}>
              {t('settings.inviteMember', 'Invite Member')}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ─── Invite Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={showInvite}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowInvite(false);
          resetInviteForm();
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.outlineVariant }]}>
            <Pressable
              onPress={() => {
                setShowInvite(false);
                resetInviteForm();
              }}
            >
              <Text style={[styles.modalCancel, { color: themeColors.textSecondary }]}>
                {t('settings.cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              {t('settings.inviteMember', 'Invite Member')}
            </Text>
            <Pressable
              onPress={handleInvite}
              disabled={inviteLoading || !inviteEmail.trim() || !inviteRoleId}
            >
              <Text
                style={[
                  styles.modalSave,
                  {
                    color:
                      inviteLoading || !inviteEmail.trim() || !inviteRoleId
                        ? themeColors.textTertiary
                        : themeColors.brandPrimary,
                  },
                ]}
              >
                {inviteLoading
                  ? t('settings.sending', 'Sending...')
                  : t('settings.invite', 'Invite')}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.modalDescription, { color: themeColors.textSecondary }]}>
              {t(
                'settings.inviteDescription',
                'Send an invitation to join your organization.',
              )}
            </Text>

            {/* Email */}
            <Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>
              {t('settings.email', 'Email')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.surfaceLowest,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.outlineVariant,
                },
              ]}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder={t('settings.emailPlaceholder', 'email@example.com')}
              placeholderTextColor={themeColors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Name fields */}
            <View style={styles.nameFields}>
              <View style={styles.nameField}>
                <Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>
                  {t('settings.firstName', 'First Name')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: themeColors.surfaceLowest,
                      color: themeColors.textPrimary,
                      borderColor: themeColors.outlineVariant,
                    },
                  ]}
                  value={inviteFirstName}
                  onChangeText={setInviteFirstName}
                  placeholder={t('settings.firstNamePlaceholder', 'First name')}
                  placeholderTextColor={themeColors.textTertiary}
                />
              </View>
              <View style={styles.nameField}>
                <Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>
                  {t('settings.lastName', 'Last Name')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: themeColors.surfaceLowest,
                      color: themeColors.textPrimary,
                      borderColor: themeColors.outlineVariant,
                    },
                  ]}
                  value={inviteLastName}
                  onChangeText={setInviteLastName}
                  placeholder={t('settings.lastNamePlaceholder', 'Last name')}
                  placeholderTextColor={themeColors.textTertiary}
                />
              </View>
            </View>

            {/* Role selector */}
            <Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>
              {t('settings.role', 'Role')} *
            </Text>
            <Pressable
              style={[
                styles.input,
                styles.roleSelector,
                {
                  backgroundColor: themeColors.surfaceLowest,
                  borderColor: themeColors.outlineVariant,
                },
              ]}
              onPress={openRolePickerForInvite}
            >
              <Text
                style={{
                  color: inviteRoleId ? themeColors.textPrimary : themeColors.textTertiary,
                  fontSize: 15,
                }}
              >
                {inviteRoleId
                  ? getRoleDisplayName(inviteRoleId)
                  : t('settings.selectRole', 'Select a role...')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={themeColors.textSecondary} />
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Role Picker Modal ────────────────────────────────────────────── */}
      <Modal
        visible={showRolePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRolePicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.outlineVariant }]}>
            <Pressable onPress={() => setShowRolePicker(false)}>
              <Text style={[styles.modalCancel, { color: themeColors.textSecondary }]}>
                {t('settings.cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              {t('settings.selectRole', 'Select Role')}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {getAvailableRoles().map((role) => {
              const config = getRoleConfig(role.name);
              const isSelected =
                rolePickerMode === 'invite'
                  ? inviteRoleId === role.id
                  : rolePickerTarget?.role_id === role.id;

              return (
                <Pressable
                  key={role.id}
                  style={[
                    styles.roleOption,
                    {
                      backgroundColor: isSelected
                        ? config.color + '12'
                        : themeColors.surfaceLowest,
                      borderColor: isSelected ? config.color + '40' : themeColors.outlineVariant,
                    },
                  ]}
                  onPress={() => {
                    if (rolePickerMode === 'invite') {
                      setInviteRoleId(role.id);
                    } else if (rolePickerTarget) {
                      handleUpdateRole(rolePickerTarget.user_id, role.id);
                    }
                    setShowRolePicker(false);
                  }}
                >
                  <View style={[styles.roleOptionIcon, { backgroundColor: config.color + '18' }]}>
                    <Ionicons name={config.icon} size={20} color={config.color} />
                  </View>
                  <View style={styles.roleOptionContent}>
                    <Text style={[styles.roleOptionName, { color: themeColors.textPrimary }]}>
                      {role.display_name}
                    </Text>
                    <Text style={[styles.roleOptionLevel, { color: themeColors.textTertiary }]}>
                      {t('settings.level', 'Level')} {role.level}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={config.color} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Password Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={!!passwordUser}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setPasswordUser(null);
          setTempPassword('');
          setPasswordExpiry('');
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.outlineVariant }]}>
            <Pressable
              onPress={() => {
                setPasswordUser(null);
                setTempPassword('');
                setPasswordExpiry('');
              }}
            >
              <Text style={[styles.modalCancel, { color: themeColors.textSecondary }]}>
                {t('settings.close', 'Close')}
              </Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              {t('settings.passwordManagement', 'Password')}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {passwordUser && (
              <>
                <Text style={[styles.modalDescription, { color: themeColors.textSecondary }]}>
                  {t(
                    'settings.passwordDescription',
                    `Manage temporary password for ${getMemberName(passwordUser)}.`,
                    { name: getMemberName(passwordUser) },
                  )}
                </Text>

                {passwordLoading ? (
                  <View style={styles.passwordLoading}>
                    <ActivityIndicator size="large" color={themeColors.brandPrimary} />
                  </View>
                ) : tempPassword ? (
                  <>
                    <Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>
                      {t('settings.temporaryPassword', 'Temporary Password')}
                    </Text>
                    <View
                      style={[
                        styles.passwordBox,
                        {
                          backgroundColor: themeColors.surfaceLowest,
                          borderColor: themeColors.outlineVariant,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.passwordText, { color: themeColors.textPrimary }]}
                        selectable
                      >
                        {tempPassword}
                      </Text>
                    </View>

                    {passwordExpiry && (
                      <Text style={[styles.expiryText, { color: themeColors.textTertiary }]}>
                        {t('settings.expiresAt', 'Expires')}{' '}
                        {new Date(passwordExpiry).toLocaleDateString()}{' '}
                        {new Date(passwordExpiry).toLocaleTimeString()}
                      </Text>
                    )}

                    {/* Warning */}
                    <View
                      style={[
                        styles.warningBox,
                        { backgroundColor: themeColors.warning + '15' },
                      ]}
                    >
                      <Ionicons name="warning" size={18} color={themeColors.warning} />
                      <Text style={[styles.warningText, { color: themeColors.warning }]}>
                        {t(
                          'settings.passwordWarning',
                          'Share this password securely. It can only be used once.',
                        )}
                      </Text>
                    </View>

                    {/* Share button */}
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: themeColors.info + '15' }]}
                      onPress={handleSharePassword}
                    >
                      <Ionicons name="share-outline" size={18} color={themeColors.info} />
                      <Text style={[styles.actionButtonText, { color: themeColors.info }]}>
                        {t('settings.sharePassword', 'Share Password')}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.noPasswordContainer}>
                    <Ionicons name="key-outline" size={40} color={themeColors.iconSubtle} />
                    <Text style={[styles.noPasswordText, { color: themeColors.textSecondary }]}>
                      {t(
                        'settings.noTempPassword',
                        'No temporary password available.',
                      )}
                    </Text>
                  </View>
                )}

                {/* Reset password button */}
                <Pressable
                  style={[
                    styles.resetButton,
                    { backgroundColor: themeColors.brandPrimary },
                  ]}
                  onPress={handleResetPassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <ActivityIndicator size="small" color={themeColors.onBrand} />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={18} color={themeColors.onBrand} />
                      <Text style={[styles.resetButtonText, { color: themeColors.onBrand }]}>
                        {t('settings.resetPassword', 'Reset Password')}
                      </Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  headerSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  countText: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl * 1.5,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  memberList: {
    gap: spacing.sm,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberContent: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  youBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  youText: {
    fontSize: 10,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  joinedText: {
    fontSize: 11,
    marginTop: 2,
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

  // ─── Modal styles ──────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCancel: {
    fontSize: 15,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  nameFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nameField: {
    flex: 1,
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ─── Role picker ──────────────────────────────────────────────────────
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    gap: spacing.md,
  },
  roleOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionContent: {
    flex: 1,
  },
  roleOptionName: {
    fontSize: 15,
    fontWeight: '600',
  },
  roleOptionLevel: {
    fontSize: 12,
    marginTop: 2,
  },

  // ─── Password modal ──────────────────────────────────────────────────
  passwordLoading: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  passwordBox: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  passwordText: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '600',
    letterSpacing: 1,
  },
  expiryText: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  warningText: {
    fontSize: 13,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noPasswordContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  noPasswordText: {
    fontSize: 14,
    textAlign: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
