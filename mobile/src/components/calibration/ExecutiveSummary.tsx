// ExecutiveSummary - Displays calibration health score and key metrics
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Card } from '@/components/ui';
import type { HealthScore, ConfidenceScore, CalibrationMaturityPhase } from '@/types/calibration';

interface ExecutiveSummaryProps {
  healthScore?: HealthScore | null;
  confidenceScore?: ConfidenceScore | null;
  maturityPhase?: CalibrationMaturityPhase | null;
  yieldPotential?: { minimum: number; maximum: number } | null;
}

const maturityPhaseLabels: Record<CalibrationMaturityPhase, string> = {
  juvenile: 'Juvenile',
  entree_production: 'Entering Production',
  pleine_production: 'Full Production',
  maturite_avancee: 'Advanced Maturity',
  senescence: 'Senescence',
  unknown: 'Unknown',
};

function getScoreColor(score: number): string {
  if (score >= 80) return colors.primary[500];
  if (score >= 60) return colors.yellow[500];
  if (score >= 40) return colors.yellow[600];
  return colors.red[500];
}

function ScoreBar({ label, value, maxValue = 100 }: { label: string; value: number; maxValue?: number }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const color = getScoreColor(percentage);

  return (
    <View style={scoreBarStyles.container}>
      <View style={scoreBarStyles.header}>
        <Text style={scoreBarStyles.label}>{label}</Text>
        <Text style={scoreBarStyles.value}>{Math.round(value)}</Text>
      </View>
      <View style={scoreBarStyles.track}>
        <View style={[scoreBarStyles.fill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const scoreBarStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
  },
  track: {
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});

export function ExecutiveSummary({
  healthScore,
  confidenceScore,
  maturityPhase,
  yieldPotential,
}: ExecutiveSummaryProps) {
  const { t } = useTranslation('common');

  const normalizedConfidence = confidenceScore?.normalized_score
    ? Math.round(confidenceScore.normalized_score * 100)
    : null;

  return (
    <Card variant="elevated">
      <Text style={styles.title}>{t('calibration.executiveSummary')}</Text>

      {/* Health Score Circle */}
      {healthScore && (
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(healthScore.total) }]}>
            <Text style={[styles.scoreValue, { color: getScoreColor(healthScore.total) }]}>
              {Math.round(healthScore.total)}
            </Text>
            <Text style={styles.scoreLabel}>{t('calibration.healthScore')}</Text>
          </View>
        </View>
      )}

      {/* Maturity Phase */}
      {maturityPhase && maturityPhase !== 'unknown' && (
        <View style={styles.phaseContainer}>
          <Text style={styles.phaseLabel}>{t('calibration.maturityPhase')}:</Text>
          <Text style={styles.phaseValue}>{maturityPhaseLabels[maturityPhase]}</Text>
        </View>
      )}

      {/* Yield Potential */}
      {yieldPotential && (
        <View style={styles.yieldContainer}>
          <Text style={styles.yieldLabel}>{t('calibration.yieldPotential')}:</Text>
          <Text style={styles.yieldValue}>
            {yieldPotential.minimum} - {yieldPotential.maximum} t/ha
          </Text>
        </View>
      )}

      {/* Confidence Score */}
      {normalizedConfidence != null && (
        <ScoreBar
          label={t('calibration.confidenceScore')}
          value={normalizedConfidence}
        />
      )}

      {/* Component Scores */}
      {healthScore?.components && (
        <View style={styles.componentsContainer}>
          <Text style={styles.componentsTitle}>{t('calibration.components')}</Text>
          <ScoreBar label={t('calibration.vigor')} value={healthScore.components.vigor} />
          <ScoreBar label={t('calibration.stability')} value={healthScore.components.stability} />
          <ScoreBar label={t('calibration.hydric')} value={healthScore.components.hydric} />
          <ScoreBar label={t('calibration.nutritional')} value={healthScore.components.nutritional} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  phaseContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  phaseLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginRight: spacing.xs,
  },
  phaseValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
  },
  yieldContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  yieldLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginRight: spacing.xs,
  },
  yieldValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary[600],
  },
  componentsContainer: {
    marginTop: spacing.md,
  },
  componentsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
});
