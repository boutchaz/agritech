import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { useTheme } from '@/providers/ThemeProvider';
import { useParcel } from '@/hooks/useFarms';
import { useHarvests } from '@/hooks/useHarvests';

export default function ProductionTab() {
  const { id: parcelId } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data: parcel } = useParcel(parcelId);
  const { data: harvestData, isLoading, refetch } = useHarvests({ farmId: parcel?.farm_id });

  const harvests = useMemo(() => {
    return (harvestData?.data ?? []).filter((h) => h.parcel_id === parcelId);
  }, [harvestData, parcelId]);

  const totalQty = harvests.reduce((sum, h) => sum + h.quantity, 0);
  const uniqueCrops = new Set(harvests.map((h) => h.crop?.name).filter(Boolean));
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Production</Text>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: themeColors.surfaceLowest }]}>
          <View style={[styles.statIcon, { backgroundColor: themeColors.successContainer }]}>
            <Ionicons name="leaf" size={18} color={themeColors.success} />
          </View>
          <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{harvests.length}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textTertiary }]}>Harvests</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: themeColors.surfaceLowest }]}>
          <View style={[styles.statIcon, { backgroundColor: themeColors.brandContainer + '30' }]}>
            <Ionicons name="scale-outline" size={18} color={themeColors.brandPrimary} />
          </View>
          <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{Math.round(totalQty)}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textTertiary }]}>Total Qty</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: themeColors.surfaceLowest }]}>
          <View style={[styles.statIcon, { backgroundColor: themeColors.warningContainer }]}>
            <Ionicons name="nutrition-outline" size={18} color={themeColors.warning} />
          </View>
          <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{uniqueCrops.size}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textTertiary }]}>Crops</Text>
        </View>
      </View>

      {/* Harvest history */}
      <Text style={[styles.listTitle, { color: themeColors.textPrimary }]}>Harvest History</Text>

      {isLoading && harvests.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={themeColors.brandPrimary} />
        </View>
      ) : harvests.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: themeColors.surfaceLow }]}>
          <Ionicons name="leaf-outline" size={40} color={themeColors.iconSubtle} />
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No harvests recorded</Text>
        </View>
      ) : (
        harvests.map((h) => (
          <View key={h.id} style={[styles.harvestRow, { backgroundColor: themeColors.surfaceLowest }]}>
            <View style={[styles.harvestDot, { backgroundColor: themeColors.success }]} />
            <View style={styles.harvestInfo}>
              <Text style={[styles.harvestCrop, { color: themeColors.textPrimary }]}>
                {h.crop?.name || 'Harvest'}
              </Text>
              <Text style={[styles.harvestMeta, { color: themeColors.textTertiary }]}>
                {format(new Date(h.harvest_date), 'MMM d, yyyy')}
                {h.quality_grade ? ` · Grade ${h.quality_grade}` : ''}
              </Text>
            </View>
            <Text style={[styles.harvestQty, { color: themeColors.brandPrimary }]}>
              {h.quantity} {h.unit}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  listTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  loadingBox: { paddingVertical: 48, alignItems: 'center' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, borderRadius: 16, gap: 8 },
  emptyText: { fontSize: 14 },
  harvestRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 10 },
  harvestDot: { width: 8, height: 8, borderRadius: 4 },
  harvestInfo: { flex: 1 },
  harvestCrop: { fontSize: 14, fontWeight: '600' },
  harvestMeta: { fontSize: 12, marginTop: 2 },
  harvestQty: { fontSize: 14, fontWeight: '700' },
});
