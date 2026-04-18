import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CalibrationWizardFormValues } from '@/schemas/calibrationWizardSchema';

interface PlantationStepProps {
  form: UseFormReturn<CalibrationWizardFormValues>;
}

export function PlantationStep({ form }: PlantationStepProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const waterSourceChanged = watch('water_source_changed');

  useEffect(() => {
    if (!waterSourceChanged) {
      form.setValue('water_source_change_date', undefined);
      form.setValue('previous_water_source', undefined);
    }
  }, [waterSourceChanged, form]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Age de la plantation (annees)"
          htmlFor="plantation_age"
          required
          error={errors.plantation_age?.message}
        >
          <Input
            id="plantation_age"
            type="number"
            min={0}
            {...register('plantation_age', { valueAsNumber: true })}
            invalid={!!errors.plantation_age}
          />
        </FormField>

        <FormField
          label="Nombre d'arbres reel"
          htmlFor="real_tree_count"
          helper="Renseignez uniquement si different de l'estimation automatique"
          error={errors.real_tree_count?.message}
        >
          <Input
            id="real_tree_count"
            type="number"
            min={0}
            {...register('real_tree_count', {
              setValueAs: (value) => (value === '' ? undefined : Number(value)),
            })}
            invalid={!!errors.real_tree_count}
          />
        </FormField>
      </div>

      <FormField
        label="Ecartement reel"
        htmlFor="real_spacing"
        helper="Exemple: 6x6 m"
        error={errors.real_spacing?.message}
      >
        <Input id="real_spacing" placeholder="6x6 m" {...register('real_spacing')} invalid={!!errors.real_spacing} />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Source d'eau actuelle"
          htmlFor="water_source"
          required
          error={errors.water_source?.message}
        >
          <Select id="water_source" {...register('water_source')}>
            <option value="well">Puits</option>
            <option value="dam">Barrage</option>
            <option value="seguia">Seguia</option>
            <option value="municipal">Reseau AEP</option>
            <option value="mixed">Mixte</option>
            <option value="other">Autre</option>
          </Select>
        </FormField>

        <FormField
          label="Changement de source d'eau ?"
          htmlFor="water_source_changed"
          required
          error={errors.water_source_changed?.message}
        >
          <Select
            id="water_source_changed"
            value={watch('water_source_changed') ? 'yes' : 'no'}
            onChange={(event) => form.setValue('water_source_changed', event.target.value === 'yes')}
          >
            <option value="no">Non</option>
            <option value="yes">Oui</option>
          </Select>
        </FormField>
      </div>

      {waterSourceChanged && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/40">
          <FormField
            label="Date du changement"
            htmlFor="water_source_change_date"
            error={errors.water_source_change_date?.message}
          >
            <Input id="water_source_change_date" type="month" {...register('water_source_change_date')} invalid={!!errors.water_source_change_date} />
          </FormField>

          <FormField
            label="Ancienne source"
            htmlFor="previous_water_source"
            error={errors.previous_water_source?.message}
          >
            <Input id="previous_water_source" {...register('previous_water_source')} invalid={!!errors.previous_water_source} />
          </FormField>
        </div>
      )}
    </div>
  );
}
