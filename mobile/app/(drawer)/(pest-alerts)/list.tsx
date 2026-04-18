// Pest Reports List Screen
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { usePestReports, usePestDiseaseLibrary } from '@/hooks/usePestAlerts';
import type { PestReport, PestReportSeverity, PestReportStatus, PestDiseaseLibraryItem } from '@/types/pest-alerts';

const SEVERITY_COLORS: Record<PestReportSeverity, string> = {
  critical: colors.red[500],
  high: '#f97316',
  medium: colors.yellow[500],
  low: colors.blue[500],
};

const SEVERITY_BG: Record<PestReportSeverity, string> = {
  critical: colors.red[50],
  high: '#fff7ed',
  medium: colors.yellow[50],
  low: colors.blue[50],
};

const STATUS_COLORS: Record<PestReportStatus, string> = {
  pending: colors.yellow[500],
  verified: colors.blue[500],
  treated: colors.primary[600],
  resolved: colors.primary[400],
  dismissed: colors.gray[400],
};

const SEVERITY_OPTIONS: PestReportSeverity[] = ['critical', 'high', 'medium', 'low'];

function SeverityBadge({ severity }: { severity: PestReportSeverity }) {
  return (
    <View style={[styles.severityBadge, { backgroundColor: SEVERITY_BG[severity] }]}>
      <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLORS[severity] }]} />
      <Text style={[styles.severityText, { color: SEVERITY_COLORS[severity] }]}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: PestReportStatus }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] + '20' }]}>
      <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

