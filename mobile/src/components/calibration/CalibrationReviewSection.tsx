import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Card, Badge } from '@/components/ui';
import { useCalibrationReview } from '@/hooks/useCalibration';
import type {
  BlockASynthese as BlockASyntheseType,
  BlockCAnomalies as BlockCAnomaliesType,
  BlockDAmeliorer as BlockDAmeliorerType,
  BlockFAlternance as BlockFAlternanceType,
  BlockGMetadonnees as BlockGMetadonneesType,
  HealthLabel,
} from '@/types/calibration';

interface CalibrationReviewSectionProps {
  parcelId: string;
}

const healthColors: Record<HealthLabel, { bg: string; text: string; variant: 'success' | 'info' | 'warning' | 'error' | 'neutral' }> = {
  excellent: { bg: colors.primary[50], text: colors.primary[600], variant: 'success' },
  bon: { bg: colors.primary[50], text: colors.primary[600], variant: 'success' },
  moyen: { bg: colors.yellow[50], text: colors.yellow[600], variant: 'warning' },
  faible: { bg: colors.yellow[50], text: colors.yellow[600], variant: 'warning' },
  critique: { bg: colors.red[50], text: colors.red[500], variant: 'error' },
};

function HealthScoreBar({ data }: { data: BlockASyntheseType }) {
  const { t } = useTranslation('common');
  const hColor = healthColors[data.health_label] || healthColors.moyen;

  return (
    <Card variant="elevated">
      <Text style={styles.blockTitle}>{t('calibration.review.synthese', 'Synthèse')}</Text>

      <View style={[styles.scoreRow, { backgroundColor: hColor.bg }]}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>{t('calibration.review.healthScore', 'Santé')}</Text>
          <Text style={[styles.scoreValue, { color: hColor.text }]}>{data.health_score}/100</Text>
          <Badge variant={hColor.variant} size="sm" label={data.health_label} />
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>{t('calibration.review.confidence', 'Confiance')}</Text>
          <Text style={[styles.scoreValue, { color: colors.blue[600] }]}>{data.confidence_score}%</Text>
          <Badge variant="info" size="sm" label={data.confidence_level} />
        </View>
      </View>

      {data.health_narrative ? (
        <Text style={styles.narrative}>{data.health_narrative}</Text>
      ) : null}

      {data.yield_range && (
        <View style={styles.yieldRow}>
          <Text style={styles.yieldLabel}>{t('calibration.review.yieldRange', 'Rendement estimé')}</Text>
          <Text style={styles.yieldValue}>
            {data.yield_range.min} – {data.yield_range.max} {data.yield_range.unit}
          </Text>
        </View>
      )}

      {data.strengths.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>{t('calibration.review.strengths', 'Points forts')}</Text>
          {data.strengths.map((s, i) => (
            <Text key={`strength-${s.component}`} style={styles.listItem}>✓ {s.phrase}</Text>
          ))}
        </View>
      )}

      {data.concerns.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>{t('calibration.review.concerns', 'Points de vigilance')}</Text>
          {data.concerns.map((c, i) => (
            <Text key={`concern-${c.component}`} style={[styles.listItem, { color: colors.red[500] }]}>
              ⚠ {c.phrase}
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
}

function AnomaliesBlock({ data }: { data: BlockCAnomaliesType }) {
  const { t } = useTranslation('common');

  return (
    <Card variant="elevated">
      <Text style={styles.blockTitle}>{t('calibration.review.anomalies', 'Anomalies')}</Text>

      {data.anomalies.length === 0 ? (
        <Text style={styles.emptyText}>{t('calibration.review.noAnomalies', 'Aucune anomalie détectée')}</Text>
      ) : (
        data.anomalies.map((a) => (
          <View key={`${a.type}-${a.period}`} style={styles.anomalyItem}>
            <Text style={styles.anomalyIcon}>{a.icon}</Text>
            <View style={styles.anomalyContent}>
              <Text style={styles.anomalyType}>{a.type}</Text>
              <Text style={styles.anomalyPeriod}>{a.period}</Text>
              <Text style={styles.anomalyImpact}>{a.impact}</Text>
            </View>
          </View>
        ))
      )}

      {data.ruptures.length > 0 && (
        <View style={styles.ruptureSection}>
          <Text style={styles.ruptureTitle}>{t('calibration.review.ruptures', 'Ruptures détectées')}</Text>
          {data.ruptures.map((r) => (
            <View key={`${r.type}-${r.date}`} style={styles.ruptureItem}>
              <Text style={styles.ruptureType}>{r.type} — {r.date}</Text>
              <Text style={styles.ruptureDetail}>{r.detail}</Text>
            </View>
          ))}
        </View>
      )}

      {data.calibrage_limite && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {t('calibration.review.limitedCalibration', 'Calibration limitée — {pct}% de données exclues', { pct: Math.round(data.total_excluded_percent) })}
          </Text>
        </View>
      )}
    </Card>
  );
}

function ImprovePrecisionBlock({ data }: { data: BlockDAmeliorerType }) {
  const { t } = useTranslation('common');

  return (
    <Card variant="elevated">
      <Text style={styles.blockTitle}>{t('calibration.review.improvePrecision', 'Améliorer la précision')}</Text>

      <View style={styles.confidenceProgress}>
        <View style={styles.confidenceBar}>
          <View style={[styles.confidenceFill, { width: `${data.current_confidence}%` }]} />
        </View>
        <View style={styles.confidenceLabels}>
          <Text style={styles.confidenceCurrent}>
            {t('calibration.review.current', 'Actuel')}: {data.current_confidence}%
          </Text>
          <Text style={styles.confidenceProjected}>
            {t('calibration.review.projected', 'Projeté')}: {data.projected_confidence}%
          </Text>
        </View>
      </View>

      {data.missing_data.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>{t('calibration.review.missingData', 'Données manquantes')}</Text>
          {data.missing_data.map((m) => (
            <View key={m.type} style={styles.missingItem}>
              <Text style={styles.missingLabel}>{m.label}</Text>
              <Text style={styles.missingMessage}>{m.message}</Text>
              <Badge variant="info" size="sm" label={`+${m.gain_points}pts`} />
            </View>
          ))}
        </View>
      )}

      {data.available_data.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>{t('calibration.review.availableData', 'Données disponibles')}</Text>
          {data.available_data.map((a) => (
            <Text key={a.type} style={styles.listItem}>✓ {a.label}</Text>
          ))}
        </View>
      )}
    </Card>
  );
}

function AlternanceBlock({ data }: { data: BlockFAlternanceType }) {
  const { t } = useTranslation('common');

  return (
    <Card variant="elevated">
      <Text style={styles.blockTitle}>{t('calibration.review.alternance', 'Alternance')}</Text>

      <View style={styles.alternanceRow}>
        <Text style={styles.alternanceLabel}>{t('calibration.review.index', 'Indice')}</Text>
        <Text style={styles.alternanceValue}>{data.indice.toFixed(2)} — {data.label}</Text>
      </View>

      <Text style={styles.narrative}>{data.interpretation}</Text>

      <View style={styles.nextSeasonBox}>
        <Text style={styles.nextSeasonLabel}>{t('calibration.review.nextSeason', 'Prochaine saison')}</Text>
        <Badge
          variant={data.next_season.badge === 'on' ? 'success' : data.next_season.badge === 'off' ? 'warning' : 'neutral'}
          size="sm"
          label={data.next_season.phrase}
        />
      </View>

      {data.variety_reference && (
        <Text style={styles.varietyRef}>
          {t('calibration.review.varietyRef', 'Référence variété')}: {data.variety_reference.variety} (indice {data.variety_reference.indice_ref})
        </Text>
      )}
    </Card>
  );
}

function MetadataBlock({ data }: { data: BlockGMetadonneesType }) {
  const { t } = useTranslation('common');

  return (
    <Card variant="elevated">
      <Text style={styles.blockTitle}>{t('calibration.review.metadata', 'Métadonnées')}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{t('calibration.review.generatedAt', 'Généré le')}</Text>
        <Text style={styles.metaValue}>{data.generated_at_formatted}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{t('calibration.review.version', 'Version')}</Text>
        <Text style={styles.metaValue}>{data.calibration_version}</Text>
      </View>
    </Card>
  );
}

export function CalibrationReviewSection({ parcelId }: CalibrationReviewSectionProps) {
  const { data: review, isLoading } = useCalibrationReview(parcelId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!review) {
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <HealthScoreBar data={review.block_a} />

      {review.block_c && <AnomaliesBlock data={review.block_c} />}

      <ImprovePrecisionBlock data={review.block_d} />

      {review.block_f && <AlternanceBlock data={review.block_f} />}

      <MetadataBlock data={review.block_g} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  blockTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  scoreItem: {
    flex: 1,
    gap: spacing.xs,
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  narrative: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  yieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  yieldLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  yieldValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary[600],
  },
  listSection: {
    marginTop: spacing.sm,
  },
  listTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
    marginBottom: spacing.xs,
  },
  listItem: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    paddingVertical: 2,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    fontStyle: 'italic',
  },
  anomalyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  anomalyIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  anomalyContent: {
    flex: 1,
  },
  anomalyType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
  },
  anomalyPeriod: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  anomalyImpact: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  ruptureSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  ruptureTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.red[500],
    marginBottom: spacing.xs,
  },
  ruptureItem: {
    paddingVertical: spacing.xs,
  },
  ruptureType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[800],
  },
  ruptureDetail: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
  },
  warningBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.yellow[50],
    borderRadius: borderRadius.md,
  },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.yellow[600],
    fontWeight: fontWeight.medium,
  },
  confidenceProgress: {
    marginBottom: spacing.md,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
  },
  confidenceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  confidenceCurrent: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  confidenceProjected: {
    fontSize: fontSize.xs,
    color: colors.primary[600],
    fontWeight: fontWeight.semibold,
  },
  missingItem: {
    paddingVertical: spacing.xs,
    gap: 2,
  },
  missingLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[800],
  },
  missingMessage: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
  },
  alternanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  alternanceLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  alternanceValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  nextSeasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  nextSeasonLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  varietyRef: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  metaLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  metaValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[800],
  },
});
