// Worker Detail Screen
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Linking,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import WorkerForm from '@/components/WorkerForm';
import {
  useWorker,
  useTimeLogs,
  useUpdateWorker,
  useDeleteWorker,
  useGrantPlatformAccess,
} from '@/hooks/useWorkers';
import type { WorkerType } from '@/types/workforce';

const TYPE_LABELS: Record<WorkerType, string> = {
  fixed_salary: 'Employee',
  daily_worker: 'Day Laborer',
  metayage: 'Metayage',
};

const TYPE_COLORS: Record<WorkerType, string> = {
  fixed_salary: colors.blue[500],
  daily_worker: colors.yellow[500],
  metayage: colors.primary[600],
};

export default function WorkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('common');
  const { data: worker, isLoading, refetch } = useWorker(id!);
  const { data: timeLogsData } = useTimeLogs({ worker_id: id });
  const [refreshing, setRefreshing] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const updateWorker = useUpdateWorker(id!);
  const deleteWorker = useDeleteWorker();
  const grantAccess = useGrantPlatformAccess();

  const timeLogs = timeLogsData?.data || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ── More menu ──────────────────────────────────────────────
  const showMoreMenu = () => {
    const options: string[] = [];
    const destructiveIndex: number[] = [];
    const actions: (() => void)[] = [];

    // Grant Platform Access (only if worker has no user_id)
    if (worker && !(worker as any).user_id) {
      options.push('Grant Platform Access');
      actions.push(handleGrantAccess);
    }

    // Deactivate / Reactivate
    if (worker?.is_active) {
      options.push('Deactivate Worker');
      actions.push(handleDeactivate);
    } else {
      options.push('Reactivate Worker');
      actions.push(handleReactivate);
    }

    // Delete
    options.push('Delete Worker');
    destructiveIndex.push(options.length - 1);
    actions.push(handleDelete);

    // Cancel
    options.push('Cancel');
    const cancelIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: destructiveIndex[0],
          cancelButtonIndex: cancelIndex,
        },
        (index) => {
          if (index !== cancelIndex) {
            actions[index]();
          }
        },
      );
    } else {
      // Android fallback using Alert
      Alert.alert(
        'Actions',
        undefined,
        [
          ...actions.map((action, i) => ({
            text: options[i],
            onPress: action,
            style: destructiveIndex.includes(i) ? ('destructive' as const) : ('default' as const),
          })),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  };

  const handleGrantAccess = () => {
    if (!worker) return;
    Alert.prompt(
      'Grant Platform Access',
      `Enter email for ${worker.first_name} ${worker.last_name}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Grant',
          onPress: (email?: string) => {
            if (!email) return;
            grantAccess.mutate(
              {
                workerId: id!,
                data: {
                  email,
                  firstName: worker.first_name,
                  lastName: worker.last_name,
                },
              },
              {
                onSuccess: () => Alert.alert('Success', 'Platform access granted.'),
                onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to grant access'),
              },
            );
          },
        },
      ],
      'plain-text',
      worker.email || '',
    );
  };

  const handleDeactivate = () => {
    Alert.alert('Deactivate Worker', 'Are you sure you want to deactivate this worker?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          updateWorker.mutate(
            { is_active: false },
            {
              onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to deactivate'),
            },
          );
        },
      },
    ]);
  };

  const handleReactivate = () => {
    updateWorker.mutate(
      { is_active: true },
      {
        onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to reactivate'),
      },
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Worker',
      'This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteWorker.mutate(id!, {
              onSuccess: () => router.back(),
              onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete worker'),
            });
          },
        },
      ],
    );
  };

  if (isLoading || !worker) {
    return (
      <View style={styles.container}>
        <PageHeader title={t('actions.loading', { defaultValue: 'Loading...' })} showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('actions.loading', { defaultValue: 'Loading...' })}</Text>
        </View>
      </View>
    );
  }

  const initials = `${worker.first_name?.[0] || ''}${worker.last_name?.[0] || ''}`.toUpperCase();
  const compensation = worker.worker_type === 'fixed_salary'
    ? worker.monthly_salary ? `${worker.monthly_salary.toLocaleString()} MAD/month` : '-'
    : worker.daily_rate ? `${worker.daily_rate.toLocaleString()} MAD/day` : '-';

  return (
    <View style={styles.container}>
      <PageHeader
        title={`${worker.first_name} ${worker.last_name}`}
        showBack
        actions={[{ icon: 'create-outline', onPress: () => setShowEditForm(true) }]}
        onMorePress={showMoreMenu}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Profile Header */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: TYPE_COLORS[worker.worker_type] + '20' }]}>
            <Text style={[styles.avatarText, { color: TYPE_COLORS[worker.worker_type] }]}>{initials}</Text>
          </View>
          <Text style={styles.workerName}>{worker.first_name} {worker.last_name}</Text>
          {worker.position && <Text style={styles.position}>{worker.position}</Text>}
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[worker.worker_type] + '20' }]}>
              <Text style={[styles.typeText, { color: TYPE_COLORS[worker.worker_type] }]}>
                {TYPE_LABELS[worker.worker_type]}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: worker.is_active ? colors.primary[50] : colors.red[50] }]}>
              <Text style={[styles.statusText, { color: worker.is_active ? colors.primary[600] : colors.red[500] }]}>
                {worker.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            {worker.phone && (
              <Pressable style={styles.quickAction} onPress={() => Linking.openURL(`tel:${worker.phone}`)}>
                <Ionicons name="call-outline" size={20} color={colors.primary[600]} />
                <Text style={styles.quickActionText}>Call</Text>
              </Pressable>
            )}
            {worker.email && (
              <Pressable style={styles.quickAction} onPress={() => Linking.openURL(`mailto:${worker.email}`)}>
                <Ionicons name="mail-outline" size={20} color={colors.primary[600]} />
                <Text style={styles.quickActionText}>Email</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{worker.total_days_worked}</Text>
            <Text style={styles.statLabel}>Days Worked</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{worker.total_tasks_completed}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{compensation}</Text>
            <Text style={styles.statLabel}>Compensation</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('workforce.details', { defaultValue: 'Details' })}</Text>
          <View style={styles.detailCard}>
            <DetailRow icon="calendar-outline" label="Hire Date" value={new Date(worker.hire_date).toLocaleDateString()} />
            {worker.end_date && (
              <DetailRow icon="calendar-outline" label="End Date" value={new Date(worker.end_date).toLocaleDateString()} />
            )}
            {worker.cin && <DetailRow icon="card-outline" label="CIN" value={worker.cin} />}
            {worker.phone && <DetailRow icon="call-outline" label="Phone" value={worker.phone} />}
            {worker.email && <DetailRow icon="mail-outline" label="Email" value={worker.email} />}
            <DetailRow
              icon="shield-checkmark-outline"
              label="CNSS"
              value={worker.is_cnss_declared ? (worker.cnss_number || 'Declared') : 'Not declared'}
            />
          </View>
        </View>

        {/* Specialties */}
        {worker.specialties && worker.specialties.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('workforce.specialties', { defaultValue: 'Specialties' })}</Text>
            <View style={styles.tagsRow}>
              {worker.specialties.map((s) => (
                <View key={s} style={styles.tag}>
                  <Text style={styles.tagText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Time Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('workforce.recentTimeLogs', { defaultValue: 'Recent Time Logs' })}</Text>
          {timeLogs.length === 0 ? (
            <Text style={styles.emptyText}>{t('workforce.noTimeLogs', { defaultValue: 'No time logs yet' })}</Text>
          ) : (
            timeLogs.slice(0, 5).map((log) => (
              <View key={log.id} style={styles.timeLogCard}>
                <View style={styles.timeLogHeader}>
                  <Text style={styles.timeLogDate}>{new Date(log.clock_in).toLocaleDateString()}</Text>
                  {!log.clock_out && (
                    <View style={styles.activeBadge}>
                      <View style={styles.activeDot} />
                      <Text style={styles.activeText}>Active</Text>
                    </View>
                  )}
                </View>
                <View style={styles.timeLogRow}>
                  <Ionicons name="log-in-outline" size={14} color={colors.primary[600]} />
                  <Text style={styles.timeLogTime}>{new Date(log.clock_in).toLocaleTimeString()}</Text>
                  {log.clock_out && (
                    <>
                      <Ionicons name="arrow-forward" size={12} color={colors.gray[400]} />
                      <Ionicons name="log-out-outline" size={14} color={colors.red[500]} />
                      <Text style={styles.timeLogTime}>{new Date(log.clock_out).toLocaleTimeString()}</Text>
                    </>
                  )}
                  {log.duration_minutes !== null && (
                    <Text style={styles.durationText}>
                      {Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m
                    </Text>
                  )}
                </View>
                {log.task && (
                  <Text style={styles.taskName}>{log.task.title}</Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Notes */}
        {worker.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('workforce.notes', { defaultValue: 'Notes' })}</Text>
            <Text style={styles.notesText}>{worker.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Worker Modal */}
      <WorkerForm
        visible={showEditForm}
        onClose={() => setShowEditForm(false)}
        isSubmitting={updateWorker.isPending}
        initialData={worker}
        isEdit
        onSubmit={(data) => {
          updateWorker.mutate(data as any, {
            onSuccess: () => {
              setShowEditForm(false);
            },
            onError: (err: any) => {
              Alert.alert('Error', err?.message || 'Failed to update worker');
            },
          });
        }}
      />
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={16} color={colors.gray[400]} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.gray[500],
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  workerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  position: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  quickAction: {
    alignItems: 'center',
    gap: 2,
  },
  quickActionText: {
    fontSize: fontSize.xs,
    color: colors.primary[600],
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: 10,
    color: colors.gray[500],
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    width: 80,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.gray[900],
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.primary[600],
    fontWeight: fontWeight.medium,
  },
  timeLogCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  timeLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeLogDate: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    fontWeight: fontWeight.medium,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  timeLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeLogTime: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  durationText: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginLeft: 'auto',
  },
  taskName: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
});
