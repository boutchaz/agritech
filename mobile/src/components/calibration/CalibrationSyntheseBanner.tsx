import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Badge } from '@/components/ui';
import type { BlockASynthese, HealthLabel, ConfidenceLevel } from '@/types/calibration';

interface CalibrationSyntheseBannerProps {
  data: BlockASynthese;
  phaseAge?: number | null;
}

const healthColorMap: Record<HealthLabel, { bg: string; text: string; accent: string; badge: 'success' | 'info' | 'warning' | 'error' | 'neutral' }> = {
  excellent: { bg: colors.primary[50], text: colors.primary[700], accent: colors.primary[500], badge: 'success' },
  bon: { bg: colors.primary[50], text: colors.primary[700], accent: colors.primary[500], badge: 'success' },
  moyen: { bg: colors.yellow[50], text: colors.yellow[600], accent: colors.yellow[500], badge: 'warning' },
  faible: { bg: colors.yellow[50], text: colors.yellow[600], accent: colors.yellow[500], badge: 'warning' },
  critique: { bg: colors.red[50], text: colors.red[600], accent: colors.red[500], badge: 'error' },
};

const confidenceColorMap: Record<ConfidenceLevel, { bg: string; text: string; badge: 'success' | 'info' | 'warning' | 'neutral' }> = {
  eleve: { bg: colors.primary[50], text: colors.primary[600], badge: 'success' },
  moyen: { bg: colors.blue[50], text: colors.blue[500], badge: 'info' },
  faible: { bg: colors.yellow[50], text: colors.yellow[600], badge: 'warning' },
  minimal: { bg: colors.gray[50], text: colors.gray[600], badge: 'neutral' },
};

export function CalibrationSyntheseBanner({ data, phaseAge }: CalibrationSyntheseBannerProps) {
  const { t } = useTranslation('common');

  const hColor = healthColorMap[data.health_label] || healthColorMap.moyen;
  const cColor = confidenceColorMap[data.confidence_level] || confidenceColorMap.moyen;

  return (
    <View style={[styles.container, { borderLeftColor: hColor.accent }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('calibration.synthese.title', 'Synthèse calibration')}</Text>
        <Badge variant={hColor.badge} size="sm" label={data.health_label} />
      </View>

      <View style={styles.metrics}>
        <View style={[styles.metricCard, { backgroundColor: hColor.bg }]}>
          <Text style={styles.metricLabel}>{t('calibration.synthese.health', 'Santé')}</Text>
          <Text style={[styles.metricValue, { color: hColor.text }]}>{data.health_score}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: cColor.bg }]}>
          <Text style={styles.metricLabel}>{t('calibration.synthese.confidence', 'Confiance')}</Text>
          <Text style={[styles.metricValue, { color: cColor.text }]}>{data.confidence_score}%</Text>
        </View>

        {phaseAge != null && (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('calibration.synthese.phaseAge', 'Âge phase')}</Text>
            <Text style={styles.metricValue}>{phaseAge}j</Text>
          </View>
        )}

        {data.yield_range && (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('calibration.synthese.yield', 'Rendement')}</Text>
            <Text style={styles.metricValue}>
              {data.yield_range.min}–{data.yield_range.max}
            </Text>
            <Text style={styles.metricUnit}>{data.yield_range.unit}</Text>
          </View>
        )}
      </View>

      {data.summary_narrative ? (
        <Text style={styles.narrative} numberOfLines={3}>{data.summary_narrative}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    ...({ shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 } as Record<string, unknown>),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  metricUnit: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  narrative: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
});
