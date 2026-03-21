// Analysis Detail Screen for Mobile
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { Card, Badge, Button, LoadingState } from '@/components/ui';
import { useAnalysis, useAnalysisRecommendations, useDeleteAnalysis } from '@/hooks/useAnalyses';
import type { Analysis, AnalysisType, SoilAnalysisData, WaterAnalysisData, PlantAnalysisData } from '@/types/analysis';

const analysisTypeConfig: Record<AnalysisType, { icon: string; color: string; label: string }> = {
  soil: { icon: 'layers-outline', color: colors.primary[600], label: 'Sol' },
  water: { icon: 'water-outline', color: colors.blue[500], label: 'Eau' },
  plant: { icon: 'leaf-outline', color: colors.yellow[500], label: 'Plante' },
};

function MetricRow({ label, value, unit }: { label: string; value?: number | null; unit?: string }) {
  if (value == null) return null;

  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value} {unit || ''}
      </Text>
    </View>
  );
}

function SoilAnalysisView({ data }: { data: SoilAnalysisData }) {
  const { t } = useTranslation('common');

  return (
    <>
      <Text style={styles.sectionTitle}>{t('analyses.physicalProperties', 'Physical Properties')}</Text>
      <MetricRow label="pH" value={data.ph_level} />
      <MetricRow label={t('analyses.texture', 'Texture')} value={data.texture ? undefined : null} />
      {data.texture && <Text style={styles.metricValue}>{data.texture}</Text>}
      <MetricRow label={t('analyses.moisture', 'Moisture')} value={data.moisture_percentage} unit="%" />
      <MetricRow label={t('analyses.organicMatter', 'Organic Matter')} value={data.organic_matter_percentage} unit="%" />

      <Text style={styles.sectionTitle}>{t('analyses.nutrients', 'Nutrients')}</Text>
      <MetricRow label="N" value={data.nitrogen_ppm} unit="ppm" />
      <MetricRow label="P" value={data.phosphorus_ppm} unit="ppm" />
      <MetricRow label="K" value={data.potassium_ppm} unit="ppm" />
      <MetricRow label="Ca" value={data.calcium_ppm} unit="ppm" />
      <MetricRow label="Mg" value={data.magnesium_ppm} unit="ppm" />

      <Text style={styles.sectionTitle}>{t('analyses.microNutrients', 'Micro-nutrients')}</Text>
      <MetricRow label="Fe" value={data.iron_ppm} unit="ppm" />
      <MetricRow label="Zn" value={data.zinc_ppm} unit="ppm" />
      <MetricRow label="Cu" value={data.copper_ppm} unit="ppm" />
      <MetricRow label="Mn" value={data.manganese_ppm} unit="ppm" />
      <MetricRow label="B" value={data.boron_ppm} unit="ppm" />

      <Text style={styles.sectionTitle}>{t('analyses.soilHealth', 'Soil Health')}</Text>
      <MetricRow label={t('analyses.salinity', 'Salinity')} value={data.salinity_level} unit="dS/m" />
      <MetricRow label="CEC" value={data.cec_meq_per_100g} unit="meq/100g" />
    </>
  );
}

function WaterAnalysisView({ data }: { data: WaterAnalysisData }) {
  const { t } = useTranslation('common');

  return (
    <>
      <Text style={styles.sectionTitle}>{t('analyses.physicalProperties', 'Physical Properties')}</Text>
      <MetricRow label="pH" value={data.ph_level} />
      <MetricRow label={t('analyses.temperature', 'Temperature')} value={data.temperature_celsius} unit="°C" />
      <MetricRow label={t('analyses.turbidity', 'Turbidity')} value={data.turbidity_ntu} unit="NTU" />

      <Text style={styles.sectionTitle}>{t('analyses.chemicalProperties', 'Chemical Properties')}</Text>
      <MetricRow label="EC" value={data.ec_ds_per_m} unit="dS/m" />
      <MetricRow label="TDS" value={data.tds_ppm} unit="ppm" />
      <MetricRow label="Ca" value={data.calcium_ppm} unit="ppm" />
      <MetricRow label="Mg" value={data.magnesium_ppm} unit="ppm" />
      <MetricRow label="Na" value={data.sodium_ppm} unit="ppm" />
      <MetricRow label="Cl" value={data.chloride_ppm} unit="ppm" />

      <Text style={styles.sectionTitle}>{t('analyses.waterQuality', 'Water Quality')}</Text>
      <MetricRow label="SAR" value={data.sar} />
      <MetricRow label={t('analyses.hardness', 'Hardness')} value={data.hardness_ppm} unit="ppm" />
      {data.irrigation_suitability && (
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('analyses.irrigationSuitability', 'Irrigation Suitability')}</Text>
          <Badge
            variant={data.irrigation_suitability === 'excellent' || data.irrigation_suitability === 'good' ? 'success' : 'warning'}
            label={data.irrigation_suitability}
          />
        </View>
      )}
    </>
  );
}

