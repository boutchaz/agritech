// Main Calibration Screen for Mobile
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import PageHeader from '@/components/PageHeader';
import { Button, Card, LoadingState } from '@/components/ui';
import {
  PhaseBanner,
  ExecutiveSummary,
  NutritionOptionSelector,
  CalibrationHistoryList,
  ValidationPanel,
} from '@/components/calibration';
import {
  useCalibrationStatus,
  useCalibrationReport,
  useCalibrationHistory,
  useCalibrationReadiness,
  useNutritionSuggestion,
  useStartCalibration,
  useConfirmNutritionOption,
} from '@/hooks/useCalibration';
import type { NutritionOption, CalibrationHistoryRecord } from '@/types/calibration';

export default function CalibrationScreen() {
  const { id: parcelId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('common');
  const { colors: themeColors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<NutritionOption | null>(null);

  // Queries
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useCalibrationStatus(parcelId);
  const { data: reportData, isLoading: reportLoading, refetch: refetchReport } = useCalibrationReport(parcelId);
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useCalibrationHistory(parcelId);
  const { data: readinessData, isLoading: readinessLoading, refetch: refetchReadiness } = useCalibrationReadiness(parcelId);
  const { data: nutritionData, refetch: refetchNutrition } = useNutritionSuggestion(parcelId);

  // Mutations
  const startCalibration = useStartCalibration(parcelId);
  const confirmNutrition = useConfirmNutritionOption(parcelId);

  const isLoading = statusLoading || reportLoading || historyLoading || readinessLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchStatus(),
        refetchReport(),
        refetchHistory(),
        refetchReadiness(),
        refetchNutrition(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchStatus, refetchReport, refetchHistory, refetchReadiness, refetchNutrition]);

  const handleStartCalibration = async () => {
    try {
      await startCalibration.mutateAsync({});
    } catch (error) {
      console.error('Failed to start calibration:', error);
    }
  };

  const handleConfirmNutrition = async () => {
    if (!statusData?.id || !selectedOption) return;
    try {
      await confirmNutrition.mutateAsync({
        calibrationId: statusData.id,
        option: selectedOption,
      });
    } catch (error) {
      console.error('Failed to confirm nutrition option:', error);
    }
  };

  const handleHistoryItemPress = (record: CalibrationHistoryRecord) => {
    // Navigate to history detail if needed
  };

  if (isLoading && !statusData) {
    return <LoadingState />;
  }

  const phase = statusData?.status as string || 'unknown';
  const report = reportData?.report?.output;
  const confidenceScore = statusData?.confidence_score;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <PageHeader
        title={t('calibration.title')}
        onMorePress={() => {}}
      />

      {/* Phase Banner */}
      <PhaseBanner phase={phase as any} confidenceScore={confidenceScore} />

      {/* Actions based on phase */}
      {phase === 'disabled' && readinessData && (
        <ValidationPanel
          readiness={readinessData}
          onValidate={handleStartCalibration}
          onStartCalibration={handleStartCalibration}
          isLoading={startCalibration.isPending}
          canStart={true}
        />
      )}

      {phase === 'calibrating' && (
        <Card variant="elevated">
          <View style={styles.calibratingContainer}>
            <ActivityIndicator size="large" color={themeColors.brandPrimary} />
            <Text style={[styles.calibratingText, { color: themeColors.textPrimary }]}>{t('calibration.calibrating')}</Text>
            <Text style={[styles.calibratingSubtext, { color: themeColors.textSecondary }]}>{t('calibration.calibratingDesc')}</Text>
          </View>
        </Card>
      )}

      {/* Executive Summary */}
      {report && (
        <ExecutiveSummary
          healthScore={report.step8?.health_score}
          confidenceScore={report.confidence}
          maturityPhase={report.maturity_phase}
          yieldPotential={report.step6?.yield_potential}
        />
      )}

      {/* Nutrition Option Selector */}
      {phase === 'awaiting_nutrition_option' && nutritionData && (
        <View style={styles.section}>
          <NutritionOptionSelector
            options={nutritionData}
            selectedOption={selectedOption || undefined}
            onSelect={setSelectedOption}
          />
          <Button
            variant="primary"
            onPress={handleConfirmNutrition}
            disabled={!selectedOption || confirmNutrition.isPending}
          >
            {confirmNutrition.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              t('calibration.confirmNutrition')
            )}
          </Button>
        </View>
      )}

      {/* Calibration History */}
      <View style={styles.section}>
        <CalibrationHistoryList
          history={historyData || []}
          onSelect={handleHistoryItemPress}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={[styles.quickActionCard, { backgroundColor: themeColors.surfaceLowest }]}
          onPress={() => router.push(`/(drawer)/(tabs)/production/parcel/${parcelId}/calibration/wizard`)}
        >
          <Ionicons name="settings-outline" size={24} color={themeColors.brandPrimary} />
          <Text style={[styles.quickActionText, { color: themeColors.textPrimary }]}>{t('calibration.partialRecalibration')}</Text>
          <Ionicons name="chevron-forward" size={20} color={themeColors.iconSubtle} />
        </Pressable>

        <Pressable
          style={[styles.quickActionCard, { backgroundColor: themeColors.surfaceLowest }]}
          onPress={() => router.push(`/(drawer)/(tabs)/production/parcel/${parcelId}/calibration/annual`)}
        >
          <Ionicons name="refresh-outline" size={24} color={themeColors.brandPrimary} />
          <Text style={[styles.quickActionText, { color: themeColors.textPrimary }]}>{t('calibration.annualRecalibration')}</Text>
          <Ionicons name="chevron-forward" size={20} color={themeColors.iconSubtle} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  section: {
    marginBottom: spacing.lg,
  },
  calibratingContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  calibratingText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  calibratingSubtext: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  quickActions: {
    gap: spacing.sm,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  quickActionText: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.sm,
  },
});
