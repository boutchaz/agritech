// Team Overview Screen
import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useWorkers, useTimeLogs } from '@/hooks/useWorkers';
import type { Worker, WorkerType } from '@/types/workforce';

const TYPE_COLORS: Record<WorkerType, string> = {
  fixed_salary: colors.blue[500],
  daily_worker: colors.yellow[500],
  metayage: colors.primary[600],
};

export default function TeamScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { data: workersData, refetch: refetchWorkers } = useWorkers({ is_active: true });
  const { data: timeLogsData, refetch: refetchTimeLogs } = useTimeLogs();
  const [refreshing, setRefreshing] = useState(false);

  const workers = workersData?.data || [];
  const timeLogs = timeLogsData?.data || [];

  // Map of currently clocked-in worker IDs
  const clockedInWorkerIds = useMemo(() => {
    const ids = new Set<string>();
    timeLogs.forEach((l) => {
      if (!l.clock_out) ids.add(l.worker_id);
    });
    return ids;
  }, [timeLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWorkers(), refetchTimeLogs()]);
    setRefreshing(false);
  };

  const renderWorker = ({ item: worker }: { item: Worker }) => {
    const initials = `${worker.first_name?.[0] || ''}${worker.last_name?.[0] || ''}`.toUpperCase();
    const isClockedIn = clockedInWorkerIds.has(worker.id);

    return (
      <Pressable
        style={styles.workerCard}
        onPress={() => router.push(`/(drawer)/(workforce)/${worker.id}`)}
      >
        <View style={[styles.avatar, { backgroundColor: TYPE_COLORS[worker.worker_type] + '20' }]}>
          <Text style={[styles.avatarText, { color: TYPE_COLORS[worker.worker_type] }]}>{initials}</Text>
          {isClockedIn && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.workerInfo}>
          <Text style={styles.workerName} numberOfLines={1}>{worker.first_name} {worker.last_name}</Text>
          <Text style={styles.workerRole} numberOfLines={1}>{worker.position || worker.worker_type.replace(/_/g, ' ')}</Text>
        </View>
        <View style={styles.statsColumn}>
          <Text style={styles.statValue}>{worker.total_tasks_completed}</Text>
          <Text style={styles.statLabel}>tasks</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('domains.team', { ns: 'navigation', defaultValue: 'Team' })}
        showBack={false}
        actions={[
          {
            icon: 'people-outline' as const,
            onPress: () => router.push('/(drawer)/(workforce)'),
          },
        ]}
      />

      {/* Quick stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatValue}>{workers.length}</Text>
          <Text style={styles.quickStatLabel}>Total</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStatItem}>
          <Text style={[styles.quickStatValue, { color: colors.primary[600] }]}>{clockedInWorkerIds.size}</Text>
          <Text style={styles.quickStatLabel}>Clocked In</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatValue}>{workers.length - clockedInWorkerIds.size}</Text>
          <Text style={styles.quickStatLabel}>Off</Text>
        </View>
      </View>

      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={renderWorker}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>
              {t('workforce.noWorkers', { defaultValue: 'No workers found' })}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t('workforce.noWorkersHint', { defaultValue: 'Add workers from the Workforce module' })}
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
  quickStats: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  quickStatLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: colors.gray[200],
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary[600],
    borderWidth: 2,
    borderColor: colors.white,
  },
  workerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  workerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  workerRole: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statsColumn: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.gray[700],
  },
  statLabel: {
    fontSize: 10,
    color: colors.gray[400],
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
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    textAlign: 'center',
  },
});
