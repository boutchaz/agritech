// Inventory Hub Screen
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { Badge } from '@/components/ui';
import { useLowStockAlerts } from '@/hooks/useInventory';

function MenuCard({
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuCard} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon as any} size={28} color={colors.primary[600]} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {badge !== undefined && badge > 0 && (
        <Badge variant="error" label={String(badge)} />
      )}
      <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
    </Pressable>
  );
}

export default function InventoryScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { data: alerts } = useLowStockAlerts();

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('domains.inventory', { ns: 'navigation', defaultValue: 'Inventory' })}
        onMorePress={() => {}}
      />

      <View style={styles.content}>
        <MenuCard
          icon="cube-outline"
          title={t('inventory.items', 'Items')}
          subtitle={t('inventory.itemsSubtitle', 'Manage stock items')}
          onPress={() => router.push('/(drawer)/(inventory)/items')}
        />
        <MenuCard
          icon="swap-vertical-outline"
          title={t('inventory.entries', 'Stock Movements')}
          subtitle={t('inventory.entriesSubtitle', 'Track stock in/out')}
          onPress={() => {}}
        />
        <MenuCard
          icon="warning-outline"
          title={t('inventory.alerts', 'Low Stock Alerts')}
          subtitle={t('inventory.alertsSubtitle', 'Items needing attention')}
          badge={alerts?.length}
          onPress={() => router.push('/(drawer)/(inventory)/items?low_stock=true')}
        />
        <MenuCard
          icon="business-outline"
          title={t('inventory.warehouses', 'Warehouses')}
          subtitle={t('inventory.warehousesSubtitle', 'Manage storage locations')}
          onPress={() => {}}
        />
      </View>
    </View>
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
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  menuTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  menuSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
});
