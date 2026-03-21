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
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCreatePestReport, usePestDiseaseLibrary } from '@/hooks/usePestAlerts';
import { useFarms, useParcels } from '@/hooks/useFarms';
import type { PestReportSeverity, DetectionMethod } from '@/types/pest-alerts';

const SEVERITY_OPTIONS: { value: PestReportSeverity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#3b82f6' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

const DETECTION_METHODS: { value: DetectionMethod; label: string; icon: string }[] = [
  { value: 'visual_inspection', label: 'Visual Inspection', icon: 'eye-outline' },
  { value: 'trap_monitoring', label: 'Trap Monitoring', icon: 'trail-sign-outline' },
  { value: 'lab_test', label: 'Lab Test', icon: 'flask-outline' },
  { value: 'field_scout', label: 'Field Scout', icon: 'walk-outline' },
  { value: 'automated_sensor', label: 'Automated Sensor', icon: 'hardware-chip-outline' },
  { value: 'worker_report', label: 'Worker Report', icon: 'person-outline' },
];

function SelectField({
  label,
  value,
  placeholder,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.selectButton} onPress={() => setOpen(!open)}>
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
    </View>
  );
}

export default function CreatePestReportScreen() {
  const { t } = useTranslation('common');
  const createMutation = useCreatePestReport();
  const { data: farms = [] } = useFarms();
  const { data: library = [] } = usePestDiseaseLibrary();

  const [farmId, setFarmId] = useState('');
  const [parcelId, setParcelId] = useState('');
  const [pestDiseaseId, setPestDiseaseId] = useState('');
  const [severity, setSeverity] = useState<PestReportSeverity>('medium');
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>('visual_inspection');
  const [affectedArea, setAffectedArea] = useState('');
  const [notes, setNotes] = useState('');

  const { data: parcels = [] } = useParcels(farmId || undefined);

  const farmOptions = farms.map((f: any) => ({ value: f.id, label: f.name }));
  const parcelOptions = parcels.map((p: any) => ({ value: p.id, label: p.name }));
  const libraryOptions = [
    { value: '', label: 'None (manual entry)' },
    ...library.map((item) => ({ value: item.id, label: `${item.name} (${item.type})` })),
  ];

  const handleSubmit = () => {
    if (!farmId || !parcelId) {
      Alert.alert(
        t('validation.required', { defaultValue: 'Required' }),
        t('pestAlerts.selectFarmParcel', { defaultValue: 'Please select a farm and parcel' })
      );
      return;
    }

    createMutation.mutate(
      {
        farm_id: farmId,
        parcel_id: parcelId,
        pest_disease_id: pestDiseaseId || undefined,
        severity,
        detection_method: detectionMethod,
        affected_area_percentage: affectedArea ? parseInt(affectedArea, 10) : undefined,
        notes: notes || undefined,
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
  };

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
          <SelectField
            label={t('pestAlerts.farm', { defaultValue: 'Farm *' })}
            value={farmId}
            placeholder={t('pestAlerts.selectFarm', { defaultValue: 'Select farm' })}
            options={farmOptions}
            onSelect={(v) => {
              setFarmId(v);
              setParcelId('');
            }}
          />

          <SelectField
            label={t('pestAlerts.parcel', { defaultValue: 'Parcel *' })}
            value={parcelId}
            placeholder={t('pestAlerts.selectParcel', { defaultValue: 'Select parcel' })}
            options={parcelOptions}
            onSelect={setParcelId}
          />

          {/* Pest/Disease from library */}
          <SelectField
            label={t('pestAlerts.pestDisease', { defaultValue: 'Pest / Disease' })}
            value={pestDiseaseId}
            placeholder={t('pestAlerts.selectPestDisease', { defaultValue: 'Select from library (optional)' })}
            options={libraryOptions}
            onSelect={setPestDiseaseId}
          />

          {/* Severity */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('pestAlerts.severity', { defaultValue: 'Severity *' })}</Text>
            <View style={styles.severityRow}>
              {SEVERITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.severityChip,
                    severity === opt.value && { backgroundColor: opt.color + '20', borderColor: opt.color },
                  ]}
                  onPress={() => setSeverity(opt.value)}
                >
                  <View style={[styles.severityDot, { backgroundColor: opt.color }]} />
                  <Text
                    style={[
                      styles.severityChipText,
                      severity === opt.value && { color: opt.color, fontWeight: fontWeight.semibold },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Detection Method */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('pestAlerts.detectionMethod', { defaultValue: 'Detection Method' })}</Text>
            <View style={styles.detectionGrid}>
              {DETECTION_METHODS.map((method) => (
                <Pressable
                  key={method.value}
                  style={[
                    styles.detectionCard,
                    detectionMethod === method.value && styles.detectionCardActive,
                  ]}
                  onPress={() => setDetectionMethod(method.value)}
                >
                  <Ionicons
                    name={method.icon as any}
                    size={20}
                    color={detectionMethod === method.value ? colors.primary[600] : colors.gray[400]}
                  />
                  <Text
                    style={[
                      styles.detectionLabel,
                      detectionMethod === method.value && styles.detectionLabelActive,
                    ]}
                    numberOfLines={2}
                  >
                    {method.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Affected Area */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('pestAlerts.affectedArea', { defaultValue: 'Affected Area (%)' })}</Text>
            <TextInput
              style={styles.textInput}
              value={affectedArea}
              onChangeText={setAffectedArea}
              placeholder="0-100"
              placeholderTextColor={colors.gray[400]}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('pestAlerts.notes', { defaultValue: 'Observations' })}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('pestAlerts.notesPlaceholder', { defaultValue: 'Describe symptoms, location, affected area...' })}
              placeholderTextColor={colors.gray[400]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit */}
          <Pressable
            style={[styles.submitButton, createMutation.isPending && styles.submitDisabled]}
            onPress={handleSubmit}
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
