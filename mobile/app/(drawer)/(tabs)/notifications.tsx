// Notifications Center Screen
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/useNotifications';
import type { Notification, NotificationType } from '@/types/notification';
import { useState } from 'react';

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
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !notification.is_read && styles.unreadTitle]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.timeText}>{formatTimeAgo(notification.created_at)}</Text>
        </View>
        {notification.message && (
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
        )}
      </View>
      {!notification.is_read && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], refetch, isRefetching } = useNotifications({});
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationPress = (notification: Notification) => {
    const { data } = notification;
    if (data?.taskId) {
      router.push(`/(drawer)/(tabs)/tasks`);
    } else if (data?.harvestId) {
      router.push(`/(drawer)/(tabs)/harvest`);
    } else if (data?.parcelId) {
      router.push(`/(drawer)/(tabs)/production/parcel/${data.parcelId}`);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('notifications.title', { ns: 'navigation', defaultValue: 'Notifications' })}
        actions={unreadCount > 0 ? [{ icon: 'checkmark-done-outline' as const, onPress: handleMarkAllRead }] : undefined}
      />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <Pressable
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            {t('notifications.all', 'All')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
            {t('notifications.unread', 'Unread')}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={filter === 'unread' ? 'mail-open-outline' : 'notifications-off-outline'}
              size={56}
              color={colors.gray[300]}
            />
            <Text style={styles.emptyTitle}>
              {filter === 'unread'
                ? t('notifications.noUnread', 'No unread notifications')
                : t('notifications.empty', 'No notifications')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'unread'
                ? t('notifications.allCaughtUp', "You're all caught up!")
                : t('notifications.willAppearHere', 'New notifications will appear here')}
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary[500],
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  filterTabTextActive: {
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.red[500],
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
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
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadTitle: {
    fontWeight: fontWeight.semibold,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  notificationMessage: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 4,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginLeft: spacing.sm,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
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
  },
});
