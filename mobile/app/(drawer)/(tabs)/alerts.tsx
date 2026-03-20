// Alerts Screen - Shows notifications and alerts
import { View, Text, StyleSheet, Pressable, RefreshControl, SectionList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import type { Notification, NotificationType } from '@/types/notification';
import { useMemo } from 'react';

function getNotificationIcon(type: NotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'task':
      return 'checkmark-circle-outline';
    case 'harvest':
      return 'leaf-outline';
    case 'alert':
      return 'alert-circle-outline';
    case 'system':
      return 'settings-outline';
    case 'approval':
      return 'checkbox-outline';
    case 'calibration':
      return 'analytics-outline';
    case 'weather':
      return 'partly-sunny-outline';
    case 'inventory':
      return 'cube-outline';
    default:
      return 'notifications-outline';
  }
}

function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'task':
      return colors.primary[500];
    case 'harvest':
      return '#22c55e'; // green
    case 'alert':
      return colors.red[500];
    case 'system':
      return colors.gray[500];
    case 'approval':
      return colors.blue[500];
    case 'calibration':
      return '#a855f7'; // purple
    case 'weather':
      return colors.yellow[500];
    case 'inventory':
      return '#f97316'; // orange
    default:
      return colors.gray[500];
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationItem({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const icon = getNotificationIcon(notification.type);
  const color = getNotificationColor(notification.type);
  const markAsRead = useMarkNotificationAsRead();

  const handlePress = () => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    onPress();
  };

  return (
    <Pressable
      style={[styles.notificationItem, !notification.is_read && styles.unreadItem]}
      onPress={handlePress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !notification.is_read && styles.unreadTitle]} numberOfLines={1}>
          {notification.title}
        </Text>
        {notification.message && (
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
        )}
        <Text style={styles.timeText}>{formatTimeAgo(notification.created_at)}</Text>
      </View>
      {!notification.is_read && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export default function AlertsScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { data: notifications = [], refetch, isRefetching } = useNotifications({});
  const unreadCount = useUnreadNotificationCount() || 0;
  const markAllAsRead = useMarkAllNotificationsAsRead();

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: { title: string; data: Notification[] }[] = [];
    const todayItems: Notification[] = [];
    const yesterdayItems: Notification[] = [];
    const thisWeekItems: Notification[] = [];
    const olderItems: Notification[] = [];

    notifications.forEach((notification) => {
      const date = new Date(notification.created_at);
      if (date >= today) {
        todayItems.push(notification);
      } else if (date >= yesterday) {
        yesterdayItems.push(notification);
      } else if (date >= weekAgo) {
        thisWeekItems.push(notification);
      } else {
        olderItems.push(notification);
      }
    });

    if (todayItems.length > 0) {
      groups.push({ title: t('notifications.today', 'Today'), data: todayItems });
    }
    if (yesterdayItems.length > 0) {
      groups.push({ title: t('notifications.yesterday', 'Yesterday'), data: yesterdayItems });
    }
    if (thisWeekItems.length > 0) {
      groups.push({ title: t('notifications.thisWeek', 'This Week'), data: thisWeekItems });
    }
    if (olderItems.length > 0) {
      groups.push({ title: t('notifications.older', 'Older'), data: olderItems });
    }

    return groups;
  }, [notifications, t]);

  const handleNotificationPress = (notification: Notification) => {
    const { data } = notification;
    if (data?.taskId) {
      router.push(`/(drawer)/(tabs)/tasks`);
    } else if (data?.harvestId) {
      router.push(`/(drawer)/(tabs)/harvest`);
    } else if (data?.parcelId) {
      router.push(`/(drawer)/(production)/parcel/${data.parcelId}`);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllAsRead.mutate();
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('alerts.title', { ns: 'navigation', defaultValue: 'Alerts' })}
        showBack={false}
        actions={
          unreadCount > 0
            ? [{ icon: 'checkmark-done-outline' as const, onPress: handleMarkAllRead }]
            : undefined
        }
      />

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={56} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>{t('notifications.empty', 'No notifications')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('notifications.willAppearHere', 'New notifications will appear here')}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem notification={item} onPress={() => handleNotificationPress(item)} />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  sectionHeader: {
    backgroundColor: colors.gray[50],
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  unreadItem: {
    backgroundColor: colors.primary[50],
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  notificationTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  unreadTitle: {
    fontWeight: fontWeight.semibold,
  },
  notificationMessage: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
    lineHeight: 16,
  },
  timeText: {
    fontSize: 10,
    color: colors.gray[400],
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginLeft: spacing.xs,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
