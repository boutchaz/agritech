// StockItemCard Component
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Badge } from '@/components/ui';
import type { StockItem } from '@/types/inventory';

interface StockItemCardProps {
  item: StockItem;
  onPress?: () => void;
}

export function StockItemCard({ item, onPress }: StockItemCardProps) {
  const isLowStock = item.current_stock <= item.minimum_stock;

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="cube-outline" size={24} color={colors.primary[600]} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>
        {isLowStock && (
          <Badge variant="error" size="sm" label="Low Stock" />
        )}
      </View>
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.current_stock}</Text>
          <Text style={styles.statLabel}>Current</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.minimum_stock}</Text>
          <Text style={styles.statLabel}>Minimum</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.unit}</Text>
          <Text style={styles.statLabel}>Unit</Text>
        </View>
      </View>
      {item.unit_cost && (
        <Text style={styles.cost}>Unit Cost: ${item.unit_cost.toFixed(2)}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  category: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  cost: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.sm,
    textAlign: 'right',
  },
});
