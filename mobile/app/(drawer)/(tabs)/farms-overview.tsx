import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFarms, useParcels } from '@/hooks/useFarms';
import { useHarvests } from '@/hooks/useHarvests';
import { useTheme } from '@/providers/ThemeProvider';
import type { HarvestRecord } from '@/lib/api';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function StatPill({
  icon,
  value,
  label,
  colors,
}: {
  icon: IconName;
  value: string | number;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: colors.surfaceContainer }]}>
      <Ionicons name={icon} size={16} color={colors.brandPrimary} />
      <Text style={[styles.statPillValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statPillLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

export default function FarmsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data: farms = [], isLoading: farmsLoading, refetch: refetchFarms } = useFarms();
  const { data: parcels = [], refetch: refetchParcels } = useParcels();
  const { data: harvestData, refetch: refetchHarvests } = useHarvests();

  const harvests = harvestData?.data ?? [];

  // Compute per-farm stats
  const farmStats = useMemo(() => {
    const map = new Map<string, { parcelCount: number; totalArea: number; activeParcels: number; crops: Set<string>; lastHarvest: HarvestRecord | null }>();

    for (const farm of farms) {
      map.set(farm.id, { parcelCount: 0, totalArea: 0, activeParcels: 0, crops: new Set(), lastHarvest: null });
    }

    for (const parcel of parcels) {
      const stat = map.get(parcel.farm_id);
      if (stat) {
        stat.parcelCount++;
        stat.totalArea += parcel.area ?? 0;
        if (parcel.status === 'active') stat.activeParcels++;
        if (parcel.current_crop) stat.crops.add(parcel.current_crop);
      }
    }

    for (const harvest of harvests) {
      const stat = map.get(harvest.farm_id);
      if (stat && (!stat.lastHarvest || harvest.harvest_date > stat.lastHarvest.harvest_date)) {
        stat.lastHarvest = harvest;
      }
    }

    return map;
  }, [farms, parcels, harvests]);

  // Totals
  const totalArea = parcels.reduce((sum, p) => sum + (p.area ?? 0), 0);
  const activeParcels = parcels.filter((p) => p.status === 'active').length;
  const totalHarvests = harvests.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchFarms(), refetchParcels(), refetchHarvests()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchFarms, refetchParcels, refetchHarvests]);

  if (farmsLoading && farms.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Farms</Text>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={themeColors.brandPrimary} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Farms</Text>
        <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
          {farms.length} {farms.length === 1 ? 'farm' : 'farms'} across your organization
        </Text>
      </View>

      {/* Summary stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        <StatPill icon="business" value={farms.length} label="Farms" colors={themeColors} />
        <StatPill icon="map-outline" value={activeParcels} label="Active" colors={themeColors} />
        <StatPill icon="resize-outline" value={`${Math.round(totalArea)} ha`} label="Area" colors={themeColors} />
        <StatPill icon="leaf" value={totalHarvests} label="Harvests" colors={themeColors} />
      </ScrollView>

      {/* Farm cards */}
      {farms.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: themeColors.surfaceLow }]}>
          <Ionicons name="business-outline" size={48} color={themeColors.iconSubtle} />
          <Text style={[styles.emptyTitle, { color: themeColors.textSecondary }]}>No farms yet</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textTertiary }]}>
            Farms will appear here once they are created
          </Text>
        </View>
      ) : (
        <View style={styles.farmList}>
          {farms.map((farm) => {
            const stat = farmStats.get(farm.id);
            const cropList = stat ? Array.from(stat.crops) : [];

            return (
              <TouchableOpacity
                key={farm.id}
                style={[styles.farmCard, { backgroundColor: themeColors.surfaceLowest }]}
                activeOpacity={0.7}
                onPress={() => router.push(`/(drawer)/(tabs)/production/parcels?farmId=${farm.id}` as Href)}
              >
                {/* Farm header */}
                <View style={styles.farmCardHeader}>
                  <View style={[styles.farmIcon, { backgroundColor: themeColors.brandContainer + '30' }]}>
                    <Ionicons name="business" size={20} color={themeColors.brandPrimary} />
                  </View>
                  <View style={styles.farmHeaderInfo}>
                    <Text style={[styles.farmName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                      {farm.name}
                    </Text>
                    {farm.location && (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={12} color={themeColors.textTertiary} />
                        <Text style={[styles.farmLocation, { color: themeColors.textTertiary }]} numberOfLines={1}>
                          {farm.location}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={themeColors.iconSubtle} />
                </View>

                {/* Stats row */}
                <View style={[styles.farmStatsRow, { borderTopColor: themeColors.outlineVariant }]}>
                  <View style={styles.farmStat}>
                    <Text style={[styles.farmStatValue, { color: themeColors.textPrimary }]}>
                      {stat?.parcelCount ?? 0}
                    </Text>
                    <Text style={[styles.farmStatLabel, { color: themeColors.textTertiary }]}>Parcels</Text>
                  </View>
                  <View style={[styles.farmStatDivider, { backgroundColor: themeColors.outlineVariant }]} />
                  <View style={styles.farmStat}>
                    <Text style={[styles.farmStatValue, { color: themeColors.textPrimary }]}>
                      {Math.round(stat?.totalArea ?? 0)}
                    </Text>
                    <Text style={[styles.farmStatLabel, { color: themeColors.textTertiary }]}>
                      {farm.size_unit || 'ha'}
                    </Text>
                  </View>
                  <View style={[styles.farmStatDivider, { backgroundColor: themeColors.outlineVariant }]} />
                  <View style={styles.farmStat}>
                    <Text style={[styles.farmStatValue, { color: themeColors.textPrimary }]}>
                      {stat?.activeParcels ?? 0}
                    </Text>
                    <Text style={[styles.farmStatLabel, { color: themeColors.textTertiary }]}>Active</Text>
                  </View>
                </View>

                {/* Crops */}
                {cropList.length > 0 && (
                  <View style={styles.cropsRow}>
                    <Ionicons name="leaf-outline" size={14} color={themeColors.success} />
                    <Text style={[styles.cropsText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                      {cropList.slice(0, 3).join(', ')}
                      {cropList.length > 3 ? ` +${cropList.length - 3}` : ''}
                    </Text>
                  </View>
                )}

                {/* Last harvest */}
                {stat?.lastHarvest && (
                  <View style={[styles.lastHarvestRow, { backgroundColor: themeColors.successContainer }]}>
                    <Ionicons name="checkmark-circle" size={14} color={themeColors.success} />
                    <Text style={[styles.lastHarvestText, { color: themeColors.success }]}>
                      Last harvest: {format(new Date(stat.lastHarvest.harvest_date), 'MMM d')}
                      {stat.lastHarvest.crop?.name ? ` - ${stat.lastHarvest.crop.name}` : ''}
                      {` (${stat.lastHarvest.quantity} ${stat.lastHarvest.unit})`}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Recent harvests across all farms */}
      {harvests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Recent Harvests</Text>
          {harvests.slice(0, 5).map((harvest) => (
            <View
              key={harvest.id}
              style={[styles.harvestRow, { backgroundColor: themeColors.surfaceLowest }]}
            >
              <View style={[styles.harvestIcon, { backgroundColor: themeColors.successContainer }]}>
                <Ionicons name="leaf" size={16} color={themeColors.success} />
              </View>
              <View style={styles.harvestInfo}>
                <Text style={[styles.harvestCrop, { color: themeColors.textPrimary }]} numberOfLines={1}>
                  {harvest.crop?.name || 'Harvest'}
                </Text>
                <Text style={[styles.harvestMeta, { color: themeColors.textTertiary }]}>
                  {harvest.parcel?.name ?? ''} · {format(new Date(harvest.harvest_date), 'MMM d')}
                </Text>
              </View>
              <View style={styles.harvestAmount}>
                <Text style={[styles.harvestQty, { color: themeColors.textPrimary }]}>
                  {harvest.quantity}
                </Text>
                <Text style={[styles.harvestUnit, { color: themeColors.textTertiary }]}>
                  {harvest.unit}
                </Text>
              </View>
              {harvest.quality_grade && (
                <View style={[styles.gradeBadge, { backgroundColor: themeColors.brandContainer + '30' }]}>
                  <Text style={[styles.gradeText, { color: themeColors.brandPrimary }]}>
                    {harvest.quality_grade}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 4 },

  statsRow: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  statPillValue: { fontSize: 15, fontWeight: '700' },
  statPillLabel: { fontSize: 12 },

  farmList: { paddingHorizontal: 16, gap: 12 },
  farmCard: { borderRadius: 16, padding: 16 },
  farmCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  farmIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  farmHeaderInfo: { flex: 1 },
  farmName: { fontSize: 17, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  farmLocation: { fontSize: 12 },

  farmStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  farmStat: { flex: 1, alignItems: 'center' },
  farmStatValue: { fontSize: 18, fontWeight: '700' },
  farmStatLabel: { fontSize: 11, marginTop: 2 },
  farmStatDivider: { width: StyleSheet.hairlineWidth, height: 28 },

  cropsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  cropsText: { fontSize: 13 },

  lastHarvestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  lastHarvestText: { fontSize: 12, fontWeight: '500', flex: 1 },

  emptyState: {
    marginHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 48,
    borderRadius: 20,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptySubtitle: { fontSize: 13 },

  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },

  harvestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  harvestIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  harvestInfo: { flex: 1 },
  harvestCrop: { fontSize: 14, fontWeight: '600' },
  harvestMeta: { fontSize: 12, marginTop: 2 },
  harvestAmount: { alignItems: 'flex-end' },
  harvestQty: { fontSize: 15, fontWeight: '700' },
  harvestUnit: { fontSize: 11 },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gradeText: { fontSize: 11, fontWeight: '700' },
});
