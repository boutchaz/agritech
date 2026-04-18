import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Card, Badge } from '@/components/ui';
import type { Step1Output, Step2Output } from '@/types/calibration';

interface CalibrationRunInputsPanelProps {
  step1: Step1Output;
  step2: Step2Output | null;
  cropType?: string | null;
  variety?: string | null;
  plantingSystem?: string | null;
}

export function CalibrationRunInputsPanel({
  step1,
  step2,
  cropType,
  variety,
  plantingSystem,
}: CalibrationRunInputsPanelProps) {
  const { t } = useTranslation('common');

  const imageCount = step1.filtered_image_count;
  const outlierCount = step1.outlier_count;
  const interpolatedCount = step1.interpolated_dates.length;

  const dateEntries = Object.values(step1.index_time_series).flat();
  const dates = dateEntries.map((d) => d.date).sort();
  const dateRange = dates.length >= 2
    ? `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`
    : dates.length === 1
      ? formatDate(dates[0])
      : '—';

  const hasWeather = step2 !== null && step2.daily_weather.length > 0;

  return (
    <Card variant="elevated">
      <Text style={styles.title}>{t('calibration.inputs.title', 'Données d\'entrée')}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('calibration.inputs.satellite', 'Images satellite')}</Text>
        <View style={styles.row}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('calibration.inputs.imageCount', 'Images')}</Text>
            <Text style={styles.statValue}>{imageCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('calibration.inputs.outliers', 'Aberrantes')}</Text>
            <Text style={styles.statValue}>{outlierCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('calibration.inputs.interpolated', 'Interpolées')}</Text>
            <Text style={styles.statValue}>{interpolatedCount}</Text>
          </View>
        </View>
        <Text style={styles.dateRange}>{dateRange}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('calibration.inputs.weather', 'Données météo')}</Text>
        {hasWeather ? (
          <View style={styles.weatherRow}>
            <Badge variant="success" size="sm" label={t('calibration.inputs.weatherAvailable', 'Disponible')} />
            <Text style={styles.weatherDetail}>
              {step2!.daily_weather.length} {t('calibration.inputs.days', 'jours')}
            </Text>
          </View>
        ) : (
          <Badge variant="warning" size="sm" label={t('calibration.inputs.weatherMissing', 'Non disponible')} />
        )}
      </View>

      {(cropType || variety || plantingSystem) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('calibration.inputs.crop', 'Culture')}</Text>
          {cropType && (
            <View style={styles.cropRow}>
              <Text style={styles.cropLabel}>{t('calibration.inputs.cropType', 'Type')}</Text>
              <Text style={styles.cropValue}>{cropType}</Text>
            </View>
          )}
          {variety && (
            <View style={styles.cropRow}>
              <Text style={styles.cropLabel}>{t('calibration.inputs.variety', 'Variété')}</Text>
              <Text style={styles.cropValue}>{variety}</Text>
            </View>
          )}
          {plantingSystem && (
            <View style={styles.cropRow}>
              <Text style={styles.cropLabel}>{t('calibration.inputs.plantingSystem', 'Système')}</Text>
              <Text style={styles.cropValue}>{plantingSystem}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cloudRow}>
        <Text style={styles.cloudLabel}>{t('calibration.inputs.cloudCoverage', 'Couverture nuageuse')}</Text>
        <Text style={styles.cloudValue}>{Math.round(step1.cloud_coverage_mean)}%</Text>
      </View>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginBottom: 2,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  dateRange: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weatherDetail: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  cropRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  cropLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  cropValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[800],
  },
  cloudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cloudLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  cloudValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
  },
});
