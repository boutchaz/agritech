import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFarms, useParcels } from '@/hooks/useFarms';
import { useAbility } from '@/hooks/useAbility';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import type { Parcel, Farm } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  active: colors.primary[500],
  fallow: colors.yellow[500],
  inactive: colors.gray[400],
  planted: colors.blue[500],
};

function ParcelCard({ parcel, farmName, onPress }: {
  parcel: Parcel;
  farmName?: string;
  onPress: () => void;
}) {
  const statusColor = STATUS_COLORS[parcel.status] || colors.gray[400];

  return (
    <TouchableOpacity style={styles.parcelCard} onPress={onPress}>
      <View style={styles.parcelHeader}>
        <View style={styles.parcelNameRow}>
          <Ionicons name="map-outline" size={18} color={colors.primary[600]} />
          <Text style={styles.parcelName} numberOfLines={1}>{parcel.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{parcel.status}</Text>
        </View>
      </View>

      {farmName && (
        <View style={styles.parcelMeta}>
          <Ionicons name="business-outline" size={14} color={colors.gray[400]} />
          <Text style={styles.parcelMetaText}>{farmName}</Text>
        </View>
      )}

      <View style={styles.parcelDetails}>
        {parcel.area != null && (
          <View style={styles.detailItem}>
            <Ionicons name="resize-outline" size={14} color={colors.gray[500]} />
            <Text style={styles.detailText}>
              {parcel.area} {parcel.area_unit || 'ha'}
            </Text>
          </View>
        )}
        {parcel.current_crop && (
          <View style={styles.detailItem}>
            <Ionicons name="leaf-outline" size={14} color={colors.gray[500]} />
            <Text style={styles.detailText}>{parcel.current_crop}</Text>
          </View>
        )}
      </View>

      <View style={styles.chevronRow}>
        <Ionicons name="chevron-forward" size={18} color={colors.gray[300]} />
      </View>
    </TouchableOpacity>
  );
}

export default function ParcelsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { can } = useAbility();
  const [selectedFarmId, setSelectedFarmId] = useState<string | undefined>(undefined);

  const { data: farms = [], isLoading: farmsLoading } = useFarms();
  const { data: parcels = [], isLoading: parcelsLoading, refetch, isRefetching } = useParcels(selectedFarmId);

  const farmMap = new Map<string, Farm>();
  for (const farm of farms) {
    farmMap.set(farm.id, farm);
  }

  if (!can('read', 'Parcel')) {
    return (
      <View style={styles.permissionDenied}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.gray[300]} />
        <Text style={styles.permissionText}>{t('errors.noPermission', { defaultValue: 'No permission to view parcels' })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title={t('production.parcels', { defaultValue: 'Parcels' })} onMorePress={() => {}} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, !selectedFarmId && styles.filterChipActive]}
          onPress={() => setSelectedFarmId(undefined)}
        >
          <Text style={[styles.filterText, !selectedFarmId && styles.filterTextActive]}>
            {t('filters.all', { defaultValue: 'All Farms' })}
          </Text>
        </TouchableOpacity>
        {farms.map((farm) => (
          <TouchableOpacity
            key={farm.id}
            style={[styles.filterChip, selectedFarmId === farm.id && styles.filterChipActive]}
            onPress={() => setSelectedFarmId(farm.id)}
          >
            <Text style={[styles.filterText, selectedFarmId === farm.id && styles.filterTextActive]}>
              {farm.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {(parcelsLoading || farmsLoading) && !isRefetching ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={parcels}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ParcelCard
              parcel={item}
              farmName={farmMap.get(item.farm_id)?.name}
              onPress={() => router.push(`/(drawer)/(tabs)/production/parcel/${item.id}` as Href)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={48} color={colors.gray[300]} />
              <Text style={styles.emptyText}>
                {selectedFarmId
                  ? t('production.noParcelsForFarm', { defaultValue: 'No parcels for this farm' })
                  : t('production.noParcels', { defaultValue: 'No parcels yet' })}
              </Text>
            </View>
          }
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
  filterScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    maxHeight: 56,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
  },
  filterChipActive: {
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  parcelCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  parcelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  parcelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  parcelName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    flex: 1,
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
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  parcelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  parcelMetaText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  parcelDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  chevronRow: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[400],
    marginTop: spacing.md,
  },
  permissionDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
    padding: spacing.lg,
  },
  permissionText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
