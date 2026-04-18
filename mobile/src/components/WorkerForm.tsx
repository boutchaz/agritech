// Reusable Worker Form Modal (Create / Edit)
import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import { useFarms } from '@/hooks/useFarms';
import type { Worker, WorkerType } from '@/types/workforce';

// ── Zod Schema ──────────────────────────────────────────────
const workerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  cin: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  worker_type: z.enum(['fixed_salary', 'daily_worker', 'metayage'] as const),
  position: z.string().optional(),
  daily_rate: z.number().optional(),
  monthly_salary: z.number().optional(),
  farm_id: z.string().optional(),
  notes: z.string().optional(),
});

type WorkerFormValues = z.infer<typeof workerSchema>;

// ── Props ───────────────────────────────────────────────────
interface WorkerFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: WorkerFormValues) => void;
  isSubmitting?: boolean;
  initialData?: Partial<Worker>;
  isEdit?: boolean;
}

// ── Type chips data ─────────────────────────────────────────
const TYPE_OPTIONS: { key: WorkerType; label: string }[] = [
  { key: 'fixed_salary', label: 'Employee' },
  { key: 'daily_worker', label: 'Day Laborer' },
  { key: 'metayage', label: 'Metayage' },
];

// ── Component ───────────────────────────────────────────────
export default function WorkerForm({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
  initialData,
  isEdit = false,
}: WorkerFormProps) {
  const { data: farms } = useFarms();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      first_name: initialData?.first_name ?? '',
      last_name: initialData?.last_name ?? '',
      phone: initialData?.phone ?? '',
      cin: initialData?.cin ?? '',
      email: initialData?.email ?? '',
      worker_type: initialData?.worker_type ?? 'fixed_salary',
      position: initialData?.position ?? '',
      daily_rate: initialData?.daily_rate ?? undefined,
      monthly_salary: initialData?.monthly_salary ?? undefined,
      farm_id: initialData?.farm_id ?? '',
      notes: initialData?.notes ?? '',
    },
  });

  const workerType = watch('worker_type');

  // Reset form when visibility or initial data changes
  useEffect(() => {
    if (visible) {
      reset({
        first_name: initialData?.first_name ?? '',
        last_name: initialData?.last_name ?? '',
        phone: initialData?.phone ?? '',
        cin: initialData?.cin ?? '',
        email: initialData?.email ?? '',
        worker_type: initialData?.worker_type ?? 'fixed_salary',
        position: initialData?.position ?? '',
        daily_rate: initialData?.daily_rate ?? undefined,
        monthly_salary: initialData?.monthly_salary ?? undefined,
        farm_id: initialData?.farm_id ?? '',
        notes: initialData?.notes ?? '',
      });
    }
  }, [visible, initialData]);

  const onValid = (data: WorkerFormValues) => {
    // Strip empty optional strings
    const cleaned: any = { ...data };
    if (!cleaned.email) delete cleaned.email;
    if (!cleaned.phone) delete cleaned.phone;
    if (!cleaned.cin) delete cleaned.cin;
    if (!cleaned.position) delete cleaned.position;
    if (!cleaned.farm_id) delete cleaned.farm_id;
    if (!cleaned.notes) delete cleaned.notes;

    // Remove irrelevant compensation field
    if (cleaned.worker_type !== 'daily_worker') delete cleaned.daily_rate;
    if (cleaned.worker_type !== 'fixed_salary') delete cleaned.monthly_salary;

    // Set hire_date for new workers
    if (!isEdit) {
      cleaned.hire_date = new Date().toISOString().split('T')[0];
    }

    onSubmit(cleaned);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modal}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.gray[600]} />
          </Pressable>
          <Text style={styles.modalTitle}>{isEdit ? 'Edit Worker' : 'Add Worker'}</Text>
          <Pressable
            onPress={handleSubmit(onValid)}
            disabled={isSubmitting}
            hitSlop={12}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primary[600]} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          {/* First Name */}
          <FieldLabel label="First Name" required />
          <Controller
            control={control}
            name="first_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.first_name && styles.inputError]}
                placeholder="First name"
                placeholderTextColor={colors.gray[400]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {errors.first_name && <Text style={styles.errorText}>{errors.first_name.message}</Text>}

          {/* Last Name */}
          <FieldLabel label="Last Name" required />
          <Controller
            control={control}
            name="last_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.last_name && styles.inputError]}
                placeholder="Last name"
                placeholderTextColor={colors.gray[400]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {errors.last_name && <Text style={styles.errorText}>{errors.last_name.message}</Text>}

          {/* Phone */}
          <FieldLabel label="Phone" />
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor={colors.gray[400]}
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />

          {/* CIN */}
          <FieldLabel label="CIN (National ID)" />
          <Controller
            control={control}
            name="cin"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="CIN"
                placeholderTextColor={colors.gray[400]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />

          {/* Email */}
          <FieldLabel label="Email" />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Email"
                placeholderTextColor={colors.gray[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

          {/* Worker Type */}
          <FieldLabel label="Worker Type" required />
          <Controller
            control={control}
            name="worker_type"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipRow}>
                {TYPE_OPTIONS.map((opt) => {
                  const active = value === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => onChange(opt.key)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />

          {/* Position */}
          <FieldLabel label="Position" />
          <Controller
            control={control}
            name="position"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="e.g. Field Supervisor"
                placeholderTextColor={colors.gray[400]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />

          {/* Daily rate (day workers) */}
          {workerType === 'daily_worker' && (
            <>
              <FieldLabel label="Daily Rate (MAD)" />
              <Controller
                control={control}
                name="daily_rate"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.gray[400]}
                    keyboardType="numeric"
                    value={value !== undefined ? String(value) : ''}
                    onChangeText={(t) => {
                      const n = parseFloat(t);
                      onChange(isNaN(n) ? undefined : n);
                    }}
                    onBlur={onBlur}
                  />
                )}
              />
            </>
          )}

          {/* Monthly salary (employees) */}
          {workerType === 'fixed_salary' && (
            <>
              <FieldLabel label="Monthly Salary (MAD)" />
              <Controller
                control={control}
                name="monthly_salary"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.gray[400]}
                    keyboardType="numeric"
                    value={value !== undefined ? String(value) : ''}
                    onChangeText={(t) => {
                      const n = parseFloat(t);
                      onChange(isNaN(n) ? undefined : n);
                    }}
                    onBlur={onBlur}
                  />
                )}
              />
            </>
          )}

          {/* Farm selector */}
          {farms && farms.length > 0 && (
            <>
              <FieldLabel label="Farm" />
              <Controller
                control={control}
                name="farm_id"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.chipRow}>
                    <Pressable
                      style={[styles.chip, !value && styles.chipActive]}
                      onPress={() => onChange('')}
                    >
                      <Text style={[styles.chipText, !value && styles.chipTextActive]}>None</Text>
                    </Pressable>
                    {farms.map((farm) => {
                      const active = value === farm.id;
                      return (
                        <Pressable
                          key={farm.id}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => onChange(farm.id)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {farm.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              />
            </>
          )}

          {/* Notes */}
          <FieldLabel label="Notes" />
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes..."
                placeholderTextColor={colors.gray[400]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Small helper ────────────────────────────────────────────
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

// ── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  saveText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary[600],
  },
  formContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.red[500],
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  inputError: {
    borderColor: colors.red[500],
  },
  textArea: {
    minHeight: 80,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.red[500],
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  chipTextActive: {
    color: colors.primary[600],
  },
});