function PlantAnalysisView({ data }: { data: PlantAnalysisData }) {
  const { t } = useTranslation('common');

  return (
    <>
      <Text style={styles.sectionTitle}>{t('analyses.plantInfo', 'Plant Information')}</Text>
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>{t('analyses.plantPart', 'Plant Part')}</Text>
        <Text style={styles.metricValue}>{data.plant_part}</Text>
      </View>
      {data.growth_stage && (
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('analyses.growthStage', 'Growth Stage')}</Text>
          <Text style={styles.metricValue}>{data.growth_stage}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('analyses.macroNutrients', 'Macro-nutrients')}</Text>
      <MetricRow label="N" value={data.nitrogen_percentage} unit="%" />
      <MetricRow label="P" value={data.phosphorus_percentage} unit="%" />
      <MetricRow label="K" value={data.potassium_percentage} unit="%" />
      <MetricRow label="Ca" value={data.calcium_percentage} unit="%" />
      <MetricRow label="Mg" value={data.magnesium_percentage} unit="%" />

      <Text style={styles.sectionTitle}>{t('analyses.microNutrients', 'Micro-nutrients')}</Text>
      <MetricRow label="Fe" value={data.iron_ppm} unit="ppm" />
      <MetricRow label="Zn" value={data.zinc_ppm} unit="ppm" />
      <MetricRow label="Cu" value={data.copper_ppm} unit="ppm" />
      <MetricRow label="Mn" value={data.manganese_ppm} unit="ppm" />
      <MetricRow label="B" value={data.boron_ppm} unit="ppm" />
    </>
  );
}

export default function AnalysisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('common');
  const [refreshing, setRefreshing] = useState(false);

  const { data: analysis, isLoading, refetch } = useAnalysis(id);
  const { data: recommendations } = useAnalysisRecommendations(id);
  const deleteAnalysis = useDeleteAnalysis();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDelete = async () => {
    try {
      await deleteAnalysis.mutateAsync(id);
      router.back();
    } catch (error) {
      console.error('Failed to delete analysis:', error);
    }
  };

  const handleEdit = () => {
    router.push(`/(drawer)/(tabs)/production/analyses/${id}/edit`);
  };

  if (isLoading || !analysis) {
    return <LoadingState />;
  }

  const config = analysisTypeConfig[analysis.analysis_type];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <PageHeader
        title={config.label}
        showBack={true}
        actions={[
          { icon: 'create-outline', onPress: handleEdit },
          { icon: 'trash-outline', onPress: handleDelete },
        ]}
      />

      {/* Header Card */}
      <Card variant="elevated">
        <View style={styles.headerRow}>
          <View style={[styles.typeIcon, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon as any} size={24} color={config.color} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {new Date(analysis.analysis_date).toLocaleDateString()}
            </Text>
            {analysis.laboratory && (
              <Text style={styles.headerSubtitle}>{analysis.laboratory}</Text>
            )}
          </View>
        </View>
        {analysis.notes && (
          <Text style={styles.notes}>{analysis.notes}</Text>
        )}
      </Card>

      {/* Analysis Data */}
      <Card variant="elevated">
        {analysis.analysis_type === 'soil' && <SoilAnalysisView data={analysis.data as SoilAnalysisData} />}
        {analysis.analysis_type === 'water' && <WaterAnalysisView data={analysis.data as WaterAnalysisData} />}
        {analysis.analysis_type === 'plant' && <PlantAnalysisView data={analysis.data as PlantAnalysisData} />}
      </Card>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card variant="elevated">
          <Text style={styles.sectionTitle}>{t('analyses.recommendations', 'Recommendations')}</Text>
          {recommendations.map((rec) => (
            <View key={rec.id} style={styles.recommendationItem}>
              <Badge
                variant={rec.priority === 'critical' || rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'neutral'}
                label={rec.priority}
                size="sm"
              />
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationDesc}>{rec.description}</Text>
            </View>
          ))}
        </Card>
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  notes: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  recommendationItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  recommendationTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginTop: spacing.xs,
  },
  recommendationDesc: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
  },
});
