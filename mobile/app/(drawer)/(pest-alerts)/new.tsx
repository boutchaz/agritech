// Create Pest Report Screen
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCreatePestReport, usePestDiseaseLibrary } from '@/hooks/usePestAlerts';
import { useFarms, useParcels } from '@/hooks/useFarms';
import type { Farm, Parcel } from '@/lib/api';
import type { PestReportSeverity, DetectionMethod } from '@/types/pest-alerts';

const SEVERITY_OPTIONS: { value: PestReportSeverity; labelKey: string; defaultLabel: string; color: string }[] = [
  { value: 'low', labelKey: 'common.severity.low', defaultLabel: 'Low', color: '#3b82f6' },
  { value: 'medium', labelKey: 'common.severity.medium', defaultLabel: 'Medium', color: '#eab308' },
  { value: 'high', labelKey: 'common.severity.high', defaultLabel: 'High', color: '#f97316' },
  { value: 'critical', labelKey: 'common.severity.critical', defaultLabel: 'Critical', color: '#ef4444' },
];

const DETECTION_METHODS: { value: DetectionMethod; labelKey: string; defaultLabel: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    value: 'visual_inspection',
    labelKey: 'common.detectionMethods.visual_inspection',
    defaultLabel: 'Visual Inspection',
    icon: 'eye-outline',
  },
  {
    value: 'trap_monitoring',
    labelKey: 'common.detectionMethods.trap_monitoring',
    defaultLabel: 'Trap Monitoring',
    icon: 'trail-sign-outline',
  },
  {
    value: 'lab_test',
    labelKey: 'common.detectionMethods.lab_test',
    defaultLabel: 'Lab Test',
    icon: 'flask-outline',
  },
  {
    value: 'field_scout',
    labelKey: 'common.detectionMethods.field_scout',
    defaultLabel: 'Field Scout',
    icon: 'walk-outline',
  },
  {
    value: 'automated_sensor',
    labelKey: 'common.detectionMethods.automated_sensor',
    defaultLabel: 'Automated Sensor',
    icon: 'hardware-chip-outline',
  },
  {
    value: 'worker_report',
    labelKey: 'common.detectionMethods.worker_report',
    defaultLabel: 'Worker Report',
    icon: 'person-outline',
  },
];

const pestReportSchema = z.object({
  farmId: z.string().min(1, 'Required'),
  parcelId: z.string().min(1, 'Required'),
  pestDiseaseId: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  detectionMethod: z.enum([
    'visual_inspection',
    'trap_monitoring',
    'lab_test',
    'field_scout',
    'automated_sensor',
    'worker_report',
  ]),
  affectedArea: z
    .string()
    .optional()
    .refine((v) => !v || (parseInt(v, 10) >= 0 && parseInt(v, 10) <= 100), 'Must be 0-100'),
  notes: z.string(),
});

type PestReportFormData = z.infer<typeof pestReportSchema>;

