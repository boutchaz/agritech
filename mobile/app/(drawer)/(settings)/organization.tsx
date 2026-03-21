// Organization Settings Screen
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

export default function OrganizationScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { colors: themeColors } = useTheme();
  const currentOrganization = useAuthStore((s) => s.currentOrganization);
  const organizations = useAuthStore((s) => s.organizations);
  const setCurrentOrganization = useAuthStore((s) => s.setCurrentOrganization);

  const [orgName, setOrgName] = useState(currentOrganization?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentOrganization?.id) return;
    try {
      setSaving(true);
      await api.patch(`/organizations/${currentOrganization.id}`, { name: orgName });
      Alert.alert(
        t('settings.success', 'Success'),
        t('settings.orgUpdated', 'Organization name has been updated.'),
      );
    } catch (error) {
      Alert.alert(
        t('settings.error', 'Error'),
        t('settings.orgUpdateFailed', 'Failed to update organization. Please try again.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchOrg = (org: any) => {
    setCurrentOrganization(org);
    Alert.alert(
      t('settings.switched', 'Switched'),
      t('settings.switchedTo', 'Switched to {{name}}', { name: org.name }),
    );
  };

  const hasMultipleOrgs = organizations && organizations.length > 1;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <PageHeader title={t('settings.organization', 'Organization')} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Current Organization */}
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
          {t('settings.currentOrg', 'Current Organization')}
        </Text>
        <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
          {t('settings.currentOrgDescription', 'Manage your organization settings')}
        </Text>

        <View style={[styles.infoCard, { backgroundColor: themeColors.surfaceLowest }]}>
          <View style={[styles.iconContainer, { backgroundColor: themeColors.brandContainer + '25' }]}>
            <Ionicons name="business-outline" size={24} color={themeColors.brandPrimary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: themeColors.textPrimary }]}>
              {currentOrganization?.name || '-'}
            </Text>
            {currentOrganization?.currency_code && (
              <Text style={[styles.infoSubtitle, { color: themeColors.textSecondary }]}>
                {t('settings.currency', 'Currency')}: {currentOrganization.currency_code}
              </Text>
            )}
          </View>
        </View>

        {/* Edit Name */}
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, marginTop: spacing.xl }]}>
          {t('settings.editOrgName', 'Edit Name')}
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
            {t('settings.orgName', 'Organization Name')}
          </Text>
          <TextInput
            style={[
              styles.fieldInput,
              {
                backgroundColor: themeColors.surfaceLowest,
                color: themeColors.textPrimary,
                borderColor: themeColors.outlineVariant,
              },
            ]}
            value={orgName}
            onChangeText={setOrgName}
            placeholder={t('settings.orgNamePlaceholder', 'Enter organization name')}
            placeholderTextColor={themeColors.textTertiary}
          />
        </View>

        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: themeColors.brandPrimary },
            saving && styles.saveButtonDisabled,
          ]}
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

        {/* Switch Organization */}
        {hasMultipleOrgs && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, marginTop: spacing.xl }]}>
              {t('settings.switchOrg', 'Switch Organization')}
            </Text>
            <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
              {t('settings.switchOrgDescription', 'Select an organization to switch to')}
            </Text>

            <View style={styles.options}>
              {organizations.map((org: any) => {
                const isSelected = org.id === currentOrganization?.id;
                return (
                  <Pressable
                    key={org.id}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isSelected
                          ? themeColors.brandContainer + '30'
                          : themeColors.surfaceLowest,
                        borderColor: isSelected
                          ? themeColors.brandPrimary
                          : themeColors.outlineVariant,
                      },
                    ]}
                    onPress={() => handleSwitchOrg(org)}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: isSelected
                            ? themeColors.brandPrimary
                            : themeColors.surfaceContainer,
                        },
                      ]}
                    >
                      <Ionicons
                        name="business-outline"
                        size={24}
                        color={isSelected ? themeColors.onBrand : themeColors.iconSubtle}
                      />
                    </View>
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionTitle,
                          {
                            color: isSelected
                              ? themeColors.brandPrimary
                              : themeColors.textPrimary,
                          },
                        ]}
                      >
                        {org.name}
                      </Text>
                      {org.currency_code && (
                        <Text
                          style={[
                            styles.optionDescription,
                            {
                              color: isSelected
                                ? themeColors.brandText
                                : themeColors.textSecondary,
                            },
                          ]}
                        >
                          {org.currency_code}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={themeColors.brandPrimary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: spacing.xs,
  },
  fieldInput: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 15,
    borderWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  options: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
  },
  optionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
});
