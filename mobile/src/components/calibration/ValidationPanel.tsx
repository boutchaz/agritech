// ValidationPanel - UI for validating and launching calibration
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Button, Card, Badge } from '@/components/ui';
import type { CalibrationReadinessResponse } from '@/types/calibration';

interface ValidationPanelProps {
  readiness: CalibrationReadinessResponse;
  onValidate: () => void;
  onStartCalibration: () => void;
  isLoading?: boolean;
  canValidate?: boolean;
  canStart?: boolean;
}

export function ValidationPanel({
  readiness,
  onValidate,
  onStartCalibration,
  isLoading = false,
  canValidate = false,
  canStart = false,
}: ValidationPanelProps) {
  const { t } = useTranslation('common');
  const { ready, checks, confidence_preview } = readiness;

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  return (
    <Card variant="elevated" style={styles.container}>
      <Text style={styles.title}>{t('calibration.validationPanel')}</Text>

      {/* Confidence Preview */}
      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceLabel}>{t('calibration.confidencePreview')}</Text>
        <Text style={styles.confidenceValue}>{Math.round(confidence_preview)}%</Text>
      </View>

      {/* Check Summary */}
      <View style={styles.summaryContainer}>
        {passCount > 0 && (
          <View style={styles.summaryItem}>
            <Badge variant="success" size="sm" label={`${passCount} ${t('calibration.passed')}`} />
          </View>
        )}
        {warningCount > 0 && (
          <View style={styles.summaryItem}>
            <Badge variant="warning" size="sm" label={`${warningCount} ${t('calibration.warnings')}`} />
          </View>
        )}
        {failCount > 0 && (
          <View style={styles.summaryItem}>
            <Badge variant="error" size="sm" label={`${failCount} ${t('calibration.failed')}`} />
          </View>
        )}
      </View>

      {/* Checks List */}
      <View style={styles.checksContainer}>
        {checks.map((check, index) => (
          <View key={index} style={styles.checkItem}>
            <View style={[styles.checkDot, { backgroundColor: colors[check.status === 'pass' ? 'primary' : check.status === 'warning' ? 'yellow' : 'red'][500] }]} />
            <View style={styles.checkContent}>
              <Text style={styles.checkMessage}>{check.message}</Text>
              <Text style={styles.checkName}>{check.check}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {canValidate && (
          <Button
            variant="primary"
            onPress={onValidate}
            disabled={isLoading || !ready}
            style={styles.actionButton}
          >
            {isLoading ? <ActivityIndicator color={colors.white} /> : t('calibration.validate')}
          </Button>
        )}
        {canStart && (
          <Button
            variant={ready ? 'primary' : 'secondary'}
            onPress={onStartCalibration}
            disabled={isLoading}
            style={styles.actionButton}
          >
            {isLoading ? <ActivityIndicator color={colors.white} /> : t('calibration.start')}
          </Button>
        )}
      </View>

      {/* Improvements */}
      {readiness.improvements.length > 0 && (
        <View style={styles.improvementsContainer}>
          <Text style={styles.improvementsTitle}>{t('calibration.improvements')}</Text>
          {readiness.improvements.map((improvement, index) => (
            <Text key={index} style={styles.improvementItem}>
              • {improvement}
            </Text>
          ))}
        </View>
      )}
    </Card>
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
    marginBottom: spacing.md,
  },
  confidenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  confidenceLabel: {
    fontSize: fontSize.base,
    color: colors.gray[700],
  },
  confidenceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary[600],
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryItem: {},
  checksContainer: {
    marginBottom: spacing.md,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  checkContent: {
    flex: 1,
  },
  checkMessage: {
    fontSize: fontSize.sm,
    color: colors.gray[800],
  },
  checkName: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  improvementsContainer: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.yellow[50],
    borderRadius: borderRadius.md,
  },
  improvementsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.yellow[700],
    marginBottom: spacing.xs,
  },
  improvementItem: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    marginBottom: 2,
  },
});
