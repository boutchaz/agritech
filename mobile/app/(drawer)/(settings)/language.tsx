// Language Selection Screen
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { spacing, borderRadius } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/providers/ThemeProvider';
import { api } from '@/lib/api';

const LANGUAGE_OPTIONS: { value: string; label: string; nativeLabel: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    value: 'en',
    label: 'English',
    nativeLabel: 'English',
    icon: 'language-outline',
  },
  {
    value: 'fr',
    label: 'French',
    nativeLabel: 'Fran\u00e7ais',
    icon: 'language-outline',
  },
  {
    value: 'ar',
    label: 'Arabic',
    nativeLabel: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
    icon: 'language-outline',
  },
];

export default function LanguageScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { colors: themeColors } = useTheme();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  const handleSelect = async (lang: string) => {
    try {
      await i18n.changeLanguage(lang);
      setCurrentLang(lang);
      await api.patch('/users/me', { language: lang });
      Alert.alert(
        t('settings.success', 'Success'),
        t('settings.languageUpdated', 'Language has been updated.'),
      );
    } catch (error) {
      Alert.alert(
        t('settings.error', 'Error'),
        t('settings.languageUpdateFailed', 'Failed to update language. Please try again.'),
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <PageHeader title={t('settings.language', 'Language')} />

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
          {t('settings.selectLanguage', 'Select Language')}
        </Text>
        <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
          {t('settings.selectLanguageDescription', 'Choose your preferred language')}
        </Text>

        <View style={styles.options}>
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = currentLang === option.value;
            return (
              <Pressable
                key={option.value}
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
                onPress={() => handleSelect(option.value)}
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
                    name={option.icon}
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
                    {option.nativeLabel}
                  </Text>
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
                    {option.label}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={themeColors.brandPrimary} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