function ReportCard({ report }: { report: PestReport }) {
  const { t } = useTranslation('common');
  const pestName = report.pest_disease?.name || t('pestAlerts.unknownPest', { defaultValue: 'Unknown pest/disease' });
  const pestType = report.pest_disease?.type;
  const date = new Date(report.created_at).toLocaleDateString();

  return (
    <Pressable
      style={[styles.reportCard, { borderLeftColor: SEVERITY_COLORS[report.severity] }]}
      onPress={() => router.push(`/(drawer)/(pest-alerts)/${report.id}`)}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleRow}>
          <Ionicons
            name={pestType === 'disease' ? 'flask-outline' : 'bug-outline'}
            size={18}
            color={SEVERITY_COLORS[report.severity]}
          />
          <Text style={styles.reportTitle} numberOfLines={1}>{pestName}</Text>
        </View>
        <SeverityBadge severity={report.severity} />
      </View>

      <View style={styles.reportMeta}>
        {report.farm?.name && (
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={14} color={colors.gray[400]} />
            <Text style={styles.metaText}>{report.farm.name}</Text>
          </View>
        )}
        {report.parcel?.name && (
          <View style={styles.metaItem}>
            <Ionicons name="map-outline" size={14} color={colors.gray[400]} />
            <Text style={styles.metaText}>{report.parcel.name}</Text>
          </View>
        )}
      </View>

      {report.notes && (
        <Text style={styles.reportNotes} numberOfLines={2}>{report.notes}</Text>
      )}

      <View style={styles.reportFooter}>
        <StatusBadge status={report.status} />
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.gray[400]} />
          <Text style={styles.metaText}>{date}</Text>
        </View>
        {report.photo_urls && report.photo_urls.length > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="camera-outline" size={14} color={colors.gray[400]} />
            <Text style={styles.metaText}>{report.photo_urls.length}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function LibraryCard({ item }: { item: PestDiseaseLibraryItem }) {
  return (
    <View style={styles.libraryCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleRow}>
          <Ionicons
            name={item.type === 'disease' ? 'flask-outline' : 'bug-outline'}
            size={18}
            color={colors.primary[600]}
          />
          <Text style={styles.reportTitle}>{item.name}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: item.type === 'pest' ? '#fff7ed' : colors.red[50] }]}>
          <Text style={[styles.typeText, { color: item.type === 'pest' ? '#f97316' : colors.red[500] }]}>
            {item.type === 'pest' ? 'Pest' : 'Disease'}
          </Text>
        </View>
      </View>
      {item.symptoms && (
        <View style={styles.librarySection}>
          <Text style={styles.librarySectionTitle}>Symptoms</Text>
          <Text style={styles.libraryContent} numberOfLines={2}>{item.symptoms}</Text>
        </View>
      )}
      {item.treatment && (
        <View style={styles.librarySection}>
          <Text style={styles.librarySectionTitle}>Treatment</Text>
          <Text style={styles.libraryContent} numberOfLines={2}>{item.treatment}</Text>
        </View>
      )}
      {item.crop_types?.length > 0 && (
        <View style={styles.cropRow}>
          {item.crop_types.map((crop) => (
            <View key={crop} style={styles.cropTag}>
              <Text style={styles.cropTagText}>{crop}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function PestReportsListScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const params = useLocalSearchParams<{ severity?: string; status?: string; tab?: string }>();

  const [activeTab, setActiveTab] = useState<'reports' | 'library'>(params.tab === 'library' ? 'library' : 'reports');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<PestReportSeverity | 'all'>(
    (params.severity as PestReportSeverity) || 'all'
  );
  const [statusFilter] = useState<PestReportStatus | 'all'>(
    (params.status as PestReportStatus) || 'all'
  );
  const [refreshing, setRefreshing] = useState(false);

  const { data: reports = [], refetch: refetchReports } = usePestReports();
  const { data: library = [], refetch: refetchLibrary } = usePestDiseaseLibrary();

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          r.pest_disease?.name?.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q) ||
          r.farm?.name?.toLowerCase().includes(q) ||
          r.parcel?.name?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [reports, severityFilter, statusFilter, search]);

  const filteredLibrary = useMemo(() => {
    if (!search) return library;
    const q = search.toLowerCase();
    return library.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.symptoms?.toLowerCase().includes(q) ||
        item.crop_types?.some((c) => c.toLowerCase().includes(q))
    );
  }, [library, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchReports(), refetchLibrary()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('pestAlerts.title', { ns: 'common', defaultValue: 'Pest & Disease' })}
        showBack
        actions={[
          {
            icon: 'add-circle-outline' as const,
            onPress: () => router.push('/(drawer)/(pest-alerts)/new'),
          },
        ]}
      />

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
            {t('pestAlerts.reports', { defaultValue: 'Reports' })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'library' && styles.tabActive]}
          onPress={() => setActiveTab('library')}
        >
          <Text style={[styles.tabText, activeTab === 'library' && styles.tabTextActive]}>
            {t('pestAlerts.library', { defaultValue: 'Library' })}
          </Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Ionicons name="search-outline" size={18} color={colors.gray[400]} />
          <TextInput
            style={styles.searchTextInput}
            placeholder={t('actions.search', { defaultValue: 'Search...' })}
            placeholderTextColor={colors.gray[400]}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.gray[400]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters (reports tab only) */}
      {activeTab === 'reports' && (
        <View style={styles.filterRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { key: 'all', label: 'All' },
              ...SEVERITY_OPTIONS.map((s) => ({ key: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
            ]}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.filterContent}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.filterChip,
                  severityFilter === item.key && styles.filterChipActive,
                ]}
                onPress={() => setSeverityFilter(item.key as PestReportSeverity | 'all')}
              >
                {item.key !== 'all' && (
                  <View style={[styles.filterDot, { backgroundColor: SEVERITY_COLORS[item.key as PestReportSeverity] }]} />
                )}
                <Text style={[styles.filterChipText, severityFilter === item.key && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Content */}
      {activeTab === 'reports' ? (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => <ReportCard report={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bug-outline" size={48} color={colors.gray[300]} />
              <Text style={styles.emptyTitle}>
                {t('pestAlerts.noReports', { defaultValue: 'No pest reports' })}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t('pestAlerts.noReportsHint', { defaultValue: 'Tap + to report a pest or disease sighting' })}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredLibrary}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => <LibraryCard item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={48} color={colors.gray[300]} />
              <Text style={styles.emptyTitle}>
                {t('pestAlerts.noLibraryItems', { defaultValue: 'No entries found' })}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary[600],
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
  },
  tabTextActive: {
    color: colors.primary[600],
    fontWeight: fontWeight.semibold,
  },
  searchRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    ...shadows.sm,
  },
  searchTextInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.gray[900],
  },
  filterRow: {
    paddingTop: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  filterChipText: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.primary[600],
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.sm,
  },
  reportTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    flex: 1,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  reportNotes: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  severityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  libraryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  librarySection: {
    marginTop: spacing.xs,
  },
  librarySectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  libraryContent: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 18,
  },
  cropRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.sm,
  },
  cropTag: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  cropTagText: {
    fontSize: 10,
    color: colors.primary[600],
    fontWeight: fontWeight.medium,
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
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
