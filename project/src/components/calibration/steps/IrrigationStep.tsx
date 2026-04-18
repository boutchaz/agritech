import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CalibrationWizardFormValues } from '@/schemas/calibrationWizardSchema';

interface IrrigationStepProps {
  form: UseFormReturn<CalibrationWizardFormValues>;
}

export function IrrigationStep({ form }: IrrigationStepProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const regimeChanged = watch('irrigation_regime_changed');

  useEffect(() => {
    if (!regimeChanged) {
      form.setValue('irrigation_change_date', undefined);
      form.setValue('previous_irrigation_frequency', undefined);
      form.setValue('previous_volume_per_tree_liters', undefined);
    }
  }, [regimeChanged, form]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Frequence d'irrigation actuelle"
          htmlFor="irrigation_frequency"
          required
          error={errors.irrigation_frequency?.message}
        >
          <Select id="irrigation_frequency" {...register('irrigation_frequency')}>
            <option value="daily">Quotidien</option>
            <option value="2_3_per_week">2-3 fois / semaine</option>
            <option value="weekly">1 fois / semaine</option>
            <option value="biweekly">1 fois / 15 jours</option>
            <option value="other">Autre</option>
          </Select>
        </FormField>

        <FormField
          label="Volume par arbre par irrigation (L)"
          htmlFor="volume_per_tree_liters"
          required
          error={errors.volume_per_tree_liters?.message}
        >
          <Input
            id="volume_per_tree_liters"
            type="number"
            min={0}
            step="0.1"
            {...register('volume_per_tree_liters', { valueAsNumber: true })}
            invalid={!!errors.volume_per_tree_liters}
          />
        </FormField>
      </div>

      <FormField
        label="Le regime d'irrigation a change recemment ?"
        htmlFor="irrigation_regime_changed"
        required
        error={errors.irrigation_regime_changed?.message}
      >
        <Select
          id="irrigation_regime_changed"
          value={watch('irrigation_regime_changed') ? 'yes' : 'no'}
          onChange={(event) => form.setValue('irrigation_regime_changed', event.target.value === 'yes')}
        >
          <option value="no">Non</option>
          <option value="yes">Oui</option>
        </Select>
      </FormField>

      {regimeChanged && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/40">
          <FormField label="Date du changement" htmlFor="irrigation_change_date" error={errors.irrigation_change_date?.message}>
            <Input id="irrigation_change_date" type="month" {...register('irrigation_change_date')} invalid={!!errors.irrigation_change_date} />
          </FormField>

          <FormField
            label="Frequence avant changement"
            htmlFor="previous_irrigation_frequency"
            error={errors.previous_irrigation_frequency?.message}
          >
            <Input id="previous_irrigation_frequency" {...register('previous_irrigation_frequency')} invalid={!!errors.previous_irrigation_frequency} />
          </FormField>

          <FormField
            label="Volume avant changement (L)"
            htmlFor="previous_volume_per_tree_liters"
            error={errors.previous_volume_per_tree_liters?.message}
          >
            <Input
              id="previous_volume_per_tree_liters"
              type="number"
              min={0}
              step="0.1"
              {...register('previous_volume_per_tree_liters', {
                setValueAs: (value) => (value === '' ? undefined : Number(value)),
              })}
              invalid={!!errors.previous_volume_per_tree_liters}
            />
          </FormField>
        </div>
      )}
    </div>
  );
}
