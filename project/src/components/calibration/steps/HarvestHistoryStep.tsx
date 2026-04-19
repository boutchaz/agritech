import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CalibrationWizardFormValues } from '@/schemas/calibrationWizardSchema';

function emptySelectToUndefined(value: string) {
  return value === '' ? undefined : value;
}

interface HarvestHistoryStepProps {
  form: UseFormReturn<CalibrationWizardFormValues>;
}

export function HarvestHistoryStep({ form }: HarvestHistoryStepProps) {
  const { t } = useTranslation();
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">Renseignez entre 3 et 5 annees de recolte.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAddRow}
          onClick={() => append({ year: new Date().getFullYear() - 1, yield_value: 0, unit: 't_ha', quality_grade: '', observation: '' })}
          className="self-start"
        >
          <Plus className="w-4 h-4" />
          {t('harvestHistoryStep.add')}
        </Button>
      </div>

      <div className="-mx-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 px-3 sm:mx-0 sm:px-0">
        <Table className="min-w-[540px] w-full divide-y divide-gray-200 dark:divide-gray-700">
          <TableHeader className="bg-gray-50 dark:bg-gray-900/60">
            <TableRow>
              <TableHead className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Annee</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Rendement</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Unite</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Qualite</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Observation</TableHead>
              <TableHead className="px-3 py-2" />
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell className="p-2 align-top">
                  <Input
                    type="number"
                    min={1900}
                    max={2100}
                    {...register(`harvests.${index}.year`, { valueAsNumber: true })}
                    invalid={!!errors.harvests?.[index]?.year}
                  />
                </TableCell>
                <TableCell className="p-2 align-top">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...register(`harvests.${index}.yield_value`, { valueAsNumber: true })}
                    invalid={!!errors.harvests?.[index]?.yield_value}
                  />
                </TableCell>
                <TableCell className="p-2 align-top">
                  <Select {...register(`harvests.${index}.unit`)}>
                    <option value="t_ha">t/ha</option>
                    <option value="kg_total">kg total</option>
                  </Select>
                </TableCell>
                <TableCell className="p-2 align-top">
                  <Input {...register(`harvests.${index}.quality_grade`)} />
                </TableCell>
                <TableCell className="p-2 align-top">
                  <Input {...register(`harvests.${index}.observation`)} />
                </TableCell>
                <TableCell className="p-2 align-top text-right">
                  <Button type="button" size="icon" variant="ghost" disabled={!canRemoveRow} onClick={() => remove(index)}>
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {typeof errors.harvests?.message === 'string' && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.harvests.message}</p>
      )}

      <FormField label="Regularite percue" htmlFor="harvest_regularity" error={errors.harvest_regularity?.message}>
        <Select id="harvest_regularity" {...register('harvest_regularity', { setValueAs: emptySelectToUndefined })}>
          <option value="">Non precise</option>
          <option value="stable">Stable</option>
          <option value="marked_alternance">Alternance marquee</option>
          <option value="very_irregular">Tres irreguliere</option>
        </Select>
      </FormField>
    </div>
  );
}
