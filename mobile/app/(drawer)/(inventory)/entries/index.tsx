// Stock Entries List Screen
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useStockEntries } from '@/hooks/useInventory';
import type { StockEntry } from '@/types/inventory';

const TYPE_CONFIG = {
  in: { icon: 'add-circle-outline', color: colors.primary[600], bg: colors.primary[50], label: 'In' },
  out: { icon: 'remove-circle-outline', color: colors.red[500], bg: colors.red[50], label: 'Out' },
  adjustment: { icon: 'swap-vertical-outline', color: colors.blue[500], bg: colors.blue[50], label: 'Adj' },
} as const;

function EntryCard({ entry }: { entry: StockEntry }) {
  const config = TYPE_CONFIG[entry.entry_type];
  const date = new Date(entry.created_at).toLocaleDateString();
  const time = new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.entryCard}>
      <View style={[styles.typeIcon, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon as any} size={20} color={config.color} />
      </View>
      <View style={styles.entryInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{entry.item?.name || 'Unknown Item'}</Text>
        <View style={styles.entryMeta}>
          {entry.reference_type && (
            <Text style={styles.refType}>{entry.reference_type.replace(/_/g, ' ')}</Text>
          )}
          <Text style={styles.entryDate}>{date} {time}</Text>
        </View>
        {entry.notes && <Text style={styles.entryNotes} numberOfLines={1}>{entry.notes}</Text>}
      </View>
      <View style={styles.quantitySection}>
        <Text style={[styles.quantity, { color: config.color }]}>
          {entry.entry_type === 'out' ? '-' : '+'}{entry.quantity}
        </Text>
        {entry.total_cost !== null && (
          <Text style={styles.cost}>{entry.total_cost.toLocaleString()} MAD</Text>
        )}
      </View>
    </View>
  );
}

export default function StockEntriesListScreen() {
  const { t } = useTranslation('common');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: entriesData, refetch } = useStockEntries(
    typeFilter !== 'all' ? { entry_type: typeFilter } : undefined
  );
  const entries = entriesData?.data || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const typeOptions: { key: typeof typeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in', label: 'Stock In' },
    { key: 'out', label: 'Stock Out' },
    { key: 'adjustment', label: 'Adjustments' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('inventory.entries', { defaultValue: 'Stock Movements' })}
        showBack
        actions={[
          {
            icon: 'add-circle-outline' as const,
            onPress: () => router.push('/(drawer)/(inventory)/entries/new'),
          },
        ]}
      />

      {/* Filter */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={typeOptions}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterChip, typeFilter === item.key && styles.filterChipActive]}
              onPress={() => setTypeFilter(item.key)}
            >
              <Text style={[styles.filterText, typeFilter === item.key && styles.filterTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => <EntryCard entry={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="swap-vertical-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>
              {t('inventory.noEntries', { defaultValue: 'No stock movements' })}
            </Text>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push('/(drawer)/(inventory)/entries/new')}
            >
              <Ionicons name="add-outline" size={18} color={colors.white} />
              <Text style={styles.addButtonText}>Record Movement</Text>
            </Pressable>
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
  filterRow: {
    paddingVertical: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  filterText: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  filterTextActive: {
    color: colors.primary[600],
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  entryMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  refType: {
    fontSize: 10,
    color: colors.gray[400],
    textTransform: 'capitalize',
  },
  entryDate: {
    fontSize: 10,
    color: colors.gray[400],
  },
  entryNotes: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  quantitySection: {
    alignItems: 'flex-end',
  },
  quantity: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  cost: {
    fontSize: 10,
    color: colors.gray[400],
    marginTop: 2,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
