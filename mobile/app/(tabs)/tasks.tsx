import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMyTasks, useTaskStatistics } from '@/hooks/useTasks';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import type { Task } from '@/lib/api';

type TaskStatus = Task['status'];
type TaskPriority = Task['priority'];

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { color: colors.yellow[500], label: 'Pending', icon: 'time-outline' },
  in_progress: { color: colors.blue[500], label: 'In Progress', icon: 'play-circle-outline' },
  completed: { color: colors.primary[500], label: 'Completed', icon: 'checkmark-circle-outline' },
  cancelled: { color: colors.gray[400], label: 'Cancelled', icon: 'close-circle-outline' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string }> = {
  low: { color: colors.gray[400], label: 'Low' },
  medium: { color: colors.yellow[500], label: 'Medium' },
  high: { color: colors.red[500], label: 'High' },
  urgent: { color: colors.red[700], label: 'Urgent' },
};

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const status = STATUS_CONFIG[task.status];
  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <TouchableOpacity style={styles.taskCard} onPress={onPress}>
      <View style={styles.taskHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: priority.color + '20' }]}>
          <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
          <Text style={[styles.priorityText, { color: priority.color }]}>
            {priority.label}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Ionicons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <Text style={styles.taskTitle}>{task.title}</Text>
      {task.description && (
        <Text style={styles.taskDescription} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      <View style={styles.taskFooter}>
        {task.parcel && (
          <View style={styles.taskMeta}>
            <Ionicons name="location-outline" size={14} color={colors.gray[400]} />
            <Text style={styles.taskMetaText}>{task.parcel.name}</Text>
          </View>
        )}
        {task.due_date && (
          <View style={styles.taskMeta}>
            <Ionicons name="calendar-outline" size={14} color={colors.gray[400]} />
            <Text style={styles.taskMetaText}>
              {new Date(task.due_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

type FilterType = 'all' | TaskStatus;

export default function TasksScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: tasks, isLoading, refetch, isRefetching } = useMyTasks();
  const { data: statistics } = useTaskStatistics();

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks?.filter((t) => t.status === filter);

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: statistics?.total },
    { key: 'pending', label: 'Pending', count: statistics?.pending },
    { key: 'in_progress', label: 'Active', count: statistics?.in_progress },
    { key: 'completed', label: 'Done', count: statistics?.completed },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[styles.filterText, filter === f.key && styles.filterTextActive]}
            >
              {f.label}
              {f.count !== undefined && ` (${f.count})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => router.push(`/task/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkbox-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No tasks assigned to you' : `No ${filter.replace('_', ' ')} tasks`}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[500],
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    backgroundColor: colors.gray[100],
  },
  filterButtonActive: {
    backgroundColor: colors.primary[600],
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.gray[600],
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
  },
  taskCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  taskTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  taskDescription: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  taskFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingTop: spacing.sm,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  taskMetaText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginLeft: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[400],
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
