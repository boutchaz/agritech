// LowStockAlertCard Component
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import type { LowStockAlert } from '@/types/inventory';

interface LowStockAlertCardProps {
  alert: LowStockAlert;
  onPress?: () => void;
}

export function LowStockAlertCard({ alert, onPress }: LowStockAlertCardProps) {
  const shortagePercent = alert.minimum_stock > 0
    ? Math.round((alert.shortage_amount / alert.minimum_stock) * 100)
    : 100;

  return (
    <Pressable onPress={onPress} style={[styles.container, { borderLeftColor: colors.red[500] }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning-outline" size={24} color={colors.red[500]} />
      </View>
      <View style={styles.info}>
        <Text style={styles.itemName}>{alert.item_name}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            <Text style={styles.statValue}>{alert.current_stock}</Text>
            <Text style={styles.statLabel}>Current</Text>
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.red[500]} />
          <Text style={styles.statText}>
            <Text style={styles.statValue}>{alert.minimum_stock}</Text>
            <Text style={styles.statLabel}>Required</Text>
          </Text>
        </View>
        <Text style={styles.shortage}>
          Shortage: {alert.shortage_amount} units ({shortagePercent}%)
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.red[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.red[700],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statText: {
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  shortage: {
    fontSize: fontSize.sm,
    color: colors.red[600],
    marginTop: spacing.xs,
  },
});
