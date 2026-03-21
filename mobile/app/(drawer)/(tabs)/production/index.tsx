import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFarms, useParcels } from '@/hooks/useFarms';
import { useHarvests } from '@/hooks/useHarvests';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { StatRowSkeleton, TaskListSkeleton } from '@/components/Skeleton';
import type { HarvestRecord } from '@/lib/api';

function StatCard({ title, value, icon, color, isLoading }: {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isLoading?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.gray[400]} style={styles.statLoading} />
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );
}

function HarvestRow({ harvest }: { harvest: HarvestRecord }) {
  return (
    <View style={styles.harvestRow}>
      <View style={styles.harvestInfo}>
        <Text style={styles.harvestCrop} numberOfLines={1}>
          {harvest.crop?.name || 'Unknown Crop'}
        </Text>
        <Text style={styles.harvestMeta}>
          {harvest.parcel?.name || harvest.farm?.name} · {new Date(harvest.harvest_date).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.harvestQuantity}>
        <Text style={styles.harvestQtyValue}>{harvest.quantity}</Text>
        <Text style={styles.harvestQtyUnit}>{harvest.unit}</Text>
      </View>
    </View>
  );
}

export default function ProductionDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const { data: farms, isLoading: farmsLoading, refetch: refetchFarms } = useFarms();
  const { data: parcels, isLoading: parcelsLoading, refetch: refetchParcels } = useParcels();
  const { data: harvestData, isLoading: harvestsLoading, refetch: refetchHarvests } = useHarvests();

  const recentHarvests = harvestData?.data?.slice(0, 5) || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchFarms(), refetchParcels(), refetchHarvests()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchFarms, refetchParcels, refetchHarvests]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <PageHeader title={t('domains.production', { defaultValue: 'Production' })} onMorePress={() => {}} />
      <View style={styles.statsRow}>
        <StatCard
          title={t('production.farms', { defaultValue: 'Farms' })}
          value={farms?.length ?? 0}
          icon="business-outline"
          color={colors.primary[600]}
          isLoading={farmsLoading}
        />
        <StatCard
          title={t('production.parcels', { defaultValue: 'Parcels' })}
          value={parcels?.length ?? 0}
          icon="map-outline"
          color={colors.blue[600]}
          isLoading={parcelsLoading}
        />
        <StatCard
          title={t('production.harvests', { defaultValue: 'Harvests' })}
          value={harvestData?.total ?? 0}
          icon="leaf-outline"
          color={colors.yellow[600]}
          isLoading={harvestsLoading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.quickActions', { defaultValue: 'Quick Actions' })}</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(drawer)/(tabs)/production/parcels' as Href)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
              <Ionicons name="map" size={24} color={colors.primary[600]} />
            </View>
            <Text style={styles.actionLabel}>{t('production.viewParcels', { defaultValue: 'View Parcels' })}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/harvest/new')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.yellow[50] }]}>
              <Ionicons name="add-circle" size={24} color={colors.yellow[600]} />
            </View>
            <Text style={styles.actionLabel}>{t('production.recordHarvest', { defaultValue: 'Record Harvest' })}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(drawer)/(tabs)/production/farm-hierarchy' as Href)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.blue[50] }]}>
              <Ionicons name="git-branch-outline" size={24} color={colors.blue[600]} />
            </View>
            <Text style={styles.actionLabel}>{t('production.farmHierarchy', { defaultValue: 'Farm Hierarchy' })}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('production.recentHarvests', { defaultValue: 'Recent Harvests' })}</Text>
          <TouchableOpacity onPress={() => router.push('/(drawer)/(tabs)/harvest')}>
            <Text style={styles.seeAll}>{t('actions.seeAll', { defaultValue: 'See All' })}</Text>
          </TouchableOpacity>
        </View>

        {harvestsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary[600]} />
          </View>
        ) : recentHarvests.length > 0 ? (
          <View style={styles.harvestList}>
            {recentHarvests.map((h) => (
              <HarvestRow key={h.id} harvest={h} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={40} color={colors.gray[300]} />
            <Text style={styles.emptyText}>{t('empty.noHarvests', { defaultValue: 'No harvests yet' })}</Text>
          </View>
        )}
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statLoading: {
    marginVertical: spacing.xs,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
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
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.gray[700],
    textAlign: 'center',
  },
  harvestList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  harvestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  harvestInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  harvestCrop: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  harvestMeta: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  harvestQuantity: {
    alignItems: 'flex-end',
  },
  harvestQtyValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary[600],
  },
  harvestQtyUnit: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  loadingBox: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    marginTop: spacing.sm,
  },
});
