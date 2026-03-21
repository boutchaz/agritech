// Warehouses List Screen
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useWarehouses } from '@/hooks/useInventory';
import type { Warehouse } from '@/types/inventory';

function WarehouseCard({ warehouse }: { warehouse: Warehouse }) {
  return (
    <View style={styles.warehouseCard}>
      <View style={styles.iconContainer}>
        <Ionicons name="business-outline" size={24} color={colors.primary[600]} />
      </View>
      <View style={styles.warehouseInfo}>
        <Text style={styles.warehouseName}>{warehouse.name}</Text>
        {warehouse.location && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.gray[400]} />
            <Text style={styles.metaText}>{warehouse.location}</Text>
          </View>
        )}
        <View style={styles.metaRow}>
          {warehouse.capacity !== null && (
            <Text style={styles.metaText}>
              Capacity: {warehouse.capacity} {warehouse.capacity_unit || 'units'}
            </Text>
          )}
          {warehouse.manager && (
            <>
              <Text style={styles.metaDot}> </Text>
              <Ionicons name="person-outline" size={12} color={colors.gray[400]} />
              <Text style={styles.metaText}>{warehouse.manager}</Text>
            </>
          )}
        </View>
      </View>
      <View style={[styles.statusDot, { backgroundColor: warehouse.is_active ? colors.primary[600] : colors.gray[400] }]} />
    </View>
  );
}

export default function WarehousesScreen() {
  const { t } = useTranslation('common');
  const { data: warehouses = [], refetch } = useWarehouses();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('inventory.warehouses', { defaultValue: 'Warehouses' })}
        showBack
      />

      <FlatList
        data={warehouses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => <WarehouseCard warehouse={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>
              {t('inventory.noWarehouses', { defaultValue: 'No warehouses' })}
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
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  warehouseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  warehouseInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  warehouseName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  metaDot: {
    color: colors.gray[300],
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
  },
});
