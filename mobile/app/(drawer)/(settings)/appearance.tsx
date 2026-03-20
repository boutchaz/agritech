// Theme Preference Screen
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
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
  const { themeMode, setThemeMode, isDark } = useTheme();

  const handleSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <PageHeader title={t('settings.appearance', 'Appearance')} />

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          {t('settings.themeMode', 'Theme Mode')}
        </Text>
        <Text style={[styles.sectionDescription, isDark && styles.sectionDescriptionDark]}>
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
                  isSelected && styles.optionCardSelected,
                  isDark && styles.optionCardDark,
                  isSelected && isDark && styles.optionCardSelectedDark,
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isSelected && styles.iconContainerSelected,
                    isDark && styles.iconContainerDark,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={isSelected ? colors.white : isDark ? '#a8b8aa' : colors.gray[500]}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      isSelected && styles.optionTitleSelected,
                      isDark && styles.optionTitleDark,
                    ]}
                  >
                    {t(`settings.themeOptions.${option.value}`, option.title)}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      isSelected && styles.optionDescriptionSelected,
                      isDark && styles.optionDescriptionDark,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Preview */}
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark, { marginTop: spacing.xl }]}>
          {t('settings.preview', 'Preview')}
        </Text>
        <View style={[styles.previewCard, isDark && styles.previewCardDark]}>
          <View style={[styles.previewHeader, isDark && styles.previewHeaderDark]}>
            <Text style={[styles.previewTitle, isDark && styles.previewTitleDark]}>
              {isDark ? t('settings.darkMode', 'Dark Mode') : t('settings.lightMode', 'Light Mode')}
            </Text>
          </View>
          <View style={styles.previewContent}>
            <View style={[styles.previewItem, isDark && styles.previewItemDark]}>
              <Ionicons name="leaf-outline" size={20} color={colors.primary[500]} />
              <Text style={[styles.previewText, isDark && styles.previewTextDark]}>
                {t('settings.sampleText', 'Sample text in current theme')}
              </Text>
            </View>
            <View style={[styles.previewItem, isDark && styles.previewItemDark]}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={[styles.previewText, isDark && styles.previewTextDark]}>
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
    backgroundColor: colors.gray[50],
  },
  containerDark: {
    backgroundColor: '#0a1a0c',
  },
  content: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  sectionTitleDark: {
    color: '#e0f0e2',
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  sectionDescriptionDark: {
    color: '#6e7b6f',
  },
  options: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
    ...shadows.sm,
  },
  optionCardDark: {
    backgroundColor: '#1a2c1d',
    borderColor: '#2a3e2e',
  },
  optionCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  optionCardSelectedDark: {
    backgroundColor: '#1b3e1e',
    borderColor: '#4caf50',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerDark: {
    backgroundColor: '#223426',
  },
  iconContainerSelected: {
    backgroundColor: colors.primary[500],
  },
  optionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  optionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  optionTitleDark: {
    color: '#e0f0e2',
  },
  optionTitleSelected: {
    color: colors.primary[600],
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  optionDescriptionDark: {
    color: '#6e7b6f',
  },
  optionDescriptionSelected: {
    color: colors.primary[400],
  },
  previewCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  previewCardDark: {
    backgroundColor: '#1a2c1d',
  },
  previewHeader: {
    backgroundColor: colors.primary[500],
    padding: spacing.md,
  },
  previewHeaderDark: {
    backgroundColor: '#1b5e20',
  },
  previewTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  previewTitleDark: {
    color: '#c8e6c9',
  },
  previewContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  previewItemDark: {
    backgroundColor: '#223426',
  },
  previewText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  previewTextDark: {
    color: '#a8b8aa',
  },
});
