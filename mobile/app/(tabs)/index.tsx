import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import { useMyTasks, useTaskStatistics } from '@/hooks/useTasks';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}

function QuickAction({ icon, title, subtitle, color, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={colors.white} />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: 'up' | 'down';
  isLoading?: boolean;
}

function StatCard({ title, value, icon, trend, isLoading }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={20} color={colors.primary[600]} />
        {trend && (
          <Ionicons
            name={trend === 'up' ? 'trending-up' : 'trending-down'}
            size={16}
            color={trend === 'up' ? colors.primary[500] : colors.red[500]}
          />
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.gray[400]} style={styles.statLoading} />
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, currentFarm } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useMyTasks();
  const { data: statistics, isLoading: statsLoading, refetch: refetchStats } = useTaskStatistics();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchTasks(), refetchStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchTasks, refetchStats]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Calculate today's stats from actual data
  const todayTasks = tasks?.filter((task) => {
    if (!task.due_date) return false;
    return isToday(new Date(task.due_date));
  }) || [];

  const pendingTasksCount = tasks?.filter((t) => t.status === 'pending').length || 0;
  const completedTasksCount = tasks?.filter((t) => t.status === 'completed').length || 0;
  const todayTasksCount = todayTasks.length;

  // Calculate hours worked - this would need to come from time logs API
  // For now, we'll use a placeholder that could be enhanced with real data
  const hoursToday = statistics ? '—' : '—';
  const hoursWeek = statistics ? '—' : '—';

  // Get recent activity from tasks
  const recentActivity = tasks?.slice(0, 3).map((task) => ({
    type: task.status === 'completed' ? 'completed' : task.status === 'in_progress' ? 'in_progress' : 'pending',
    text: task.title,
    time: format(new Date(task.updated_at || task.created_at), 'MMM dd, HH:mm'),
  })) || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>
            {profile?.first_name || 'Worker'}
          </Text>
        </View>
        <View style={styles.farmBadge}>
          <Ionicons name="location" size={14} color={colors.primary[600]} />
          <Text style={styles.farmName}>
            {currentFarm?.name || 'Select Farm'}
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Today's Tasks"
          value={todayTasksCount}
          icon="checkbox"
          trend={todayTasksCount > 0 ? 'up' : undefined}
          isLoading={tasksLoading}
        />
        <StatCard
          title="Pending"
          value={pendingTasksCount}
          icon="list-outline"
          isLoading={tasksLoading}
        />
        <StatCard
          title="Completed"
          value={completedTasksCount}
          icon="checkmark-circle"
          isLoading={tasksLoading}
        />
        <StatCard
          title="Hours Today"
          value={hoursToday}
          icon="time"
          isLoading={statsLoading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="add-circle"
            title="New Harvest"
            subtitle="Record harvest"
            color={colors.primary[500]}
            onPress={() => router.push('/harvest/new')}
          />
          <QuickAction
            icon="checkbox"
            title="My Tasks"
            subtitle="View tasks"
            color={colors.blue[500]}
            onPress={() => router.push('/(tabs)/tasks')}
          />
          <QuickAction
            icon="time"
            title="Clock In/Out"
            subtitle="Track time"
            color={colors.yellow[500]}
            onPress={() => router.push('/(tabs)/clock')}
          />
          <QuickAction
            icon="camera"
            title="Take Photo"
            subtitle="Document"
            color={colors.red[500]}
            onPress={() => {}}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.activityList}>
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View
                  style={[
                    styles.activityDot,
                    {
                      backgroundColor:
                        activity.type === 'completed'
                          ? colors.primary[500]
                          : activity.type === 'in_progress'
                          ? colors.blue[500]
                          : colors.yellow[500],
                    },
                  ]}
                />
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    {activity.type === 'completed' ? 'Task completed - ' : activity.type === 'in_progress' ? 'Task started - ' : 'New task - '}
                    {activity.text}
                  </Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.base,
    color: colors.gray[500],
  },
  userName: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
  },
  farmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  farmName: {
    fontSize: fontSize.sm,
    color: colors.primary[700],
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '50%',
    padding: spacing.xs,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statLoading: {
    marginTop: spacing.xs,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
  },
  statTitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  seeAll: {
    fontSize: fontSize.sm,
    color: colors.primary[600],
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  quickAction: {
    width: '50%',
    padding: spacing.xs,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  quickActionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  activityList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  activityTime: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    marginTop: 2,
  },
  emptyActivity: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
});
