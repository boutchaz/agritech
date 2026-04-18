// CalibrationHistoryList - Display calibration history timeline
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Card, Badge, EmptyState } from '@/components/ui';
import type { CalibrationHistoryRecord } from '@/types/calibration';

interface CalibrationHistoryListProps {
  history: CalibrationHistoryRecord[];
  onSelect?: (record: CalibrationHistoryRecord) => void;
}

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; color: string; label: string }> = {
  completed: { variant: 'success', color: colors.primary[500], label: 'Completed' },
  in_progress: { variant: 'info', color: colors.blue[500], label: 'In Progress' },
  failed: { variant: 'error', color: colors.red[500], label: 'Failed' },
  pending: { variant: 'neutral', color: colors.gray[500], label: 'Pending' },
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CalibrationHistoryList({ history, onSelect }: CalibrationHistoryListProps) {
  const { t } = useTranslation('common');

  if (history.length === 0) {
    return (
      <EmptyState
        icon="analytics-outline"
        title={t('calibration.noHistory')}
        subtitle={t('calibration.noHistoryDesc')}
      />
    );
  }

  const renderItem = ({ item, index }: { item: CalibrationHistoryRecord; index: number }) => {
    const config = statusConfig[item.status] || statusConfig.pending;

    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineLine}>
          <View style={[styles.timelineDot, { backgroundColor: config.color }]} />
          {index < history.length - 1 && <View style={styles.timelineConnector} />}
        </View>
        <View style={styles.cardWrapper}>
          <Card
            variant="outlined"
            onPress={onSelect ? () => onSelect(item) : undefined}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {t('calibration.calibration')} #{history.length - index}
              </Text>
              <Badge variant={config.variant} size="sm" label={config.label} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>{t('calibration.healthScore')}</Text>
                <Text style={styles.metricValue}>
                  {item.health_score != null ? Math.round(item.health_score) : '-'}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>{t('calibration.confidence')}</Text>
                <Text style={styles.metricValue}>
                  {item.confidence_score != null ? `${Math.min(Math.round(item.confidence_score), 100)}%` : '-'}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>{t('calibration.date')}</Text>
                <Text style={styles.metricValue}>{formatDate(item.created_at)}</Text>
              </View>
              {item.maturity_phase && (
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{t('calibration.phase')}</Text>
                  <Text style={styles.metricValue}>{item.maturity_phase}</Text>
                </View>
              )}
            </View>
            {item.error_message && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{item.error_message}</Text>
              </View>
            )}
          </Card>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('calibration.history')}</Text>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
      />
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
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray[200],
    marginTop: 4,
  },
  cardWrapper: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
  },
  cardContent: {},
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[800],
  },
  errorContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.red[50],
    borderRadius: borderRadius.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.red[600],
  },
});
