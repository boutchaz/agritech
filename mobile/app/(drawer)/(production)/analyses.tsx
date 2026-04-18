// Analyses List Screen for Mobile
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { Card, Badge, Button, EmptyState, LoadingState } from '@/components/ui';
import { useAnalyses } from '@/hooks/useAnalyses';
import type { Analysis, AnalysisType } from '@/types/analysis';

const analysisTypeConfig: Record<AnalysisType, { icon: string; color: string; label: string }> = {
  soil: { icon: 'layers-outline', color: colors.primary[600], label: 'Sol' },
  water: { icon: 'water-outline', color: colors.blue[500], label: 'Eau' },
  plant: { icon: 'leaf-outline', color: colors.yellow[500], label: 'Plante' },
};

function AnalysisCard({ analysis, onPress }: { analysis: Analysis; onPress: () => void }) {
  const config = analysisTypeConfig[analysis.analysis_type];
  const date = new Date(analysis.analysis_date).toLocaleDateString();

  return (
    <Pressable onPress={onPress} style={styles.cardContainer}>
      <Card variant="elevated">
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon as any} size={20} color={config.color} />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{config.label}</Text>
            <Text style={styles.cardDate}>{date}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
        </View>
        {analysis.laboratory && (
          <Text style={styles.laboratory}>Lab: {analysis.laboratory}</Text>
        )}
        {analysis.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {analysis.notes}
          </Text>
        )}
      </Card>
    </Pressable>
  );
}

export default function AnalysesScreen() {
  const { t } = useTranslation('common');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<AnalysisType | null>(null);

  const { data, isLoading, refetch } = useAnalyses({
    analysis_type: selectedType || undefined,
    limit: 50,
  });

  const analyses = data?.data || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePress = (analysis: Analysis) => {
    router.push(`/(drawer)/(production)/analyses/${analysis.id}`);
  };

  const handleCreate = () => {
    router.push('/(drawer)/(production)/analyses/new');
  };

  if (isLoading && !data) {
    return <LoadingState />;
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('analyses.title', 'Analyses')}
        showBack={true}
        actions={[
          { icon: 'add-outline', onPress: handleCreate },
        ]}
      />

      {/* Type Filter */}
      <View style={styles.filterContainer}>
        <Pressable
          style={[styles.filterChip, selectedType === null && styles.filterChipActive]}
          onPress={() => setSelectedType(null)}
        >
          <Text style={[styles.filterChipText, selectedType === null && styles.filterChipTextActive]}>
            {t('all', 'All')}
          </Text>
        </Pressable>
        {(Object.keys(analysisTypeConfig) as AnalysisType[]).map((type) => {
          const config = analysisTypeConfig[type];
          return (
            <Pressable
              key={type}
              style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
              onPress={() => setSelectedType(type)}
            >
              <Ionicons
                name={config.icon as any}
                size={14}
                color={selectedType === type ? colors.white : config.color}
              />
              <Text style={[styles.filterChipText, selectedType === type && styles.filterChipTextActive]}>
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={analyses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AnalysisCard analysis={item} onPress={() => handlePress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon="flask-outline"
            title={t('analyses.noAnalyses', 'No analyses')}
            subtitle={t('analyses.noAnalysesDesc', 'Start by adding a new analysis')}
            action={{
              label: t('analyses.addAnalysis', 'Add Analysis'),
              onPress: handleCreate,
            }}
          />
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
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  cardContainer: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  cardDate: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  laboratory: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  notes: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
