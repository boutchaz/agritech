import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCreateAnalysis } from '@/hooks/useAnalyses';
import { useFarms, useParcels } from '@/hooks/useFarms';
import type { AnalysisType, AnalysisData, CreateAnalysisInput } from '@/types/analysis';

type AnalysisTypeOption = {
  type: AnalysisType;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const ANALYSIS_TYPES: AnalysisTypeOption[] = [
  { type: 'soil', icon: 'layers-outline', color: '#8b5a2b' },
  { type: 'water', icon: 'water-outline', color: '#0ea5e9' },
  { type: 'plant', icon: 'leaf-outline', color: '#22c55e' },
];

export default function NewAnalysisScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('soil');
  const [farmId, setFarmId] = useState<string>('');
  const [parcelId, setParcelId] = useState<string>('');
  const [analysisDate, setAnalysisDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  const createAnalysis = useCreateAnalysis();
  const { data: farms = [] } = useFarms();
  const { data: parcels = [] } = useParcels(farmId || undefined);

  const handleSubmit = () => {
    if (!parcelId) {
      Alert.alert(t('errors.missingFields', 'Missing Fields'), t('errors.selectParcel', 'Please select a parcel'));
      return;
    }

    let data: AnalysisData = {};
    if (analysisType === 'soil') {
      data = {};
    } else if (analysisType === 'water') {
      data = { water_source: 'well' as const };
    } else if (analysisType === 'plant') {
      data = { plant_part: 'leaf' as const };
    }

    const input: CreateAnalysisInput = {
      parcel_id: parcelId,
      analysis_type: analysisType,
      analysis_date: analysisDate,
      data,
      notes: notes || undefined,
    };

    createAnalysis.mutate(input, {
      onSuccess: () => {
        router.back();
      },
      onError: (error) => {
        Alert.alert(t('errors.error', 'Error'), error.message);
      },
    });
  };

  return (
    <View style={styles.container}>
      <PageHeader title={t('analyses.newAnalysis', 'New Analysis')} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>{t('analyses.type', 'Analysis Type')}</Text>
        <View style={styles.typeSelector}>
          {ANALYSIS_TYPES.map((option) => (
            <Pressable
              key={option.type}
              style={[styles.typeOption, analysisType === option.type && styles.typeOptionActive]}
              onPress={() => setAnalysisType(option.type)}
            >
              <View style={[styles.typeIcon, { backgroundColor: option.color + '20' }]}>
                <Ionicons name={option.icon} size={24} color={option.color} />
              </View>
              <Text style={[styles.typeLabel, analysisType === option.type && styles.typeLabelActive]}>
                {t(`analyses.types.${option.type}`, option.type)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('analyses.farm', 'Farm')}</Text>
        <View style={styles.pickerContainer}>
          {farms.map((farm) => (
            <Pressable
              key={farm.id}
              style={[styles.pickerOption, farmId === farm.id && styles.pickerOptionActive]}
              onPress={() => {
                setFarmId(farm.id);
                setParcelId('');
              }}
            >
              <Ionicons
                name={farmId === farm.id ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={farmId === farm.id ? colors.primary[500] : colors.gray[400]}
              />
              <Text style={styles.pickerText}>{farm.name}</Text>
            </Pressable>
          ))}
        </View>

        {farmId && (
          <>
            <Text style={styles.label}>{t('analyses.parcel', 'Parcel')}</Text>
            <View style={styles.pickerContainer}>
              {parcels.map((parcel) => (
                <Pressable
                  key={parcel.id}
                  style={[styles.pickerOption, parcelId === parcel.id && styles.pickerOptionActive]}
                  onPress={() => setParcelId(parcel.id)}
                >
                  <Ionicons
                    name={parcelId === parcel.id ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={parcelId === parcel.id ? colors.primary[500] : colors.gray[400]}
                  />
                  <Text style={styles.pickerText}>{parcel.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>{t('analyses.date', 'Analysis Date')}</Text>
        <TextInput
          style={styles.input}
          value={analysisDate}
          onChangeText={setAnalysisDate}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>{t('analyses.notes', 'Notes')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('analyses.notesPlaceholder', 'Add any notes about this analysis...')}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.submitButton, createAnalysis.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createAnalysis.isPending}
        >
          <Text style={styles.submitButtonText}>
            {createAnalysis.isPending
              ? t('common.creating', 'Creating...')
              : t('analyses.createAnalysis', 'Create Analysis')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[200],
    ...shadows.sm,
  },
  typeOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  typeLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  typeLabelActive: {
    color: colors.primary[600],
    fontWeight: fontWeight.semibold,
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.sm,
  },
  pickerOptionActive: {
    backgroundColor: colors.primary[50],
  },
  pickerText: {
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.sm,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
