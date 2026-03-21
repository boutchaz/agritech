// Workers List Screen
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useWorkers } from '@/hooks/useWorkers';
import type { Worker, WorkerType } from '@/types/workforce';

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

function WorkerCard({ worker }: { worker: Worker }) {
  const initials = `${worker.first_name?.[0] || ''}${worker.last_name?.[0] || ''}`.toUpperCase();

  return (
    <Pressable
      style={styles.workerCard}
      onPress={() => router.push(`/(drawer)/(workforce)/${worker.id}`)}
    >
      <View style={[styles.avatar, { backgroundColor: TYPE_COLORS[worker.worker_type] + '20' }]}>
        <Text style={[styles.avatarText, { color: TYPE_COLORS[worker.worker_type] }]}>{initials}</Text>
      </View>
      <View style={styles.workerInfo}>
        <Text style={styles.workerName}>{worker.first_name} {worker.last_name}</Text>
        <View style={styles.workerMeta}>
          {worker.position && <Text style={styles.workerPosition}>{worker.position}</Text>}
          <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[worker.worker_type] + '20' }]}>
            <Text style={[styles.typeText, { color: TYPE_COLORS[worker.worker_type] }]}>
              {TYPE_LABELS[worker.worker_type]}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.gray[400]} />
            <Text style={styles.statText}>{worker.total_days_worked}d</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={12} color={colors.gray[400]} />
            <Text style={styles.statText}>{worker.total_tasks_completed} tasks</Text>
          </View>
          {worker.phone && (
            <View style={styles.statItem}>
              <Ionicons name="call-outline" size={12} color={colors.gray[400]} />
              <Text style={styles.statText}>{worker.phone}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.rightSection}>
        {!worker.is_active && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>Inactive</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
      </View>
    </Pressable>
  );
}

export default function WorkersListScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const params = useLocalSearchParams<{ type?: string }>();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<WorkerType | 'all'>(
    (params.type as WorkerType) || 'all'
  );
  const [refreshing, setRefreshing] = useState(false);

  const { data: workersData, refetch } = useWorkers();
  const workers = workersData?.data || [];

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      if (typeFilter !== 'all' && w.worker_type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          w.first_name?.toLowerCase().includes(q) ||
          w.last_name?.toLowerCase().includes(q) ||
          w.phone?.toLowerCase().includes(q) ||
          w.position?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [workers, typeFilter, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const typeOptions: { key: WorkerType | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'fixed_salary', label: 'Employees' },
    { key: 'daily_worker', label: 'Day Laborers' },
    { key: 'metayage', label: 'Metayage' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('workforce.workers', { defaultValue: 'Workers' })}
        showBack
      />

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Ionicons name="search-outline" size={18} color={colors.gray[400]} />
          <TextInput
            style={styles.searchTextInput}
            placeholder={t('actions.search', { defaultValue: 'Search workers...' })}
            placeholderTextColor={colors.gray[400]}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.gray[400]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Type filter */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={typeOptions}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterChip, typeFilter === item.key && styles.filterChipActive]}
              onPress={() => setTypeFilter(item.key)}
            >
              <Text style={[styles.filterChipText, typeFilter === item.key && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Workers list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => <WorkerCard worker={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>
              {t('workforce.noWorkers', { defaultValue: 'No workers found' })}
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
  searchRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    ...shadows.sm,
  },
  searchTextInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.gray[900],
  },
  filterRow: {
    paddingTop: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  filterChipText: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.primary[600],
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
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
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
  workerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  workerPosition: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  typeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: 11,
    color: colors.gray[400],
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  inactiveBadge: {
    backgroundColor: colors.red[50],
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  inactiveText: {
    fontSize: 10,
    color: colors.red[500],
    fontWeight: fontWeight.medium,
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
