// Inventory Items Screen
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { Badge, EmptyState, LoadingState } from '@/components/ui';
import { StockItemCard } from '@/components/inventory';
import { useStockItems, useLowStockAlerts } from '@/hooks/useInventory';
import type { StockItem } from '@/types/inventory';

export default function InventoryItemsScreen() {
  const { t } = useTranslation('common');
  const [refreshing, setRefreshing] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const { data: itemsData, isLoading: itemsLoading, refetch: refetchItems } = useStockItems();
  const { data: alerts, refetch: refetchAlerts } = useLowStockAlerts();

  const allItems = itemsData?.data || [];
  const items = showLowStockOnly
    ? allItems.filter((item) => item.minimum_stock > 0 && item.current_stock < item.minimum_stock)
    : allItems;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchItems(), refetchAlerts()]);
    setRefreshing(false);
  }, [refetchItems, refetchAlerts]);

  const handleItemPress = (item: StockItem) => {
    router.push(`/(drawer)/(inventory)/items/${item.id}`);
  };

  if (itemsLoading && !itemsData) {
    return <LoadingState />;
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('inventory.title', 'Inventory')}
        showBack={true}
        actions={[
          { icon: 'add-outline', onPress: () => {} },
        ]}
      />

      {/* Low Stock Alerts Summary */}
      {alerts && alerts.length > 0 && (
        <View style={styles.alertsContainer}>
          <Pressable
            style={styles.alertsBanner}
            onPress={() => setShowLowStockOnly(!showLowStockOnly)}
          >
            <Ionicons name="warning" size={20} color={colors.red[500]} />
            <Text style={styles.alertsText}>
              {alerts.length} items with low stock
            </Text>
            <Badge
              variant={showLowStockOnly ? 'error' : 'neutral'}
              size="sm"
              label={showLowStockOnly ? 'Showing' : 'View'}
            />
          </Pressable>
        </View>
      )}

      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
        <Pressable
          style={[styles.filterChip, !showLowStockOnly && styles.filterChipActive]}
          onPress={() => setShowLowStockOnly(false)}
        >
          <Text style={[styles.filterChipText, !showLowStockOnly && styles.filterChipTextActive]}>
            All Items
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, showLowStockOnly && styles.filterChipActive]}
          onPress={() => setShowLowStockOnly(true)}
        >
          <Ionicons
            name="warning-outline"
            size={14}
            color={showLowStockOnly ? colors.white : colors.red[500]}
          />
          <Text style={[styles.filterChipText, showLowStockOnly && styles.filterChipTextActive]}>
            Low Stock
          </Text>
        </Pressable>
      </View>

      {/* Items List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StockItemCard item={item} onPress={() => handleItemPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title={t('inventory.noItems', 'No Items')}
            subtitle={t('inventory.noItemsDesc', 'Start by adding inventory items')}
          />
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
  alertsContainer: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  alertsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.red[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  alertsText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.red[700],
    fontWeight: fontWeight.medium,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
});
