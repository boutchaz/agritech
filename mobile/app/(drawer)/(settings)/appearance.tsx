// Theme Preference Screen
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/providers/ThemeProvider';
import type { ThemeMode } from '@/stores/themeStore';

const THEME_OPTIONS: { value: ThemeMode; icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  {
    value: 'system',
    icon: 'phone-portrait-outline',
    title: 'System',
    description: 'Follow system settings',
  },
  {
    value: 'light',
    icon: 'sunny-outline',
    title: 'Light',
    description: 'Always use light theme',
  },
  {
    value: 'dark',
    icon: 'moon-outline',
    title: 'Dark',
    description: 'Always use dark theme',
  },
];

export default function AppearanceScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { themeMode, setThemeMode, colors: themeColors } = useTheme();

  const handleSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <PageHeader title={t('settings.appearance', 'Appearance')} />

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
          {t('settings.themeMode', 'Theme Mode')}
        </Text>
        <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
          {t('settings.themeModeDescription', 'Choose how the app looks')}
        </Text>

        <View style={styles.options}>
          {THEME_OPTIONS.map((option) => {
            const isSelected = themeMode === option.value;
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
                    {t(`settings.themeOptions.${option.value}`, option.title)}
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
                    {option.description}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={themeColors.brandPrimary} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Preview */}
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, marginTop: spacing.xl }]}>
          {t('settings.preview', 'Preview')}
        </Text>
        <View style={[styles.previewCard, { backgroundColor: themeColors.surfaceLowest }]}>
          <View style={[styles.previewHeader, { backgroundColor: themeColors.brandContainer }]}>
            <Text style={[styles.previewTitle, { color: themeColors.brandText }]}>
              {themeColors === themeColors
                ? t('settings.currentTheme', 'Current Theme')
                : ''}
            </Text>
          </View>
          <View style={styles.previewContent}>
            <View style={[styles.previewItem, { backgroundColor: themeColors.surfaceContainer }]}>
              <Ionicons name="leaf-outline" size={20} color={themeColors.brandPrimary} />
              <Text style={[styles.previewText, { color: themeColors.textSecondary }]}>
                {t('settings.sampleText', 'Sample text in current theme')}
              </Text>
            </View>
            <View style={[styles.previewItem, { backgroundColor: themeColors.surfaceContainer }]}>
              <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />
              <Text style={[styles.previewText, { color: themeColors.textSecondary }]}>
                {t('settings.activeStatus', 'Active status')}
              </Text>
            </View>
          </View>
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
  previewCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  previewHeader: {
    padding: spacing.md,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  previewContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  previewText: {
    fontSize: 14,
  },
});
