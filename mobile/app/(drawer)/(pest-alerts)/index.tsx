// Pest Alerts Hub Screen
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { Badge } from '@/components/ui';
import { usePestReports } from '@/hooks/usePestAlerts';
import { useState, useMemo } from 'react';

function MenuCard({
  icon,
  title,
  subtitle,
  badge,
  badgeVariant = 'error',
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  badge?: number;
  badgeVariant?: 'error' | 'warning' | 'success';
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
        <Badge variant={badgeVariant} label={String(badge)} />
      )}
      <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
    </Pressable>
  );
}

export default function PestAlertsHubScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { data: reports = [], refetch } = usePestReports();
  const [refreshing, setRefreshing] = useState(false);

  const counts = useMemo(() => {
    const active = reports.filter((r) => r.status !== 'resolved' && r.status !== 'dismissed');
    const critical = active.filter((r) => r.severity === 'critical');
    const pending = reports.filter((r) => r.status === 'pending');
    return { active: active.length, critical: critical.length, pending: pending.length };
  }, [reports]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('pestAlerts.title', { ns: 'common', defaultValue: 'Pest & Disease' })}
        actions={[
          {
            icon: 'add-circle-outline' as const,
            onPress: () => router.push('/(drawer)/(pest-alerts)/new'),
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: colors.red[500] }]}>
            <Text style={styles.summaryValue}>{counts.critical}</Text>
            <Text style={styles.summaryLabel}>{t('pestAlerts.critical', { defaultValue: 'Critical' })}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: colors.yellow[500] }]}>
            <Text style={styles.summaryValue}>{counts.active}</Text>
            <Text style={styles.summaryLabel}>{t('pestAlerts.active', { defaultValue: 'Active' })}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: colors.blue[500] }]}>
            <Text style={styles.summaryValue}>{counts.pending}</Text>
            <Text style={styles.summaryLabel}>{t('pestAlerts.pending', { defaultValue: 'Pending' })}</Text>
          </View>
        </View>

        {/* Menu Cards */}
        <MenuCard
          icon="bug-outline"
          title={t('pestAlerts.allReports', { defaultValue: 'All Reports' })}
          subtitle={t('pestAlerts.allReportsSubtitle', { defaultValue: 'View and manage pest reports' })}
          badge={counts.active}
          badgeVariant="warning"
          onPress={() => router.push('/(drawer)/(pest-alerts)/list')}
        />
        <MenuCard
          icon="alert-circle-outline"
          title={t('pestAlerts.criticalAlerts', { defaultValue: 'Critical Alerts' })}
          subtitle={t('pestAlerts.criticalAlertsSubtitle', { defaultValue: 'Requiring immediate action' })}
          badge={counts.critical}
          onPress={() => router.push({ pathname: '/(drawer)/(pest-alerts)/list', params: { severity: 'critical' } })}
        />
        <MenuCard
          icon="time-outline"
          title={t('pestAlerts.pendingReview', { defaultValue: 'Pending Review' })}
          subtitle={t('pestAlerts.pendingReviewSubtitle', { defaultValue: 'Reports awaiting verification' })}
          badge={counts.pending}
          badgeVariant="warning"
          onPress={() => router.push({ pathname: '/(drawer)/(pest-alerts)/list', params: { status: 'pending' } })}
        />
        <MenuCard
          icon="library-outline"
          title={t('pestAlerts.diseaseLibrary', { defaultValue: 'Disease Library' })}
          subtitle={t('pestAlerts.diseaseLibrarySubtitle', { defaultValue: 'Reference pests and diseases' })}
          onPress={() => router.push({ pathname: '/(drawer)/(pest-alerts)/list', params: { tab: 'library' } })}
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
});
