// Edit Profile Screen
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

export default function ProfileScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { colors: themeColors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.patch('/users/me', {
        first_name: firstName,
        last_name: lastName,
        phone,
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

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <PageHeader title={t('settings.profile', 'Profile')} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Read-only info */}
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
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
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, marginTop: spacing.xl }]}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl + spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing.xs },
  readOnlyCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.md },
  readOnlyContent: { flex: 1 },
  readOnlyLabel: { fontSize: 12, fontWeight: '500' },
  readOnlyValue: { fontSize: 15, fontWeight: '500', marginTop: 2 },
  fields: { gap: spacing.md },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: '500', paddingHorizontal: spacing.xs },
  fieldInput: { borderRadius: borderRadius.lg, padding: spacing.md, fontSize: 15, borderWidth: 1 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.xl, gap: spacing.sm },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { fontSize: 15, fontWeight: '600' },
});
