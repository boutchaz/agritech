// NutritionOptionSelector - Select nutrition option A/B/C
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import type { NutritionOption, NutritionSuggestionResponse } from '@/types/calibration';

interface NutritionOptionSelectorProps {
  options: NutritionSuggestionResponse;
  selectedOption?: NutritionOption;
  onSelect: (option: NutritionOption) => void;
  disabled?: boolean;
}

const optionConfig: Record<NutritionOption, { color: string; label: string }> = {
  A: { color: colors.primary[500], label: 'Standard' },
  B: { color: colors.blue[500], label: 'Moderate' },
  C: { color: colors.yellow[500], label: 'Intensive' },
};

export function NutritionOptionSelector({
  options,
  selectedOption,
  onSelect,
  disabled = false,
}: NutritionOptionSelectorProps) {
  const { t } = useTranslation('common');
  const { suggested_option, alternatives } = options;

  const allOptions: NutritionOption[] = ['A', 'B', 'C'];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('calibration.selectNutritionOption')}</Text>
      <Text style={styles.subtitle}>
        {t('calibration.suggested')}: {suggested_option}
      </Text>

      <View style={styles.optionsContainer}>
        {allOptions.map((option) => {
          const config = optionConfig[option];
          const alternative = alternatives.find((a) => a.option === option);
          const isSuggested = option === suggested_option;
          const isSelected = option === selectedOption;
          const isEligible = alternative?.eligible ?? isSuggested;

          return (
            <Pressable
              key={option}
              onPress={() => isEligible && onSelect(option)}
              disabled={disabled || !isEligible}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected,
                isSuggested && styles.optionCardSuggested,
                !isEligible && styles.optionCardDisabled,
              ]}
            >
              <View style={[styles.optionBadge, { backgroundColor: config.color }]}>
                <Text style={styles.optionBadgeText}>{option}</Text>
              </View>
              <Text style={styles.optionLabel}>{config.label}</Text>
              {isSuggested && (
                <View style={styles.suggestedBadge}>
                  <Text style={styles.suggestedText}>{t('calibration.recommended')}</Text>
                </View>
              )}
              {!isEligible && alternative && (
                <Text style={styles.reasonText}>{alternative.reason}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray[200],
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  optionCardSuggested: {
    borderColor: colors.primary[300],
  },
  optionCardDisabled: {
    opacity: 0.5,
    backgroundColor: colors.gray[50],
  },
  optionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  optionBadgeText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  optionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
  },
  suggestedBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.sm,
  },
  suggestedText: {
    fontSize: fontSize.xs,
    color: colors.primary[700],
    fontWeight: fontWeight.semibold,
  },
  reasonText: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
