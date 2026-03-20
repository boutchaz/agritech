import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useParcel, useFarm } from '@/hooks/useFarms';
import { useHarvests } from '@/hooks/useHarvests';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useState, useCallback } from 'react';
import type { HarvestRecord } from '@/lib/api';

function InfoRow({ icon, label, value }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabel}>
        <Ionicons name={icon} size={16} color={colors.gray[500]} />
        <Text style={styles.infoLabelText}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function HarvestItem({ harvest }: { harvest: HarvestRecord }) {
  return (
    <View style={styles.harvestItem}>
      <View style={styles.harvestInfo}>
        <Text style={styles.harvestCrop}>{harvest.crop?.name || 'Unknown'}</Text>
        <Text style={styles.harvestDate}>
          {new Date(harvest.harvest_date).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.harvestQty}>
        {harvest.quantity} {harvest.unit}
      </Text>
    </View>
  );
}

export default function ParcelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const { data: parcel, isLoading: parcelLoading, refetch: refetchParcel } = useParcel(id);
  const { data: farm, isLoading: farmLoading } = useFarm(parcel?.farm_id || '');
  const { data: harvestData, isLoading: harvestsLoading, refetch: refetchHarvests } = useHarvests({
    farmId: parcel?.farm_id,
  });

  const parcelHarvests = harvestData?.data?.filter((h) => h.parcel_id === id).slice(0, 10) || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchParcel(), refetchHarvests()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchParcel, refetchHarvests]);

  if (parcelLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (!parcel) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.gray[300]} />
        <Text style={styles.errorText}>{t('errors.notFound', { defaultValue: 'Parcel not found' })}</Text>
      </View>
    );
  }

  const statusColor =
    parcel.status === 'active' ? colors.primary[500] :
    parcel.status === 'fallow' ? colors.yellow[500] :
    colors.gray[400];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <PageHeader title={parcel?.name || t('production.parcelDetail', { defaultValue: 'Parcel Details' })} onMorePress={() => {}} />
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerIcon}>
            <Ionicons name="map" size={28} color={colors.primary[600]} />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{parcel.status}</Text>
          </View>
        </View>
        <Text style={styles.parcelName}>{parcel.name}</Text>
        {farm && (
          <View style={styles.farmRow}>
            <Ionicons name="business-outline" size={14} color={colors.gray[500]} />
            <Text style={styles.farmName}>{farm.name}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('production.details', { defaultValue: 'Details' })}</Text>
        {parcel.area != null && (
          <InfoRow
            icon="resize-outline"
            label={t('production.area', { defaultValue: 'Area' })}
            value={`${parcel.area} ${parcel.area_unit || 'ha'}`}
          />
        )}
        {parcel.current_crop && (
          <InfoRow
            icon="leaf-outline"
            label={t('production.currentCrop', { defaultValue: 'Current Crop' })}
            value={parcel.current_crop}
          />
        )}
        <InfoRow
          icon="flag-outline"
          label={t('status.label', { defaultValue: 'Status' })}
          value={parcel.status}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {t('production.recentHarvests', { defaultValue: 'Recent Harvests' })}
          </Text>
          <Text style={styles.harvestCount}>{parcelHarvests.length}</Text>
        </View>

        {harvestsLoading ? (
          <ActivityIndicator size="small" color={colors.primary[600]} style={styles.cardLoading} />
        ) : parcelHarvests.length > 0 ? (
          parcelHarvests.map((h) => <HarvestItem key={h.id} harvest={h} />)
        ) : (
          <View style={styles.emptyHarvests}>
            <Ionicons name="leaf-outline" size={32} color={colors.gray[300]} />
            <Text style={styles.emptyText}>
              {t('production.noHarvestsForParcel', { defaultValue: 'No harvests recorded for this parcel' })}
            </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    marginTop: spacing.md,
  },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  statusLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  parcelName: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
  },
  farmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  farmName: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  cardLoading: {
    paddingVertical: spacing.lg,
  },
  harvestCount: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabelText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
  },
  infoValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  harvestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  harvestInfo: {
    flex: 1,
  },
  harvestCrop: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
  },
  harvestDate: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    marginTop: 2,
  },
  harvestQty: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.primary[600],
  },
  emptyHarvests: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
