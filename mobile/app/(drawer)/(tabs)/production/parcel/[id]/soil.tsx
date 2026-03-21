import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useTheme } from '@/providers/ThemeProvider';
import { useAnalyses } from '@/hooks/useAnalyses';

export default function SoilAnalysisTab() {
  const { id: parcelId } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data: analyses, isLoading, refetch } = useAnalyses({ analysis_type: 'soil', parcel_id: parcelId });

  const soilAnalyses = analyses?.data ?? analyses ?? [];
  const items = Array.isArray(soilAnalyses) ? soilAnalyses : [];

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
      <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Soil Analysis</Text>
      <Text style={[styles.sectionDesc, { color: themeColors.textSecondary }]}>
        pH, nutrients, texture, and microbial activity records
      </Text>

      {isLoading && items.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={themeColors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: themeColors.surfaceLow }]}>
          <Ionicons name="flask-outline" size={40} color={themeColors.iconSubtle} />
          <Text style={[styles.emptyTitle, { color: themeColors.textSecondary }]}>No soil analyses</Text>
          <Text style={[styles.emptyDesc, { color: themeColors.textTertiary }]}>
            Soil analysis results will appear here
          </Text>
        </View>
      ) : (
        items.map((analysis: any) => (
          <View key={analysis.id} style={[styles.analysisCard, { backgroundColor: themeColors.surfaceLowest }]}>
            <View style={styles.analysisHeader}>
              <View style={[styles.analysisIcon, { backgroundColor: themeColors.warningContainer }]}>
                <Ionicons name="flask" size={18} color={themeColors.warning} />
              </View>
              <View style={styles.analysisInfo}>
                <Text style={[styles.analysisTitle, { color: themeColors.textPrimary }]}>
                  Soil Analysis
                </Text>
                <Text style={[styles.analysisMeta, { color: themeColors.textTertiary }]}>
                  {format(new Date(analysis.analysis_date), 'MMM d, yyyy')}
                  {analysis.laboratory ? ` · ${analysis.laboratory}` : ''}
                </Text>
              </View>
            </View>
            {analysis.data && (
              <View style={styles.dataGrid}>
                {analysis.data.ph != null && (
                  <DataChip label="pH" value={analysis.data.ph} themeColors={themeColors} />
                )}
                {analysis.data.organic_matter != null && (
                  <DataChip label="Organic Matter" value={`${analysis.data.organic_matter}%`} themeColors={themeColors} />
                )}
                {analysis.data.nitrogen != null && (
                  <DataChip label="N" value={`${analysis.data.nitrogen}`} themeColors={themeColors} />
                )}
                {analysis.data.phosphorus != null && (
                  <DataChip label="P" value={`${analysis.data.phosphorus}`} themeColors={themeColors} />
                )}
                {analysis.data.potassium != null && (
                  <DataChip label="K" value={`${analysis.data.potassium}`} themeColors={themeColors} />
                )}
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

function DataChip({ label, value, themeColors }: { label: string; value: string | number; themeColors: any }) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: themeColors.surfaceContainer }]}>
      <Text style={[chipStyles.chipLabel, { color: themeColors.textTertiary }]}>{label}</Text>
      <Text style={[chipStyles.chipValue, { color: themeColors.textPrimary }]}>{value}</Text>
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
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  sectionDesc: { fontSize: 14, marginBottom: 16 },
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
