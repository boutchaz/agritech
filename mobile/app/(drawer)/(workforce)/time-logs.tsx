// Time Logs Screen
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTimeLogs } from '@/hooks/useWorkers';
import type { TimeLog } from '@/types/workforce';

function TimeLogCard({ log }: { log: TimeLog }) {
  const workerName = log.worker ? `${log.worker.first_name} ${log.worker.last_name}` : 'Unknown';
  const isActive = !log.clock_out;

  return (
    <View style={[styles.logCard, isActive && styles.logCardActive]}>
      <View style={styles.logHeader}>
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>{workerName}</Text>
          {log.task && <Text style={styles.taskName}>{log.task.title}</Text>}
        </View>
        {isActive && (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        )}
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Ionicons name="log-in-outline" size={16} color={colors.primary[600]} />
          <View>
            <Text style={styles.timeLabel}>Clock In</Text>
            <Text style={styles.timeValue}>{new Date(log.clock_in).toLocaleTimeString()}</Text>
          </View>
        </View>
        {log.clock_out && (
          <View style={styles.timeBlock}>
            <Ionicons name="log-out-outline" size={16} color={colors.red[500]} />
            <View>
              <Text style={styles.timeLabel}>Clock Out</Text>
              <Text style={styles.timeValue}>{new Date(log.clock_out).toLocaleTimeString()}</Text>
            </View>
          </View>
        )}
        {log.duration_minutes !== null && (
          <View style={styles.durationBlock}>
            <Text style={styles.durationValue}>
              {Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m
            </Text>
            <Text style={styles.durationLabel}>Duration</Text>
          </View>
        )}
      </View>

      <Text style={styles.dateText}>{new Date(log.clock_in).toLocaleDateString()}</Text>
    </View>
  );
}

export default function TimeLogsScreen() {
  const { t } = useTranslation('common');
  const { data: timeLogsData, refetch } = useTimeLogs();
  const [refreshing, setRefreshing] = useState(false);

  const timeLogs = timeLogsData?.data || [];

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, TimeLog[]> = {};
    timeLogs.forEach((log) => {
      const date = new Date(log.clock_in).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [timeLogs]);

  const activeCount = timeLogs.filter((l) => !l.clock_out).length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('workforce.timeLogs', { defaultValue: 'Time Logs' })}
        showBack
      />

      {/* Active count banner */}
      {activeCount > 0 && (
        <View style={styles.activeBanner}>
          <Ionicons name="time-outline" size={18} color={colors.primary[600]} />
          <Text style={styles.activeBannerText}>
            {activeCount} {t('workforce.currentlyClocked', { defaultValue: 'currently clocked in' })}
          </Text>
        </View>
      )}

      <FlatList
        data={grouped}
        keyExtractor={([date]) => date}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item: [date, logs] }) => (
          <View style={styles.dateGroup}>
            <Text style={styles.dateGroupTitle}>{date}</Text>
            {logs.map((log) => (
              <TimeLogCard key={log.id} log={log} />
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>
              {t('workforce.noTimeLogs', { defaultValue: 'No time logs' })}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  activeBannerText: {
    fontSize: fontSize.sm,
    color: colors.primary[600],
    fontWeight: fontWeight.medium,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  dateGroup: {
    marginBottom: spacing.md,
  },
  dateGroupTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  logCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  logCardActive: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[600],
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  taskName: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[600],
  },
  activeText: {
    fontSize: 10,
    color: colors.primary[600],
    fontWeight: fontWeight.semibold,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeLabel: {
    fontSize: 10,
    color: colors.gray[400],
  },
  timeValue: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    fontWeight: fontWeight.medium,
  },
  durationBlock: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  durationValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  durationLabel: {
    fontSize: 10,
    color: colors.gray[400],
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
  },
});