function SelectField({
  label,
  value,
  placeholder,
  options,
  onSelect,
  error,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}: ${selectedLabel || placeholder}`}
        style={styles.selectButton}
        onPress={() => setOpen(!open)}
      >
        <Text style={[styles.selectText, !selectedLabel && styles.placeholder]}>
          {selectedLabel || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.gray[400]} />
      </Pressable>
      {open && (
        <View style={styles.dropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: value === opt.value }}
              accessibilityLabel={opt.label}
              style={[styles.dropdownItem, value === opt.value && styles.dropdownItemActive]}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <Text style={[styles.dropdownText, value === opt.value && styles.dropdownTextActive]}>
                {opt.label}
              </Text>
              {value === opt.value && <Ionicons name="checkmark" size={16} color={colors.primary[600]} />}
            </Pressable>
          ))}
        </View>
      )}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function CreatePestReportScreen() {
  const { t } = useTranslation('common');
  const createMutation = useCreatePestReport();
  const { data: farms = [] } = useFarms();
  const { data: library = [] } = usePestDiseaseLibrary();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PestReportFormData>({
    resolver: zodResolver(pestReportSchema),
    defaultValues: {
      farmId: '',
      parcelId: '',
      pestDiseaseId: '',
      severity: 'medium',
      detectionMethod: 'visual_inspection',
      affectedArea: '',
      notes: '',
    },
  });

  const farmId = watch('farmId');
  const { data: parcels = [] } = useParcels(farmId || undefined);

  const farmOptions = farms.map((f: Farm) => ({ value: f.id, label: f.name }));
  const parcelOptions = parcels.map((p: Parcel) => ({ value: p.id, label: p.name }));
  const libraryOptions = [
    { value: '', label: t('pestAlerts.noneManualEntry', { defaultValue: 'None (manual entry)' }) },
    ...library.map((item) => ({ value: item.id, label: `${item.name} (${item.type})` })),
  ];

  const onSubmit = handleSubmit((data) => {
    createMutation.mutate(
      {
        farm_id: data.farmId,
        parcel_id: data.parcelId,
        pest_disease_id: data.pestDiseaseId || undefined,
        severity: data.severity,
        detection_method: data.detectionMethod,
        affected_area_percentage: data.affectedArea ? parseInt(data.affectedArea, 10) : undefined,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: () => {
          Alert.alert(
            t('errors.generic', { defaultValue: 'Error' }),
            t('pestAlerts.createError', { defaultValue: 'Failed to create report. Please try again.' })
          );
        },
      }
    );
  });

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('pestAlerts.newReport', { defaultValue: 'New Report' })}
        showBack
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Farm & Parcel */}
          <Controller
            name="farmId"
            control={control}
            render={({ field }) => (
              <SelectField
                label={t('pestAlerts.farm', { defaultValue: 'Farm *' })}
                value={field.value}
                placeholder={t('pestAlerts.selectFarm', { defaultValue: 'Select farm' })}
                options={farmOptions}
                onSelect={(v) => {
                  field.onChange(v);
                  setValue('parcelId', '');
                }}
                error={errors.farmId?.message}
              />
            )}
          />

          <Controller
            name="parcelId"
            control={control}
            render={({ field }) => (
              <SelectField
                label={t('pestAlerts.parcel', { defaultValue: 'Parcel *' })}
                value={field.value}
                placeholder={t('pestAlerts.selectParcel', { defaultValue: 'Select parcel' })}
                options={parcelOptions}
                onSelect={field.onChange}
                error={errors.parcelId?.message}
              />
            )}
          />

          {/* Pest/Disease from library */}
          <Controller
            name="pestDiseaseId"
            control={control}
            render={({ field }) => (
              <SelectField
                label={t('pestAlerts.pestDisease', { defaultValue: 'Pest / Disease' })}
                value={field.value}
                placeholder={t('pestAlerts.selectPestDisease', { defaultValue: 'Select from library (optional)' })}
                options={libraryOptions}
                onSelect={field.onChange}
              />
            )}
          />

          {/* Severity */}
          <Controller
            name="severity"
            control={control}
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('pestAlerts.severity', { defaultValue: 'Severity *' })}</Text>
                <View style={styles.severityRow}>
                  {SEVERITY_OPTIONS.map((opt) => (
                   <Pressable
                      key={opt.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: field.value === opt.value }}
                      accessibilityLabel={t(opt.labelKey, { defaultValue: opt.defaultLabel })}
                      style={[
                        styles.severityChip,
                        field.value === opt.value && { backgroundColor: opt.color + '20', borderColor: opt.color },
                      ]}
                      onPress={() => field.onChange(opt.value)}
                    >
                      <View style={[styles.severityDot, { backgroundColor: opt.color }]} />
                        <Text
                          style={[
                            styles.severityChipText,
                            field.value === opt.value && { color: opt.color, fontWeight: fontWeight.semibold },
                          ]}
                        >
                         {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
                       </Text>
                     </Pressable>
                   ))}
                </View>
                {errors.severity ? <Text style={styles.fieldError}>{errors.severity.message}</Text> : null}
              </View>
            )}
          />

          {/* Detection Method */}
          <Controller
            name="detectionMethod"
            control={control}
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('pestAlerts.detectionMethod', { defaultValue: 'Detection Method' })}</Text>
                <View style={styles.detectionGrid}>
                  {DETECTION_METHODS.map((method) => (
                    <Pressable
                      key={method.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: field.value === method.value }}
                      accessibilityLabel={t(method.labelKey, { defaultValue: method.defaultLabel })}
                      style={[
                        styles.detectionCard,
                        field.value === method.value && styles.detectionCardActive,
                      ]}
                      onPress={() => field.onChange(method.value)}
                    >
                      <Ionicons
                        name={method.icon}
                        size={20}
                        color={field.value === method.value ? colors.primary[600] : colors.gray[400]}
                      />
                      <Text
                        style={[
                          styles.detectionLabel,
                          field.value === method.value && styles.detectionLabelActive,
                        ]}
                        numberOfLines={2}
                      >
                        {t(method.labelKey, { defaultValue: method.defaultLabel })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {errors.detectionMethod ? <Text style={styles.fieldError}>{errors.detectionMethod.message}</Text> : null}
              </View>
            )}
          />

          {/* Affected Area */}
          <Controller
            name="affectedArea"
            control={control}
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('pestAlerts.affectedArea', { defaultValue: 'Affected Area (%)' })}</Text>
                <TextInput
                  accessibilityLabel={t('pestAlerts.affectedArea', { defaultValue: 'Affected Area (%)' })}
                  style={styles.textInput}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="0-100"
                  placeholderTextColor={colors.gray[400]}
                  keyboardType="numeric"
                  maxLength={3}
                />
                {errors.affectedArea ? <Text style={styles.fieldError}>{errors.affectedArea.message}</Text> : null}
              </View>
            )}
          />

          {/* Notes */}
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('pestAlerts.notes', { defaultValue: 'Observations' })}</Text>
                <TextInput
                  accessibilityLabel={t('pestAlerts.notes', { defaultValue: 'Observations' })}
                  style={[styles.textInput, styles.textArea]}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={t('pestAlerts.notesPlaceholder', { defaultValue: 'Describe symptoms, location, affected area...' })}
                  placeholderTextColor={colors.gray[400]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}
          />

          {/* Submit */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              createMutation.isPending
                ? t('actions.submitting', { defaultValue: 'Submitting...' })
                : t('pestAlerts.submitReport', { defaultValue: 'Submit Report' })
            }
            style={[styles.submitButton, createMutation.isPending && styles.submitDisabled]}
            onPress={onSubmit}
            disabled={createMutation.isPending}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.white} />
            <Text style={styles.submitText}>
              {createMutation.isPending
                ? t('actions.submitting', { defaultValue: 'Submitting...' })
                : t('pestAlerts.submitReport', { defaultValue: 'Submit Report' })}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  fieldError: {
    color: colors.red[600],
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  selectText: {
    fontSize: fontSize.sm,
    color: colors.gray[900],
  },
  placeholder: {
    color: colors.gray[400],
  },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.gray[200],
    maxHeight: 200,
    ...shadows.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  dropdownItemActive: {
    backgroundColor: colors.primary[50],
  },
  dropdownText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  dropdownTextActive: {
    color: colors.primary[600],
    fontWeight: fontWeight.medium,
  },
  severityRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  severityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityChipText: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  detectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detectionCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    gap: 4,
  },
  detectionCardActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  detectionLabel: {
    fontSize: 10,
    color: colors.gray[600],
    textAlign: 'center',
  },
  detectionLabelActive: {
    color: colors.primary[600],
    fontWeight: fontWeight.medium,
  },
  textInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.sm,
    color: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  textArea: {
    minHeight: 100,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
