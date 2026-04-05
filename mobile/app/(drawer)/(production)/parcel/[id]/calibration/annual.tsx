// Annual recalibration screen for Mobile
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
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { Button, Card, Badge, LoadingState } from '@/components/ui';
import {
  useAnnualEligibility,
  useAnnualMissingTasks,
  useAnnualNewAnalyses,
  useAnnualCampaignBilan,
  useStartAnnualRecalibration,
} from '@/hooks/useF3Recalibration';

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function AnnualRecalibrationScreen() {
  const { id: parcelId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('calibration');
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const { data: eligibility, isLoading: eligibilityLoading, refetch: refetchEligibility } = useAnnualEligibility(parcelId);
  const { data: missingTasks, isLoading: tasksLoading, refetch: refetchTasks } = useAnnualMissingTasks(parcelId);
  const { data: newAnalyses, isLoading: analysesLoading, refetch: refetchAnalyses } = useAnnualNewAnalyses(parcelId);
  const { data: campaignBilan, isLoading: bilanLoading, refetch: refetchBilan } = useAnnualCampaignBilan(parcelId);

  // Mutation
  const startAnnual = useStartAnnualRecalibration(parcelId);

  const isLoading = eligibilityLoading || tasksLoading || analysesLoading || bilanLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchEligibility(),
        refetchTasks(),
        refetchAnalyses(),
        refetchBilan(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchEligibility, refetchTasks, refetchAnalyses, refetchBilan]);

  const handleStartAnnual = async () => {
    try {
      await startAnnual.mutateAsync({});
      router.back();
    } catch (error) {
      console.error('Failed to start annual recalibration:', error);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <PageHeader
        title={t('annualRecalibration')}
        showBack={true}
        onMorePress={() => {}}
      />

      {/* Eligibility Card */}
      <Card variant="elevated">
        <View style={styles.eligibilityHeader}>
          <Text style={styles.cardTitle}>{t('checkEligibility')}</Text>
          {eligibility?.eligible ? (
            <Badge variant="success" label={t('eligible')} />
          ) : (
            <Badge variant="error" label={t('notEligible')} />
          )}
        </View>
        {eligibility && (
          <View style={styles.eligibilityDetails}>
            <InfoRow
              label={t('triggerReason')}
              value={t(`triggerReasons.${eligibility.trigger_reason}`, eligibility.trigger_reason)}
            />
            {eligibility.harvest_date && (
              <InfoRow label={t('harvestCompleted')} value={eligibility.harvest_date} />
            )}
            {eligibility.days_since_harvest != null && (
              <InfoRow label={t('daysSinceHarvest')} value={eligibility.days_since_harvest} />
            )}
          </View>
        )}
      </Card>

      {/* Missing Tasks */}
      {missingTasks && missingTasks.length > 0 && (
        <Card variant="elevated">
          <Text style={styles.cardTitle}>{t('missingTasks')}</Text>
          {missingTasks.map((task, index) => (
            <View key={task.action} style={styles.taskItem}>
              <Ionicons
                name={task.action === 'quick_entry' ? 'create-outline' : 'checkmark-circle-outline'}
                size={20}
                color={colors.yellow[500]}
              />
              <View style={styles.taskContent}>
                <Text style={styles.taskMessage}>{task.message}</Text>
                <Text style={styles.taskPeriod}>{task.period}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* New Analyses */}
      {newAnalyses && (newAnalyses.new_soil || newAnalyses.new_water || newAnalyses.new_foliar) && (
        <Card variant="elevated">
          <Text style={styles.cardTitle}>{t('newAnalyses')}</Text>
          <View style={styles.analysesRow}>
            {newAnalyses.new_soil && (
              <View style={styles.analysisBadge}>
                <Ionicons name="leaf-outline" size={16} color={colors.primary[600]} />
                <Text style={styles.analysisText}>Sol</Text>
              </View>
            )}
            {newAnalyses.new_water && (
              <View style={styles.analysisBadge}>
                <Ionicons name="water-outline" size={16} color={colors.blue[500]} />
                <Text style={styles.analysisText}>Eau</Text>
              </View>
            )}
            {newAnalyses.new_foliar && (
              <View style={styles.analysisBadge}>
                <Ionicons name="flower-outline" size={16} color={colors.yellow[500]} />
                <Text style={styles.analysisText}>Foliaire</Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Campaign Bilan */}
      {campaignBilan && (
        <Card variant="elevated">
          <Text style={styles.cardTitle}>{t('campaignBilan')}</Text>

          <View style={styles.bilanGrid}>
            <View style={styles.bilanItem}>
              <Text style={styles.bilanLabel}>{t('predictedYield')}</Text>
              <Text style={styles.bilanValue}>
                {campaignBilan.predicted_yield.min} - {campaignBilan.predicted_yield.max} t/ha
              </Text>
            </View>

            {campaignBilan.actual_yield != null && (
              <View style={styles.bilanItem}>
                <Text style={styles.bilanLabel}>{t('actualYield')}</Text>
                <Text style={styles.bilanValue}>{campaignBilan.actual_yield} t/ha</Text>
              </View>
            )}

            {campaignBilan.yield_deviation_pct != null && (
              <View style={styles.bilanItem}>
                <Text style={styles.bilanLabel}>{t('yieldDeviation')}</Text>
                <Text style={[styles.bilanValue, { color: campaignBilan.yield_deviation_pct >= 0 ? colors.primary[600] : colors.red[500] }]}>
                  {campaignBilan.yield_deviation_pct > 0 ? '+' : ''}{campaignBilan.yield_deviation_pct.toFixed(1)}%
                </Text>
              </View>
            )}

            <View style={styles.bilanItem}>
              <Text style={styles.bilanLabel}>{t('healthEvolution')}</Text>
              <Text style={styles.bilanValue}>
                {campaignBilan.health_score_evolution.start} → {campaignBilan.health_score_evolution.end}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Start Button */}
      {eligibility?.eligible && (
        <Button
          variant="primary"
          onPress={handleStartAnnual}
          disabled={startAnnual.isPending}
        >
          {startAnnual.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            t('startAnnual')
          )}
        </Button>
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
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  eligibilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  eligibilityDetails: {
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[800],
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  taskContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  taskMessage: {
    fontSize: fontSize.sm,
    color: colors.gray[800],
  },
  taskPeriod: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  analysesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  analysisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  analysisText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  bilanGrid: {
    gap: spacing.md,
  },
  bilanItem: {},
  bilanLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: 2,
  },
  bilanValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
});
