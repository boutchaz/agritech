import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHarvests } from '@/hooks/useHarvests';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import type { HarvestRecord } from '@/lib/api';

const GRADE_CONFIG: Record<string, { color: string; label: string }> = {
  A: { color: colors.primary[500], label: 'Grade A' },
  B: { color: colors.yellow[500], label: 'Grade B' },
  C: { color: colors.red[500], label: 'Grade C' },
};

function HarvestCard({ harvest }: { harvest: HarvestRecord }) {
  const grade = harvest.quality_grade
    ? GRADE_CONFIG[harvest.quality_grade] || { color: colors.gray[500], label: harvest.quality_grade }
    : null;

  return (
    <View style={styles.harvestCard}>
      <View style={styles.harvestHeader}>
        <View>
          <Text style={styles.harvestCrop}>
            {harvest.crop?.name || 'Unknown Crop'}
          </Text>
          <View style={styles.harvestLocation}>
            <Ionicons name="location-outline" size={14} color={colors.gray[400]} />
            <Text style={styles.harvestParcel}>
              {harvest.parcel?.name || harvest.farm?.name || 'Unknown location'}
            </Text>
          </View>
        </View>
        {grade && (
          <View style={[styles.gradeBadge, { backgroundColor: grade.color + '20' }]}>
            <Text style={[styles.gradeText, { color: grade.color }]}>
              {grade.label}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.harvestDetails}>
        <View style={styles.harvestStat}>
          <Text style={styles.harvestStatValue}>
            {harvest.quantity} {harvest.unit}
          </Text>
          <Text style={styles.harvestStatLabel}>Quantity</Text>
        </View>
        <View style={styles.harvestStat}>
          <Text style={styles.harvestStatValue}>
            {new Date(harvest.harvest_date).toLocaleDateString()}
          </Text>
          <Text style={styles.harvestStatLabel}>Date</Text>
        </View>
        {harvest.photos && harvest.photos.length > 0 && (
          <View style={styles.photoIndicator}>
            <Ionicons name="camera" size={16} color={colors.primary[500]} />
            <Text style={styles.photoCount}>{harvest.photos.length}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function HarvestScreen() {
  const router = useRouter();
  const [dateFilter] = useState<{ dateFrom?: string; dateTo?: string }>({});

  const { data, isLoading, refetch, isRefetching } = useHarvests(dateFilter);
  const harvests = data?.data || [];

  const today = new Date().toISOString().split('T')[0];
  const todayTotal = harvests
    .filter((h) => h.harvest_date.startsWith(today))
    .reduce((sum, h) => sum + h.quantity, 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading harvests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryLabel}>Today&apos;s Harvest</Text>
          <Text style={styles.summaryValue}>{todayTotal} kg</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/harvest/new')}
        >
          <Ionicons name="add" size={24} color={colors.white} />
          <Text style={styles.addButtonText}>Record</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Recent Harvests</Text>
        <Text style={styles.totalCount}>{data?.total || 0} total</Text>
      </View>

      <FlatList
        data={harvests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HarvestCard harvest={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No harvests recorded yet</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/harvest/new')}
            >
              <Text style={styles.emptyButtonText}>Record First Harvest</Text>
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[500],
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  summaryContent: {},
  summaryLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.white,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  listTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  totalCount: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  harvestCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  harvestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  harvestCrop: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  harvestLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  harvestParcel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginLeft: spacing.xs,
  },
  gradeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  gradeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  harvestDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingTop: spacing.sm,
  },
  harvestStat: {
    marginRight: spacing.lg,
  },
  harvestStatValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
  },
  harvestStatLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  photoIndicator: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.full,
  },
  photoCount: {
    fontSize: fontSize.xs,
    color: colors.primary[600],
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.gray[400],
    marginTop: spacing.md,
  },
  emptyButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.lg,
  },
  emptyButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
});
