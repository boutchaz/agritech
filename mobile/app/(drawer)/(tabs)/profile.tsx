import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Switch, Image, ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/stores/authStore';
import { authApi, filesApi } from '@/lib/api';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';

// ── Schema ──────────────────────────────────────────────
const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ── Menu Item ───────────────────────────────────────────
interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function MenuItem({ icon, title, subtitle, onPress, rightElement, danger }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.red[500] : colors.primary[600]}
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress ? (
        <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
      ) : null)}
    </TouchableOpacity>
  );
}

// ── Profile Screen ──────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { profile, role, abilities, signOut, biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, reset]);

  const roleLabel =
    abilities?.role?.display_name?.trim() ||
    (typeof role === 'string' && role.length > 0
      ? role.replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase())
      : 'User');

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      disableBiometric();
    } else {
      const success = await enableBiometric();
      if (!success) {
        Alert.alert('Biometric Unavailable', 'Please make sure biometric authentication is set up on your device.');
      }
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await authApi.updateProfile({
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        phone: data.phone?.trim() || undefined,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    reset({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
    });
  };

  const handlePickAvatar = () => {
    Alert.alert('Update Profile Photo', 'Choose a source', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera permission is needed');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAvatar(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAvatar(result.assets[0].uri);
          }
        },
      },
    ]);
  };

  const uploadAvatar = async (uri: string) => {
    setIsUploadingAvatar(true);
    try {
      const result = await filesApi.uploadImage(uri, 'avatars');
      if (result?.url) {
        await authApi.updateProfile({ avatar_url: result.url });
        Alert.alert('Success', 'Profile photo updated');
      }
    } catch {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`
    : '??';

  const hasAvatar = !!profile?.avatar_url;

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
      <PageHeader title="Profile" showBack={false} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar} activeOpacity={0.7}>
            {hasAvatar ? (
              <Image source={{ uri: profile!.avatar_url! }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="camera" size={14} color={colors.white} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.changePhotoButton} onPress={handlePickAvatar} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={16} color={colors.primary[600]} />
            <Text style={styles.changePhotoText}>
              {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
            </Text>
          </TouchableOpacity>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.editRow}>
                <Controller
                  control={control}
                  name="first_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={styles.editInput}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="First name"
                        autoFocus
                      />
                      {errors.first_name && (
                        <Text style={styles.errorText}>{errors.first_name.message}</Text>
                      )}
                    </View>
                  )}
                />
                <Controller
                  control={control}
                  name="last_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={styles.editInput}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Last name"
                      />
                      {errors.last_name && (
                        <Text style={styles.errorText}>{errors.last_name.message}</Text>
                      )}
                    </View>
                  )}
                />
              </View>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.editInput, { width: '100%' }]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                  />
                )}
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isSubmitting && { opacity: 0.6 }]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.name}>
                {profile?.first_name} {profile?.last_name}
              </Text>
              <Text style={styles.email}>{profile?.email}</Text>
              {profile?.phone ? (
                <Text style={styles.phone}>{profile.phone}</Text>
              ) : null}
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={14} color={colors.primary[600]} />
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
            </>
          )}
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update your name and phone"
              onPress={() => setIsEditing(true)}
            />
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage push notifications"
              onPress={() => {}}
            />
            <MenuItem
              icon="language-outline"
              title="Language"
              subtitle="English"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="finger-print"
              title="Biometric Login"
              subtitle="Use fingerprint or Face ID"
              rightElement={
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: colors.gray[300], true: colors.primary[200] }}
                  thumbColor={biometricEnabled ? colors.primary[600] : colors.gray[100]}
                />
              }
            />
            <MenuItem
              icon="lock-closed-outline"
              title="Change Password"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* App */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="cloud-offline-outline" title="Offline Mode" subtitle="Sync pending data" onPress={() => {}} />
            <MenuItem icon="help-circle-outline" title="Help & Support" onPress={() => {}} />
            <MenuItem icon="information-circle-outline" title="About" subtitle="Version 1.0.0" />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <View style={styles.menuGroup}>
            <MenuItem icon="log-out-outline" title="Sign Out" onPress={handleLogout} danger />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { paddingBottom: spacing['2xl'] },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  avatarContainer: { position: 'relative', marginBottom: spacing.md },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.primary[700] },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary[600],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.white,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    marginBottom: spacing.md,
  },
  changePhotoText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary[600],
  },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.gray[900] },
  email: { fontSize: fontSize.base, color: colors.gray[500], marginTop: spacing.xs },
  phone: { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, marginTop: spacing.md,
  },
  roleText: { fontSize: fontSize.sm, color: colors.primary[700], fontWeight: '500', marginLeft: spacing.xs },
  editForm: { width: '100%', gap: spacing.sm, marginTop: spacing.sm },
  editRow: { flexDirection: 'row', gap: spacing.sm },
  editInput: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  errorText: { fontSize: fontSize.xs, color: colors.red[500], marginTop: 2, marginLeft: spacing.xs },
  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  cancelButton: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100], alignItems: 'center',
  },
  cancelButtonText: { fontSize: fontSize.base, fontWeight: '600', color: colors.gray[700] },
  saveButton: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[600], alignItems: 'center',
  },
  saveButtonText: { fontSize: fontSize.base, fontWeight: '600', color: colors.white },
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: '600', color: colors.gray[500],
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.sm, marginLeft: spacing.sm,
  },
  menuGroup: { backgroundColor: colors.white, borderRadius: borderRadius.lg, ...shadows.sm },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  menuIconDanger: { backgroundColor: colors.red[50] },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: fontSize.base, fontWeight: '500', color: colors.gray[900] },
  menuTitleDanger: { color: colors.red[600] },
  menuSubtitle: { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },
});
