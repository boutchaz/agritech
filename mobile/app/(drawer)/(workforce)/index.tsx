// Workforce Hub Screen
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useWorkers, useTimeLogs } from '@/hooks/useWorkers';
import { useState, useMemo } from 'react';

function MenuCard({
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuCard} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon as any} size={28} color={colors.primary[600]} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
    </Pressable>
  );
}

export default function WorkforceHubScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { data: workersData, refetch: refetchWorkers } = useWorkers();
  const { data: timeLogsData, refetch: refetchTimeLogs } = useTimeLogs();
  const [refreshing, setRefreshing] = useState(false);

  const workers = workersData?.data || [];
  const timeLogs = timeLogsData?.data || [];

  const counts = useMemo(() => {
    const activeWorkers = workers.filter((w) => w.is_active).length;
    const fixedSalary = workers.filter((w) => w.worker_type === 'fixed_salary').length;
    const dailyWorkers = workers.filter((w) => w.worker_type === 'daily_worker').length;
    const activeLogs = timeLogs.filter((l) => !l.clock_out).length;
    return { activeWorkers, fixedSalary, dailyWorkers, activeLogs };
  }, [workers, timeLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWorkers(), refetchTimeLogs()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('domains.workforce', { ns: 'navigation', defaultValue: 'Workforce' })}
        onMorePress={() => {}}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: colors.primary[600] }]}>
            <Text style={styles.summaryValue}>{counts.activeWorkers}</Text>
            <Text style={styles.summaryLabel}>{t('workforce.active', { defaultValue: 'Active' })}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: colors.blue[500] }]}>
            <Text style={styles.summaryValue}>{counts.fixedSalary}</Text>
            <Text style={styles.summaryLabel}>{t('workforce.employees', { defaultValue: 'Employees' })}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: colors.yellow[500] }]}>
            <Text style={styles.summaryValue}>{counts.dailyWorkers}</Text>
            <Text style={styles.summaryLabel}>{t('workforce.dayLabor', { defaultValue: 'Day Labor' })}</Text>
          </View>
        </View>

        {/* Active Clock-ins */}
        {counts.activeLogs > 0 && (
          <View style={styles.activeAlert}>
            <Ionicons name="time-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.activeAlertText}>
              {counts.activeLogs} {t('workforce.currentlyClocked', { defaultValue: 'currently clocked in' })}
            </Text>
          </View>
        )}

        {/* Menu Cards */}
        <MenuCard
          icon="people-outline"
          title={t('workforce.allWorkers', { defaultValue: 'All Workers' })}
          subtitle={t('workforce.allWorkersSubtitle', { defaultValue: 'Manage your workforce directory' })}
          badge={workers.length}
          onPress={() => router.push('/(drawer)/(workforce)/workers')}
        />
        <MenuCard
          icon="time-outline"
          title={t('workforce.timeLogs', { defaultValue: 'Time Logs' })}
          subtitle={t('workforce.timeLogsSubtitle', { defaultValue: 'Attendance and time tracking' })}
          badge={counts.activeLogs}
          onPress={() => router.push('/(drawer)/(workforce)/time-logs')}
        />
        <MenuCard
          icon="briefcase-outline"
          title={t('workforce.employees', { defaultValue: 'Employees' })}
          subtitle={t('workforce.employeesSubtitle', { defaultValue: 'Fixed salary workers' })}
          badge={counts.fixedSalary}
          onPress={() => router.push({ pathname: '/(drawer)/(workforce)/workers', params: { type: 'fixed_salary' } })}
        />
        <MenuCard
          icon="person-outline"
          title={t('workforce.dayLaborers', { defaultValue: 'Day Laborers' })}
          subtitle={t('workforce.dayLaborersSubtitle', { defaultValue: 'Daily rate workers' })}
          badge={counts.dailyWorkers}
          onPress={() => router.push({ pathname: '/(drawer)/(workforce)/workers', params: { type: 'daily_worker' } })}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  activeAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[600],
  },
  activeAlertText: {
    fontSize: fontSize.sm,
    color: colors.primary[600],
    fontWeight: fontWeight.medium,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  menuTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  menuSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.primary[600],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: spacing.xs,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
});
