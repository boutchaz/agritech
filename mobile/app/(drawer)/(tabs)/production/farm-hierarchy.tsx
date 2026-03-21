import { useState, useCallback } from 'react';
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
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import type { Farm, Parcel } from '@/lib/api';

function FarmNode({ farm, parcels, onParcelPress }: {
  farm: Farm;
  parcels: Parcel[];
  onParcelPress: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const farmParcels = parcels.filter((p) => p.farm_id === farm.id);

  return (
    <View style={styles.farmNode}>
      <TouchableOpacity
        style={styles.farmHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.farmIconRow}>
          <View style={styles.farmIcon}>
            <Ionicons name="business" size={20} color={colors.primary[600]} />
          </View>
          <View style={styles.farmInfo}>
            <Text style={styles.farmName}>{farm.name}</Text>
            <Text style={styles.farmMeta}>
              {farmParcels.length} {farmParcels.length === 1 ? 'parcel' : 'parcels'}
              {farm.location ? ` · ${farm.location}` : ''}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.gray[400]}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.parcelList}>
          {farmParcels.length > 0 ? (
            farmParcels.map((parcel) => {
              const statusColor =
                parcel.status === 'active' ? colors.primary[500] :
                parcel.status === 'fallow' ? colors.yellow[500] :
                colors.gray[400];

              return (
                <TouchableOpacity
                  key={parcel.id}
                  style={styles.parcelRow}
                  onPress={() => onParcelPress(parcel.id)}
                >
                  <View style={styles.parcelConnector}>
                    <View style={styles.connectorLine} />
                    <View style={[styles.connectorDot, { backgroundColor: statusColor }]} />
                  </View>
                  <View style={styles.parcelContent}>
                    <Text style={styles.parcelName}>{parcel.name}</Text>
                    <View style={styles.parcelDetails}>
                      {parcel.area != null && (
                        <Text style={styles.parcelDetailText}>
                          {parcel.area} {parcel.area_unit || 'ha'}
                        </Text>
                      )}
                      {parcel.current_crop && (
                        <Text style={styles.parcelDetailText}>· {parcel.current_crop}</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.gray[300]} />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.noParcelRow}>
              <Text style={styles.noParcelText}>No parcels</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function FarmHierarchyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const { data: farms = [], isLoading: farmsLoading, refetch: refetchFarms } = useFarms();
  const { data: parcels = [], isLoading: parcelsLoading, refetch: refetchParcels } = useParcels();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchFarms(), refetchParcels()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchFarms, refetchParcels]);

  const handleParcelPress = (parcelId: string) => {
    router.push(`/(drawer)/(tabs)/production/parcel/${parcelId}` as Href);
  };

  if (farmsLoading || parcelsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <PageHeader title={t('production.farmHierarchy', { defaultValue: 'Farm Hierarchy' })} onMorePress={() => {}} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryChip}>
          <Ionicons name="business-outline" size={16} color={colors.primary[600]} />
          <Text style={styles.summaryText}>{farms.length} Farms</Text>
        </View>
        <View style={styles.summaryChip}>
          <Ionicons name="map-outline" size={16} color={colors.blue[600]} />
          <Text style={styles.summaryText}>{parcels.length} Parcels</Text>
        </View>
      </View>

      {farms.length > 0 ? (
        farms.map((farm) => (
          <FarmNode
            key={farm.id}
            farm={farm}
            parcels={parcels}
            onParcelPress={handleParcelPress}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={48} color={colors.gray[300]} />
          <Text style={styles.emptyText}>
            {t('production.noFarms', { defaultValue: 'No farms yet' })}
          </Text>
        </View>
      )}
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
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  summaryText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
  },
  farmNode: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  farmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  farmIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  farmIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  farmMeta: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  parcelList: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  parcelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
  },
  parcelConnector: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: colors.gray[200],
  },
  connectorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 1,
  },
  parcelContent: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  parcelName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
  },
  parcelDetails: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
  },
  parcelDetailText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  noParcelRow: {
    padding: spacing.md,
    paddingLeft: spacing.xl,
  },
  noParcelText: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    fontStyle: 'italic',
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
});
