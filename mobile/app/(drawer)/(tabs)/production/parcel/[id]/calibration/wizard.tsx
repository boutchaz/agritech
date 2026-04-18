// Partial Recalibration Wizard Screen for Mobile
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { Button, Card, Badge } from '@/components/ui';
import { useStartPartialRecalibration } from '@/hooks/useCalibration';
import type { PartialRecalibrationDto } from '@/types/calibration';

// Recalibration motifs
const MOTIFS = [
  { value: 'new_analysis', label: 'Nouvelle analyse disponible', icon: 'flask-outline' },
  { value: 'weather_event', label: 'Événement météo majeur', icon: 'thunderstorm-outline' },
  { value: 'disease', label: 'Maladie détectée', icon: 'medkit-outline' },
  { value: 'yield_correction', label: 'Correction du rendement', icon: 'trending-up-outline' },
  { value: 'other', label: 'Autre', icon: 'ellipsis-horizontal-outline' },
];

export default function PartialRecalibrationWizard() {
  const { id: parcelId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('calibration');
  const [refreshing] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedMotif, setSelectedMotif] = useState<string | null>(null);

  const partialRecalibration = useStartPartialRecalibration(parcelId);

  const handleStart = async () => {
    if (!selectedMotif) return;

    const dto: PartialRecalibrationDto = {
      recalibration_motif: selectedMotif,
      updates: {},
    };

    try {
      await partialRecalibration.mutateAsync(dto);
      router.back();
    } catch (error) {
      console.error('Failed to start partial recalibration:', error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} />}
    >
      <PageHeader
        title={t('partialRecalibration')}
        showBack={true}
        onMorePress={() => {}}
      />

      {/* Progress Steps */}
      <View style={styles.stepsContainer}>
        <View style={[styles.step, step >= 1 && styles.stepActive]}>
          <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>
            {t('wizard.selectMotif')}
          </Text>
        </View>
        <View style={styles.stepLine} />
        <View style={[styles.step, step >= 2 && styles.stepActive]}>
          <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>
            {t('wizard.confirm')}
          </Text>
        </View>
      </View>

      {/* Step 1: Select Motif */}
      {step === 1 && (
        <Card variant="elevated">
          <Text style={styles.cardTitle}>{t('wizard.selectMotif')}</Text>
          <Text style={styles.cardSubtitle}>
            {t('wizard.selectMotifDesc')}
          </Text>

          <View style={styles.motifsContainer}>
            {MOTIFS.map((motif) => (
              <Pressable
                key={motif.value}
                style={[
                  styles.motifCard,
                  selectedMotif === motif.value && styles.motifCardSelected,
                ]}
                onPress={() => setSelectedMotif(motif.value)}
              >
                <Ionicons
                  name={motif.icon as any}
                  size={24}
                  color={selectedMotif === motif.value ? colors.primary[600] : colors.gray[500]}
                />
                <Text style={[
                  styles.motifLabel,
                  selectedMotif === motif.value && styles.motifLabelSelected,
                ]}>
                  {motif.label}
                </Text>
                {selectedMotif === motif.value && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary[600]} />
                )}
              </Pressable>
            ))}
          </View>

          <Button
            variant="primary"
            onPress={() => setStep(2)}
            disabled={!selectedMotif}
          >
            {t('actions.continue')}
          </Button>
        </Card>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <Card variant="elevated">
          <Text style={styles.cardTitle}>{t('wizard.confirm')}</Text>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('wizard.motif')}</Text>
              <Badge
                variant="info"
                label={MOTIFS.find(m => m.value === selectedMotif)?.label || selectedMotif || ''}
              />
            </View>
          </View>

          <View style={styles.warningContainer}>
            <Ionicons name="information-circle-outline" size={24} color={colors.yellow[500]} />
            <Text style={styles.warningText}>
              {t('wizard.partialWarning')}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <Button
              variant="secondary"
              onPress={() => setStep(1)}
            >
              {t('actions.back')}
            </Button>
            <Button
              variant="primary"
              onPress={handleStart}
              disabled={partialRecalibration.isPending}
            >
              {partialRecalibration.isPending ? '...' : t('wizard.startPartial')}
            </Button>
          </View>
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
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepActive: {},
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stepCircleActive: {
    backgroundColor: colors.primary[600],
  },
  stepNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.gray[500],
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.primary[600],
    fontWeight: fontWeight.semibold,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.gray[200],
    marginHorizontal: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  motifsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  motifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  motifCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  motifLabel: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.gray[700],
    marginLeft: spacing.sm,
  },
  motifLabelSelected: {
    color: colors.primary[700],
    fontWeight: fontWeight.medium,
  },
  summaryContainer: {
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.yellow[50],
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
