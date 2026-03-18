import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CalibrationWizardFormValues } from '@/schemas/calibrationWizardSchema';

interface HarvestHistoryStepProps {
  form: UseFormReturn<CalibrationWizardFormValues>;
}

export function HarvestHistoryStep({ form }: HarvestHistoryStepProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'harvests',
  });

  const canAddRow = fields.length < 5;
  const canRemoveRow = fields.length > 3;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">Renseignez entre 3 et 5 annees de recolte.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAddRow}
          onClick={() => append({ year: new Date().getFullYear(), yield_value: 0, unit: 't_ha', quality_grade: '', observation: '' })}
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/60">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Annee</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Rendement</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Unite</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Qualite</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Observation</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {fields.map((field, index) => (
              <tr key={field.id}>
                <td className="p-2 align-top">
                  <Input
                    type="number"
                    min={1900}
                    max={2100}
                    {...register(`harvests.${index}.year`, { valueAsNumber: true })}
                    invalid={!!errors.harvests?.[index]?.year}
                  />
                </td>
                <td className="p-2 align-top">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...register(`harvests.${index}.yield_value`, { valueAsNumber: true })}
                    invalid={!!errors.harvests?.[index]?.yield_value}
                  />
                </td>
                <td className="p-2 align-top">
                  <Select {...register(`harvests.${index}.unit`)}>
                    <option value="t_ha">t/ha</option>
                    <option value="kg_total">kg total</option>
                  </Select>
                </td>
                <td className="p-2 align-top">
                  <Input {...register(`harvests.${index}.quality_grade`)} />
                </td>
                <td className="p-2 align-top">
                  <Input {...register(`harvests.${index}.observation`)} />
                </td>
                <td className="p-2 align-top text-right">
                  <Button type="button" size="icon" variant="ghost" disabled={!canRemoveRow} onClick={() => remove(index)}>
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {typeof errors.harvests?.message === 'string' && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.harvests.message}</p>
      )}

      <FormField label="Regularite percue" htmlFor="harvest_regularity" error={errors.harvest_regularity?.message}>
        <Select id="harvest_regularity" {...register('harvest_regularity')}>
          <option value="">Non precise</option>
          <option value="stable">Stable</option>
          <option value="marked_alternance">Alternance marquee</option>
          <option value="very_irregular">Tres irreguliere</option>
        </Select>
      </FormField>
    </div>
  );
}
