import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useTheme } from '@/providers/ThemeProvider';
import { useAnalyses } from '@/hooks/useAnalyses';
import type { AnalysisType } from '@/types/analysis';

type TabConfig = {
  key: AnalysisType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

const ANALYSIS_TABS: TabConfig[] = [
  { key: 'soil', label: 'Soil', icon: 'layers-outline', description: 'pH, nutrients, texture, and microbial activity' },
  { key: 'water', label: 'Water', icon: 'water-outline', description: 'pH, EC, minerals, and irrigation suitability' },
  { key: 'plant', label: 'Plant', icon: 'leaf-outline', description: 'Tissue nutrients, chlorophyll, and stress indicators' },
];

export default function AnalysisTab() {
  const { id: parcelId } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const [activeType, setActiveType] = useState<AnalysisType>('soil');
  const [refreshing, setRefreshing] = useState(false);

  const { data: analyses, isLoading, refetch } = useAnalyses({ analysis_type: activeType, parcel_id: parcelId });

  const rawData = analyses?.data ?? analyses ?? [];
  const items = Array.isArray(rawData) ? rawData : [];

  const activeTab = ANALYSIS_TABS.find(t => t.key === activeType)!;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Analysis</Text>

      {/* Sub-tabs */}
      <View style={styles.tabBar}>
        {ANALYSIS_TABS.map((tab) => {
          const isActive = tab.key === activeType;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? themeColors.brandPrimary : themeColors.surfaceLow,
                  borderColor: isActive ? themeColors.brandPrimary : themeColors.outline,
                },
              ]}
              onPress={() => setActiveType(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? '#fff' : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? '#fff' : themeColors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionDesc, { color: themeColors.textSecondary }]}>
        {activeTab.description}
      </Text>

      {isLoading && items.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={themeColors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: themeColors.surfaceLow }]}>
          <Ionicons name="flask-outline" size={40} color={themeColors.iconSubtle} />
          <Text style={[styles.emptyTitle, { color: themeColors.textSecondary }]}>
            No {activeTab.label.toLowerCase()} analyses
          </Text>
          <Text style={[styles.emptyDesc, { color: themeColors.textTertiary }]}>
            {activeTab.label} analysis results will appear here
          </Text>
        </View>
      ) : (
        items.map((analysis: any) => (
          <View key={analysis.id} style={[styles.analysisCard, { backgroundColor: themeColors.surfaceLowest }]}>
            <View style={styles.analysisHeader}>
              <View style={[styles.analysisIcon, { backgroundColor: themeColors.warningContainer }]}>
                <Ionicons name={activeTab.icon as any} size={18} color={themeColors.warning} />
              </View>
              <View style={styles.analysisInfo}>
                <Text style={[styles.analysisTitle, { color: themeColors.textPrimary }]}>
                  {activeTab.label} Analysis
                </Text>
                <Text style={[styles.analysisMeta, { color: themeColors.textTertiary }]}>
                  {format(new Date(analysis.analysis_date), 'MMM d, yyyy')}
                  {analysis.laboratory ? ` · ${analysis.laboratory}` : ''}
                </Text>
              </View>
            </View>
            {analysis.data && (
              <View style={styles.dataGrid}>
                <AnalysisDataChips type={activeType} data={analysis.data} themeColors={themeColors} />
              </View>
            )}
            {analysis.notes && (
              <Text style={[styles.notes, { color: themeColors.textSecondary }]}>{analysis.notes}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function AnalysisDataChips({ type, data, themeColors }: { type: AnalysisType; data: any; themeColors: any }) {
  switch (type) {
    case 'soil':
      return (
        <>
          {data.ph != null && <DataChip label="pH" value={data.ph} themeColors={themeColors} />}
          {data.ph_level != null && <DataChip label="pH" value={data.ph_level} themeColors={themeColors} />}
          {data.organic_matter != null && <DataChip label="OM" value={`${data.organic_matter}%`} themeColors={themeColors} />}
          {data.organic_matter_percentage != null && <DataChip label="OM" value={`${data.organic_matter_percentage}%`} themeColors={themeColors} />}
          {data.nitrogen != null && <DataChip label="N" value={data.nitrogen} themeColors={themeColors} />}
          {data.nitrogen_ppm != null && <DataChip label="N" value={`${data.nitrogen_ppm} ppm`} themeColors={themeColors} />}
          {data.phosphorus != null && <DataChip label="P" value={data.phosphorus} themeColors={themeColors} />}
          {data.phosphorus_ppm != null && <DataChip label="P" value={`${data.phosphorus_ppm} ppm`} themeColors={themeColors} />}
          {data.potassium != null && <DataChip label="K" value={data.potassium} themeColors={themeColors} />}
          {data.potassium_ppm != null && <DataChip label="K" value={`${data.potassium_ppm} ppm`} themeColors={themeColors} />}
          {data.texture != null && <DataChip label="Texture" value={data.texture} themeColors={themeColors} />}
        </>
      );
    case 'water':
      return (
        <>
          {data.ph_level != null && <DataChip label="pH" value={data.ph_level} themeColors={themeColors} />}
          {data.ec_ds_per_m != null && <DataChip label="EC" value={`${data.ec_ds_per_m} dS/m`} themeColors={themeColors} />}
          {data.tds_ppm != null && <DataChip label="TDS" value={`${data.tds_ppm} ppm`} themeColors={themeColors} />}
          {data.sar != null && <DataChip label="SAR" value={data.sar} themeColors={themeColors} />}
          {data.hardness_ppm != null && <DataChip label="Hardness" value={`${data.hardness_ppm} ppm`} themeColors={themeColors} />}
          {data.irrigation_suitability != null && <DataChip label="Suitability" value={data.irrigation_suitability} themeColors={themeColors} />}
          {data.water_source != null && <DataChip label="Source" value={data.water_source} themeColors={themeColors} />}
        </>
      );
    case 'plant':
      return (
        <>
          {data.plant_part != null && <DataChip label="Part" value={data.plant_part} themeColors={themeColors} />}
          {data.nitrogen_percentage != null && <DataChip label="N" value={`${data.nitrogen_percentage}%`} themeColors={themeColors} />}
          {data.phosphorus_percentage != null && <DataChip label="P" value={`${data.phosphorus_percentage}%`} themeColors={themeColors} />}
          {data.potassium_percentage != null && <DataChip label="K" value={`${data.potassium_percentage}%`} themeColors={themeColors} />}
          {data.chlorophyll_content != null && <DataChip label="Chlorophyll" value={data.chlorophyll_content} themeColors={themeColors} />}
          {data.dry_matter_percentage != null && <DataChip label="Dry Matter" value={`${data.dry_matter_percentage}%`} themeColors={themeColors} />}
          {data.growth_stage != null && <DataChip label="Stage" value={data.growth_stage} themeColors={themeColors} />}
        </>
      );
  }
}

function DataChip({ label, value, themeColors }: { label: string; value: string | number; themeColors: any }) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: themeColors.surfaceContainer }]}>
      <Text style={[chipStyles.chipLabel, { color: themeColors.textTertiary }]}>{label}</Text>
      <Text style={[chipStyles.chipValue, { color: themeColors.textPrimary }]}>{String(value)}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', minWidth: 60 },
  chipLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  sectionDesc: { fontSize: 14, marginBottom: 16 },
  tabBar: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  loadingBox: { paddingVertical: 48, alignItems: 'center' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, borderRadius: 16, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13 },
  analysisCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  analysisIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  analysisInfo: { flex: 1 },
  analysisTitle: { fontSize: 15, fontWeight: '600' },
  analysisMeta: { fontSize: 12, marginTop: 2 },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notes: { fontSize: 13, marginTop: 10, fontStyle: 'italic' },
});
