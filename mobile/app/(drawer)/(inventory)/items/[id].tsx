// Inventory Item Detail Screen
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { Card, Badge, LoadingState } from '@/components/ui';
import { useStockItem, useStockMovements, useDeleteStockItem } from '@/hooks/useInventory';

export default function InventoryItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('common');
  const [refreshing, setRefreshing] = useState(false);

  const { data: item, isLoading, refetch: refetchItem } = useStockItem(id);
  const { data: movements = [], refetch: refetchMovements } = useStockMovements({ item_id: id });
  const deleteItem = useDeleteStockItem();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchItem(), refetchMovements()]);
    setRefreshing(false);
  }, [refetchItem, refetchMovements]);

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(id);
      router.back();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  if (isLoading || !item) {
    return <LoadingState />;
  }

  const isLowStock = item.minimum_stock > 0 && item.current_stock < item.minimum_stock;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <PageHeader
        title={item.name}
        showBack={true}
        actions={[
          { icon: 'trash-outline', onPress: handleDelete },
        ]}
      />

      {/* Status Card */}
      <Card variant="elevated">
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, { backgroundColor: isLowStock ? colors.red[50] : colors.primary[50] }]}>
            <Ionicons
              name={isLowStock ? 'warning' : 'checkmark-circle'}
              size={32}
              color={isLowStock ? colors.red[500] : colors.primary[600]}
            />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Stock Status</Text>
            <Badge
              variant={isLowStock ? 'error' : 'success'}
              label={isLowStock ? 'Low Stock' : 'In Stock'}
            />
          </View>
        </View>
      </Card>

      {/* Stock Details */}
      <Card variant="elevated">
        <Text style={styles.cardTitle}>Stock Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Stock</Text>
          <Text style={styles.detailValue}>{item.current_stock} {item.unit}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Minimum Stock</Text>
          <Text style={styles.detailValue}>{item.minimum_stock} {item.unit}</Text>
        </View>
        {item.unit_cost != null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Unit Cost</Text>
            <Text style={styles.detailValue}>{item.unit_cost.toFixed(2)} MAD</Text>
          </View>
        )}
        {item.sku && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Item Code</Text>
            <Text style={styles.detailValue}>{item.sku}</Text>
          </View>
        )}
      </Card>

      {/* Item Info */}
      <Card variant="elevated">
        <Text style={styles.cardTitle}>Item Information</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>{item.category}</Text>
        </View>
        {item.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>
        )}
      </Card>

      {/* Recent Movements */}
      <Card variant="elevated">
        <Text style={styles.cardTitle}>Recent Movements</Text>
        {movements.length === 0 ? (
          <Text style={styles.emptyText}>No movements recorded</Text>
        ) : (
          movements.slice(0, 5).map((movement) => (
            <View key={movement.id} style={styles.movementRow}>
              <Ionicons
                name={
                  movement.movement_type === 'IN'
                    ? 'arrow-down'
                    : movement.movement_type === 'OUT'
                      ? 'arrow-up'
                      : 'swap-vertical'
                }
                size={20}
                color={movement.movement_type === 'IN' ? colors.primary[500] : colors.red[500]}
              />
              <View style={styles.movementInfo}>
                <Text style={styles.movementType}>
                  {movement.movement_type === 'IN'
                    ? 'Stock In'
                    : movement.movement_type === 'OUT'
                      ? 'Stock Out'
                      : 'Transfer'}
                </Text>
                <Text style={styles.movementDate}>
                  {new Date(movement.movement_date).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.movementQty,
                  { color: movement.movement_type === 'IN' ? colors.primary[500] : colors.red[500] },
                ]}
              >
                {movement.movement_type === 'IN' ? '+' : '-'}{movement.quantity}
              </Text>
            </View>
          ))
        )}
      </Card>
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
    paddingBottom: spacing['2xl'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    marginLeft: spacing.md,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  detailLabel: {
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  detailValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  descriptionContainer: {
    marginTop: spacing.sm,
  },
  descriptionText: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  movementInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  movementType: {
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  movementDate: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  movementQty: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
});
