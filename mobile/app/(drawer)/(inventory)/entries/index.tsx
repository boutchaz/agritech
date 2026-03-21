// Stock Entries List Screen
import { useState } from 'react';
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
import { Badge } from '@/components/ui';
import { useStockEntries } from '@/hooks/useInventory';
import type { StockEntry, StockEntryType } from '@/types/inventory';

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; short: string }> = {
  'Material Receipt': { icon: 'add-circle-outline', color: colors.primary[600], bg: colors.primary[50], short: 'Receipt' },
  'Material Issue': { icon: 'remove-circle-outline', color: colors.red[500], bg: colors.red[50], short: 'Issue' },
  'Stock Transfer': { icon: 'swap-horizontal-outline', color: colors.blue[500], bg: colors.blue[50], short: 'Transfer' },
  'Stock Reconciliation': { icon: 'sync-outline', color: colors.yellow[500], bg: colors.yellow[50], short: 'Recon' },
};

const STATUS_COLORS: Record<string, 'neutral' | 'success' | 'error'> = {
  Draft: 'neutral',
  Posted: 'success',
  Cancelled: 'error',
};

function EntryCard({ entry }: { entry: StockEntry }) {
  const config = TYPE_CONFIG[entry.entry_type] || TYPE_CONFIG['Material Receipt'];
  const date = new Date(entry.entry_date).toLocaleDateString();
  const warehouse = entry.to_warehouse?.name || entry.from_warehouse?.name || '';

  return (
    <View style={styles.entryCard}>
      <View style={[styles.typeIcon, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon as any} size={20} color={config.color} />
      </View>
      <View style={styles.entryInfo}>
        <Text style={styles.entryNumber} numberOfLines={1}>{entry.entry_number}</Text>
        <View style={styles.entryMeta}>
          <Text style={styles.entryType}>{config.short}</Text>
          {warehouse ? <Text style={styles.entryDate}>{warehouse}</Text> : null}
          <Text style={styles.entryDate}>{date}</Text>
        </View>
        {entry.notes && <Text style={styles.entryNotes} numberOfLines={1}>{entry.notes}</Text>}
      </View>
      <Badge
        variant={STATUS_COLORS[entry.status] || 'neutral'}
        size="sm"
        label={entry.status}
      />
    </View>
  );
}

type FilterKey = 'all' | StockEntryType;

export default function StockEntriesListScreen() {
  const { t } = useTranslation('common');
  const [typeFilter, setTypeFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: entriesData, refetch } = useStockEntries(
    typeFilter !== 'all' ? { entry_type: typeFilter as StockEntryType } : undefined
  );
  const entries = entriesData?.data || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const typeOptions: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'Material Receipt', label: 'Receipts' },
    { key: 'Material Issue', label: 'Issues' },
    { key: 'Stock Transfer', label: 'Transfers' },
    { key: 'Stock Reconciliation', label: 'Recon' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('inventory.entries', { defaultValue: 'Stock Entries' })}
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
              {t('inventory.noEntries', { defaultValue: 'No stock entries' })}
            </Text>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push('/(drawer)/(inventory)/entries/new')}
            >
              <Ionicons name="add-outline" size={18} color={colors.white} />
              <Text style={styles.addButtonText}>New Entry</Text>
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
  entryNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  entryMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  entryType: {
    fontSize: 10,
    color: colors.gray[500],
    fontWeight: fontWeight.medium,
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
