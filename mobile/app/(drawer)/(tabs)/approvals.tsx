// Approvals Screen
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useApprovals, useApproveRequest, useRejectRequest } from '@/hooks/useNotifications';
import type { ApprovalRequest, ApprovalType, ApprovalStatus } from '@/types/notification';
import { useState } from 'react';

function getApprovalIcon(type: ApprovalType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'task_completion':
      return 'checkmark-circle-outline';
    case 'harvest_validation':
      return 'leaf-outline';
    case 'time_log':
      return 'time-outline';
    case 'expense':
      return 'wallet-outline';
    default:
      return 'checkbox-outline';
  }
}

function getApprovalColor(type: ApprovalType): string {
  switch (type) {
    case 'task_completion':
      return colors.primary[500];
    case 'harvest_validation':
      return '#22c55e'; // green
    case 'time_log':
      return colors.blue[500];
    case 'expense':
      return '#a855f7'; // purple
    default:
      return colors.gray[500];
  }
}

function getStatusColor(status: ApprovalStatus): string {
  switch (status) {
    case 'pending':
      return colors.yellow[500];
    case 'approved':
      return '#22c55e'; // green
    case 'rejected':
      return colors.red[500];
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

function ApprovalItem({
  approval,
  onApprove,
  onReject,
}: {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const icon = getApprovalIcon(approval.type);
  const color = getApprovalColor(approval.type);
  const statusColor = getStatusColor(approval.status);
  const { t } = useTranslation(['common', 'navigation']);

  const requesterName = approval.requester
    ? `${approval.requester.first_name || ''} ${approval.requester.last_name || ''}`.trim()
    : 'Unknown';

  return (
    <View style={styles.approvalItem}>
      <View style={styles.approvalHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.approvalInfo}>
          <Text style={styles.approvalTitle} numberOfLines={2}>
            {approval.title}
          </Text>
          <View style={styles.approvalMeta}>
            <Text style={styles.requesterText}>{requesterName}</Text>
            <Text style={styles.dotSeparator}>·</Text>
            <Text style={styles.timeText}>{formatTimeAgo(approval.created_at)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {t(`approvals.status.${approval.status}`, approval.status)}
          </Text>
        </View>
      </View>

      {approval.description && (
        <Text style={styles.approvalDescription} numberOfLines={2}>
          {approval.description}
        </Text>
      )}

      {approval.status === 'pending' && (
        <View style={styles.actionButtons}>
          <Pressable style={styles.approveButton} onPress={onApprove}>
            <Ionicons name="checkmark-outline" size={18} color="#16a34a" />
            <Text style={styles.approveText}>
              {t('approvals.approve', 'Approve')}
            </Text>
          </Pressable>
          <Pressable style={styles.rejectButton} onPress={onReject}>
            <Ionicons name="close-outline" size={18} color={colors.red[500]} />
            <Text style={styles.rejectText}>
              {t('approvals.reject', 'Reject')}
            </Text>
          </Pressable>
        </View>
      )}

      {approval.status === 'rejected' && approval.rejection_reason && (
        <View style={styles.rejectionReason}>
          <Ionicons name="information-circle-outline" size={14} color={colors.red[500]} />
          <Text style={styles.rejectionText}>{approval.rejection_reason}</Text>
        </View>
      )}
    </View>
  );
}

export default function ApprovalsScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const [filter, setFilter] = useState<ApprovalStatus | 'all'>('pending');

  const { data: approvals = [], refetch, isRefetching } = useApprovals(
    filter !== 'all' ? { status: filter } : {}
  );
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  const handleApprove = (approval: ApprovalRequest) => {
    Alert.alert(
      t('approvals.confirmApprove', 'Approve Request'),
      t('approvals.confirmApproveMessage', 'Are you sure you want to approve this request?'),
      [
        { text: t('actions.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('approvals.approve', 'Approve'),
          style: 'default',
          onPress: () => approveRequest.mutate({ approvalId: approval.id }),
        },
      ]
    );
  };

  const handleReject = (approval: ApprovalRequest) => {
    Alert.alert(
      t('approvals.confirmReject', 'Reject Request'),
      t('approvals.confirmRejectMessage', 'Are you sure you want to reject this request?'),
      [
        { text: t('actions.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('approvals.reject', 'Reject'),
          style: 'destructive',
          onPress: () => rejectRequest.mutate({ approvalId: approval.id, reason: 'Rejected' }),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('approvals.title', { ns: 'navigation', defaultValue: 'Approvals' })}
        showMenu
      />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <Pressable
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}>
            {t('approvals.pending', 'Pending')}
          </Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount > 99 ? '99+' : pendingCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'approved' && styles.filterTabActive]}
          onPress={() => setFilter('approved')}
        >
          <Text style={[styles.filterTabText, filter === 'approved' && styles.filterTabTextActive]}>
            {t('approvals.approved', 'Approved')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'rejected' && styles.filterTabActive]}
          onPress={() => setFilter('rejected')}
        >
          <Text style={[styles.filterTabText, filter === 'rejected' && styles.filterTabTextActive]}>
            {t('approvals.rejected', 'Rejected')}
          </Text>
        </Pressable>
      </View>

      {/* Approvals List */}
      <FlatList
        data={approvals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ApprovalItem
            approval={item}
            onApprove={() => handleApprove(item)}
            onReject={() => handleReject(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="checkmark-done-outline"
              size={56}
              color={colors.gray[300]}
            />
            <Text style={styles.emptyTitle}>
              {filter === 'pending'
                ? t('approvals.noPending', 'No pending approvals')
                : t('approvals.empty', 'No approvals')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'pending'
                ? t('approvals.allDone', "You're all caught up!")
                : t('approvals.willAppearHere', 'Approvals will appear here')}
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
  approvalItem: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  approvalTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    lineHeight: 20,
  },
  approvalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  requesterText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  dotSeparator: {
    color: colors.gray[400],
    marginHorizontal: spacing.xs,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  approvalDescription: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7', // green-100
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  approveText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#16a34a', // green-600
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.red[50],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  rejectText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.red[500],
  },
  rejectionReason: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  rejectionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.red[500],
    fontStyle: 'italic',
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
