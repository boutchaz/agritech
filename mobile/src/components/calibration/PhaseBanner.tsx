// PhaseBanner - Displays calibration phase status
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Badge } from '@/components/ui';
import type { CalibrationPhase } from '@/types/calibration';

interface PhaseBannerProps {
  phase: CalibrationPhase;
  confidenceScore?: number | null;
}

const phaseConfig: Record<CalibrationPhase, {
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  bgColor: string;
  textColor: string;
  icon: string;
}> = {
  disabled: { variant: 'neutral', bgColor: colors.gray[50], textColor: colors.gray[700], icon: '⚪' },
  pret_calibrage: { variant: 'info', bgColor: colors.blue[50], textColor: colors.blue[600], icon: '🔵' },
  calibrating: { variant: 'warning', bgColor: colors.yellow[50], textColor: colors.yellow[600], icon: '🔄' },
  awaiting_validation: { variant: 'warning', bgColor: colors.yellow[50], textColor: colors.yellow[600], icon: '⏳' },
  awaiting_nutrition_option: { variant: 'info', bgColor: colors.blue[50], textColor: colors.blue[600], icon: '🍎' },
  active: { variant: 'success', bgColor: colors.primary[50], textColor: colors.primary[700], icon: '✅' },
  paused: { variant: 'neutral', bgColor: colors.gray[50], textColor: colors.gray[700], icon: '⏸️' },
  unknown: { variant: 'neutral', bgColor: colors.gray[50], textColor: colors.gray[700], icon: '❓' },
};

export function PhaseBanner({ phase, confidenceScore }: PhaseBannerProps) {
  const { t } = useTranslation('common');

  const config = phaseConfig[phase] || phaseConfig.unknown;
  const phaseLabel = t(`calibration.phases.${phase}`, phase);

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{config.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.phaseText, { color: config.textColor }]}>
            {phaseLabel}
          </Text>
          {confidenceScore != null && (
            <Text style={styles.scoreText}>
              {t('calibration.confidence')}: {Math.min(confidenceScore, 100)}%
            </Text>
          )}
        </View>
      </View>
      <Badge
        variant={config.variant}
        size="sm"
        label={phase === 'active' ? t('status.active') : t('status.pending')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  phaseText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  scoreText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
  },
});
