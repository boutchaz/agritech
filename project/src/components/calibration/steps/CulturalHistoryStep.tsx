import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { CalibrationWizardFormValues } from '@/schemas/calibrationWizardSchema';

interface CulturalHistoryStepProps {
  form: UseFormReturn<CalibrationWizardFormValues>;
}

export function CulturalHistoryStep({ form }: CulturalHistoryStepProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  const pruningPracticed = watch('pruning_practiced');

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stress_events',
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Taille pratiquee ?" htmlFor="pruning_practiced" error={errors.pruning_practiced?.message}>
          <Select id="pruning_practiced" {...register('pruning_practiced')}>
            <option value="">Non precise</option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
            <option value="irregular">Irreguliere</option>
          </Select>
        </FormField>

        <FormField label="Type de taille" htmlFor="pruning_type" error={errors.pruning_type?.message}>
          <Select id="pruning_type" {...register('pruning_type')}>
            <option value="">Non precise</option>
            <option value="production">Production</option>
            <option value="rejuvenation">Rajeunissement</option>
            <option value="sanitary">Sanitaire</option>
            <option value="mixed">Mixte</option>
          </Select>
        </FormField>
      </div>

      {pruningPracticed && pruningPracticed !== 'no' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Derniere taille" htmlFor="last_pruning_date" error={errors.last_pruning_date?.message}>
            <Input id="last_pruning_date" type="month" {...register('last_pruning_date')} invalid={!!errors.last_pruning_date} />
          </FormField>

          <FormField label="Intensite" htmlFor="pruning_intensity" error={errors.pruning_intensity?.message}>
            <Select id="pruning_intensity" {...register('pruning_intensity')}>
              <option value="">Non precise</option>
              <option value="light">Legere (&lt;15%)</option>
              <option value="moderate">Moderee (15-25%)</option>
              <option value="severe">Severe (&gt;25%)</option>
            </Select>
          </FormField>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Fertilisation passee" htmlFor="past_fertilization" error={errors.past_fertilization?.message}>
          <Select id="past_fertilization" {...register('past_fertilization')}>
            <option value="">Non precise</option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
            <option value="partial">Partielle</option>
          </Select>
        </FormField>

        <FormField label="Type de fertilisation (optionnel)" htmlFor="fertilization_type" error={errors.fertilization_type?.message}>
          <Select id="fertilization_type" {...register('fertilization_type')}>
            <option value="">Non precise</option>
            <option value="organic">Organique</option>
            <option value="mineral">Minerale</option>
            <option value="both">Les deux</option>
            <option value="unknown">Inconnu</option>
          </Select>
        </FormField>

        <FormField label="Biostimulants utilises (optionnel)" htmlFor="biostimulants_used" error={errors.biostimulants_used?.message}>
          <Select id="biostimulants_used" {...register('biostimulants_used')}>
            <option value="">Non precise</option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
            <option value="unknown">Inconnu</option>
          </Select>
        </FormField>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Stress majeurs identifies (optionnel)</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ type: 'drought', year: new Date().getFullYear(), description: '' })}
          >
            <Plus className="w-4 h-4" />
            Ajouter un stress
          </Button>
        </div>

        {fields.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
            Aucun stress saisi.
          </div>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="rounded-md border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
            <FormField label="Type" htmlFor={`stress_type_${index}`} error={errors.stress_events?.[index]?.type?.message}>
              <Select id={`stress_type_${index}`} {...register(`stress_events.${index}.type`)}>
                <option value="drought">Secheresse</option>
                <option value="frost">Gel</option>
                <option value="disease">Maladie</option>
                <option value="pest">Ravageur</option>
                <option value="salinity">Salinite</option>
                <option value="other">Autre</option>
              </Select>
            </FormField>

            <FormField label="Annee" htmlFor={`stress_year_${index}`} error={errors.stress_events?.[index]?.year?.message}>
              <Input
                id={`stress_year_${index}`}
                type="number"
                min={1900}
                max={2100}
                {...register(`stress_events.${index}.year`, {
                  setValueAs: (value) => (value === '' ? undefined : Number(value)),
                })}
                invalid={!!errors.stress_events?.[index]?.year}
              />
            </FormField>

            <FormField label="Description" htmlFor={`stress_description_${index}`} error={errors.stress_events?.[index]?.description?.message}>
              <Input id={`stress_description_${index}`} {...register(`stress_events.${index}.description`)} />
            </FormField>

            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
              <Trash2 className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        ))}
      </div>

      <FormField label="Observations terrain" htmlFor="observations" error={errors.observations?.message}>
        <Textarea id="observations" rows={4} {...register('observations')} invalid={!!errors.observations} />
      </FormField>
    </div>
  );
}
