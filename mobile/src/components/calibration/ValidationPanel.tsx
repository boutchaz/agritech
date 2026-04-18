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

const checkStatusColors: Record<string, string> = {
  pass: colors.primary[500],
  warning: colors.yellow[500],
  fail: colors.red[500],
};

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
    <View style={styles.container}>
      <Card variant="elevated">
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
            <View key={check.check} style={styles.checkItem}>
              <View style={[styles.checkDot, { backgroundColor: checkStatusColors[check.status] || colors.gray[500] }]} />
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
            <View style={styles.actionButtonWrapper}>
              <Button
                variant="primary"
                onPress={onValidate}
                disabled={isLoading || !ready}
              >
                {isLoading ? <ActivityIndicator color={colors.white} /> : t('calibration.validate')}
              </Button>
            </View>
          )}
          {canStart && (
            <View style={styles.actionButtonWrapper}>
              <Button
                variant={ready ? 'primary' : 'secondary'}
                onPress={onStartCalibration}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color={colors.white} /> : t('calibration.start')}
              </Button>
            </View>
          )}
        </View>

        {/* Improvements */}
        {readiness.improvements.length > 0 && (
          <View style={styles.improvementsContainer}>
            <Text style={styles.improvementsTitle}>{t('calibration.improvements')}</Text>
            {readiness.improvements.map((improvement, index) => (
              <Text key={improvement} style={styles.improvementItem}>
                • {improvement}
              </Text>
            ))}
          </View>
        )}
      </Card>
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
  actionButtonWrapper: {
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
    color: colors.yellow[600],
    marginBottom: spacing.xs,
  },
  improvementItem: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    marginBottom: 2,
  },
});
