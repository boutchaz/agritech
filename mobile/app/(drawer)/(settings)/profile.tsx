// Profile Screen
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, Alert,
  ScrollView, ActivityIndicator, TouchableOpacity, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { authApi, filesApi } from '@/lib/api';

export default function ProfileScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { colors: themeColors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const abilities = useAuthStore((s) => s.abilities);
  const role = useAuthStore((s) => s.role);
  const { biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const roleLabel =
    abilities?.role?.display_name?.trim() ||
    (typeof role === 'string' && role.length > 0
      ? role.replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase())
      : null);

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?';

  const handleSave = async () => {
    try {
      setSaving(true);
      await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      Alert.alert(
        t('settings.success', 'Success'),
        t('settings.profileUpdated', 'Your profile has been updated.'),
      );
    } catch {
      Alert.alert(
        t('settings.error', 'Error'),
        t('settings.profileUpdateFailed', 'Failed to update profile. Please try again.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      const result = await filesApi.uploadAvatar(uri);
      if (result?.avatar_url) {
        await authApi.updateProfile({ avatar_url: result.avatar_url });
        Alert.alert(
          t('settings.success', 'Success'),
          t('settings.avatarUpdated', 'Profile photo updated.'),
        );
      }
    } catch {
      Alert.alert(
        t('settings.error', 'Error'),
        t('settings.avatarFailed', 'Failed to upload photo.'),
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickAvatar = () => {
    Alert.alert(
      t('settings.updatePhoto', 'Update Profile Photo'),
      t('settings.chooseSource', 'Choose a source'),
      [
        { text: t('actions.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.takePhoto', 'Take Photo'),
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(
                t('settings.permissionRequired', 'Permission Required'),
                t('settings.cameraPermission', 'Camera permission is needed'),
              );
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
          text: t('settings.chooseGallery', 'Choose from Gallery'),
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
      ],
    );
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      disableBiometric();
    } else {
      const success = await enableBiometric();
      if (!success) {
        Alert.alert(
          t('settings.biometricUnavailable', 'Biometric Unavailable'),
          t('settings.biometricSetup', 'Please make sure biometric authentication is set up on your device.'),
        );
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <PageHeader title={t('settings.profile', 'Profile')} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar} activeOpacity={0.7}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: themeColors.brandContainer }]}>
                <Text style={[styles.avatarText, { color: themeColors.brandPrimary }]}>{initials}</Text>
              </View>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: themeColors.brandPrimary }]}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={themeColors.onBrand} />
              ) : (
                <Ionicons name="camera" size={14} color={themeColors.onBrand} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={[styles.nameDisplay, { color: themeColors.textPrimary }]}>
            {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email}
          </Text>
          {roleLabel ? (
            <View style={[styles.roleBadge, { backgroundColor: themeColors.brandContainer + '40' }]}>
              <Ionicons name="shield-checkmark" size={14} color={themeColors.brandPrimary} />
              <Text style={[styles.roleText, { color: themeColors.brandPrimary }]}>{roleLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* Account Info */}
        <Text style={[styles.sectionTitle, { color: themeColors.textTertiary }]}>
          {t('settings.accountInfo', 'Account Information')}
        </Text>

        <View style={[styles.readOnlyCard, { backgroundColor: themeColors.surfaceLowest }]}>
          <Ionicons name="mail-outline" size={20} color={themeColors.iconSubtle} />
          <View style={styles.readOnlyContent}>
            <Text style={[styles.readOnlyLabel, { color: themeColors.textTertiary }]}>
              {t('settings.email', 'Email')}
            </Text>
            <Text style={[styles.readOnlyValue, { color: themeColors.textPrimary }]}>
              {user?.email || '-'}
            </Text>
          </View>
        </View>

        {/* Editable fields */}
        <Text style={[styles.sectionTitle, { color: themeColors.textTertiary, marginTop: spacing.lg }]}>
          {t('settings.editProfile', 'Edit Profile')}
        </Text>

        <View style={styles.fields}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
              {t('settings.firstName', 'First Name')}
            </Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: themeColors.surfaceLowest, color: themeColors.textPrimary, borderColor: themeColors.outlineVariant }]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('settings.firstNamePlaceholder', 'Enter first name')}
              placeholderTextColor={themeColors.textTertiary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
              {t('settings.lastName', 'Last Name')}
            </Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: themeColors.surfaceLowest, color: themeColors.textPrimary, borderColor: themeColors.outlineVariant }]}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('settings.lastNamePlaceholder', 'Enter last name')}
              placeholderTextColor={themeColors.textTertiary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
              {t('settings.phone', 'Phone')}
            </Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: themeColors.surfaceLowest, color: themeColors.textPrimary, borderColor: themeColors.outlineVariant }]}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('settings.phonePlaceholder', 'Enter your phone number')}
              placeholderTextColor={themeColors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, { backgroundColor: themeColors.brandPrimary }, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={themeColors.onBrand} />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={20} color={themeColors.onBrand} />
              <Text style={[styles.saveButtonText, { color: themeColors.onBrand }]}>
                {t('actions.save', 'Save Changes')}
              </Text>
            </>
          )}
        </Pressable>

        {/* Security */}
        <Text style={[styles.sectionTitle, { color: themeColors.textTertiary, marginTop: spacing.xl }]}>
          {t('settings.security', 'Security')}
        </Text>

        <View style={[styles.securityCard, { backgroundColor: themeColors.surfaceLowest }]}>
          <View style={[styles.securityIconWrap, { backgroundColor: themeColors.brandContainer + '25' }]}>
            <Ionicons name="finger-print" size={22} color={themeColors.brandPrimary} />
          </View>
          <View style={styles.securityContent}>
            <Text style={[styles.securityTitle, { color: themeColors.textPrimary }]}>
              {t('settings.biometricLogin', 'Biometric Login')}
            </Text>
            <Text style={[styles.securitySubtitle, { color: themeColors.textSecondary }]}>
              {t('settings.biometricDesc', 'Use fingerprint or Face ID')}
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: themeColors.outlineVariant, true: themeColors.brandContainer }}
            thumbColor={biometricEnabled ? themeColors.brandPrimary : themeColors.surfaceLowest}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl + spacing.xl },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg },
  avatarContainer: { position: 'relative', marginBottom: spacing.md },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { fontSize: 28, fontWeight: '700' },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  nameDisplay: { fontSize: 20, fontWeight: '700' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, marginTop: spacing.sm,
  },
  roleText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: spacing.sm, paddingHorizontal: spacing.xs,
  },
  readOnlyCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.md,
  },
  readOnlyContent: { flex: 1 },
  readOnlyLabel: { fontSize: 12, fontWeight: '500' },
  readOnlyValue: { fontSize: 15, fontWeight: '500', marginTop: 2 },
  fields: { gap: spacing.md },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: '500', paddingHorizontal: spacing.xs },
  fieldInput: {
    borderRadius: borderRadius.lg, padding: spacing.md,
    fontSize: 15, borderWidth: 1,
  },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: borderRadius.lg, padding: spacing.md,
    marginTop: spacing.xl, gap: spacing.sm,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { fontSize: 15, fontWeight: '600' },
  securityCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, padding: spacing.md,
  },
  securityIconWrap: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  securityContent: { flex: 1, marginLeft: spacing.md },
  securityTitle: { fontSize: 15, fontWeight: '600' },
  securitySubtitle: { fontSize: 13, marginTop: 2 },
});
