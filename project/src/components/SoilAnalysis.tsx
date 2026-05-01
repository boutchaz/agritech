import {  useEffect, useMemo  } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { useFormErrors } from '@/hooks/useFormErrors';
import { Button } from '@/components/ui/button';

interface SoilAnalysisProps {
  onSave: (data: SoilAnalysisData) => void | Promise<void>;
  onCancel: () => void;
  initialData?: SoilAnalysisData;
}

interface SoilAnalysisData {
  physical: {
    texture: string;
    ph: number;
    organicMatter: number;
    density: number;
    waterRetention: number;
  };
  chemical: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    calcium: number;
    magnesium: number;
    sulfur: number;
    iron: number;
    manganese: number;
    zinc: number;
    copper: number;
    boron: number;
  };
  biological: {
    microorganisms: number;
    earthworms: number;
    organicActivity: number;
  };
}

const createSoilAnalysisSchema = (t: (key: string, fallback: string) => string) => z.object({
  physical: z.object({
    texture: z.string().min(1, t('soilAnalysis.validation.textureRequired', 'Texture is required')),
    ph: z.number().min(0).max(14),
    organicMatter: z.number().min(0).max(100),
    density: z.number().min(0),
    waterRetention: z.number().min(0).max(100),
  }),
  chemical: z.object({
    nitrogen: z.number().min(0),
    phosphorus: z.number().min(0),
    potassium: z.number().min(0),
    calcium: z.number().min(0),
    magnesium: z.number().min(0),
    sulfur: z.number().min(0),
    iron: z.number().min(0),
    manganese: z.number().min(0),
    zinc: z.number().min(0),
    copper: z.number().min(0),
    boron: z.number().min(0),
  }),
  biological: z.object({
    microorganisms: z.number().min(0),
    earthworms: z.number().min(0),
    organicActivity: z.number().min(0).max(100),
  }),
});

type SoilAnalysisFormData = z.infer<ReturnType<typeof createSoilAnalysisSchema>>;

const SoilAnalysis = ({ onSave, onCancel, initialData }: SoilAnalysisProps) => {
  const { t } = useTranslation();
  const { handleFormError } = useFormErrors<SoilAnalysisFormData>();
  const soilAnalysisSchema = useMemo(() => createSoilAnalysisSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SoilAnalysisFormData>({
    resolver: zodResolver(soilAnalysisSchema),
    defaultValues: {
      physical: {
        texture: '',
        ph: 7.0,
        organicMatter: 0,
        density: 0,
        waterRetention: 0,
      },
      chemical: {
        nitrogen: 0,
        phosphorus: 0,
        potassium: 0,
        calcium: 0,
        magnesium: 0,
        sulfur: 0,
        iron: 0,
        manganese: 0,
        zinc: 0,
        copper: 0,
        boron: 0,
      },
      biological: {
        microorganisms: 0,
        earthworms: 0,
        organicActivity: 0,
      },
    },
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const onSubmit = async (formData: SoilAnalysisFormData) => {
    try {
      await onSave(formData);
    } catch (error: unknown) {
      handleFormError(error, setError, {
        toastMessage: t('soilAnalysis.validation.saveError', 'Failed to save soil analysis'),
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{t('soilAnalysis.title', 'Soil Analysis')}</h3>
        <Button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
         {/* Physical Properties */}
         <div>
            <h4 className="font-medium mb-4">{t('soilAnalysis.physicalProperties', 'Physical properties')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={t('soilAnalysis.textureLabel', 'Soil texture')} htmlFor="physical.texture" required>
                <Select
                  id="physical.texture"
                  {...register('physical.texture')}
                  invalid={!!errors.physical?.texture}
                >
                  <option value="">{t('soilAnalysis.selectPlaceholder', 'Select...')}</option>
                  <option value="Sableuse">{t('soilAnalysis.textureOptions.sandy', 'Sandy')}</option>
                  <option value="Limoneuse">{t('soilAnalysis.textureOptions.silty', 'Silty')}</option>
                  <option value="Argileuse">{t('soilAnalysis.textureOptions.clayey', 'Clayey')}</option>
                  <option value="Limono-sableuse">{t('soilAnalysis.textureOptions.sandySilty', 'Sandy silty')}</option>
                  <option value="Argilo-limoneuse">{t('soilAnalysis.textureOptions.siltyClay', 'Silty clay')}</option>
                </Select>
               {errors.physical?.texture && (
                 <p className="text-red-600 text-sm mt-1">{errors.physical.texture.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.phLabel', 'pH')} htmlFor="physical.ph" required>
               <Input
                 id="physical.ph"
                 type="number"
                 step="1"
                 min={0}
                 max={14}
                 {...register('physical.ph', { valueAsNumber: true })}
                 invalid={!!errors.physical?.ph}
               />
               {errors.physical?.ph && (
                 <p className="text-red-600 text-sm mt-1">{errors.physical.ph.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.organicMatterLabel', 'Organic matter (%)')} htmlFor="physical.organicMatter" required>
               <Input
                 id="physical.organicMatter"
                 type="number"
                 step="1"
                 min={0}
                 max={100}
                 {...register('physical.organicMatter', { valueAsNumber: true })}
                 invalid={!!errors.physical?.organicMatter}
               />
               {errors.physical?.organicMatter && (
                 <p className="text-red-600 text-sm mt-1">{errors.physical.organicMatter.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.densityLabel', 'Bulk density (g/cm³)')} htmlFor="physical.density" required>
               <Input
                 id="physical.density"
                 type="number"
                 step={1}
                 min={0}
                 {...register('physical.density', { valueAsNumber: true })}
                 invalid={!!errors.physical?.density}
               />
               {errors.physical?.density && (
                 <p className="text-red-600 text-sm mt-1">{errors.physical.density.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.waterRetentionLabel', 'Water retention (%)')} htmlFor="physical.waterRetention" required>
               <Input
                 id="physical.waterRetention"
                 type="number"
                 step="1"
                 min={0}
                 max={100}
                 {...register('physical.waterRetention', { valueAsNumber: true })}
                 invalid={!!errors.physical?.waterRetention}
               />
               {errors.physical?.waterRetention && (
                 <p className="text-red-600 text-sm mt-1">{errors.physical.waterRetention.message}</p>
               )}
             </FormField>
           </div>
         </div>

         {/* Chemical Properties */}
         <div>
            <h4 className="font-medium mb-4">{t('soilAnalysis.chemicalProperties', 'Chemical properties (mg/kg)')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label={t('soilAnalysis.nitrogenLabel', 'Nitrogen (N)')} htmlFor="chemical.nitrogen" required>
               <Input
                 id="chemical.nitrogen"
                 type="number"
                 step="1"
                 min={0}
                 {...register('chemical.nitrogen', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.nitrogen}
               />
               {errors.chemical?.nitrogen && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.nitrogen.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.phosphorusLabel', 'Phosphorus (P)')} htmlFor="chemical.phosphorus" required>
               <Input
                 id="chemical.phosphorus"
                 type="number"
                 step="1"
                 min={0}
                 {...register('chemical.phosphorus', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.phosphorus}
               />
               {errors.chemical?.phosphorus && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.phosphorus.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.potassiumLabel', 'Potassium (K)')} htmlFor="chemical.potassium" required>
               <Input
                 id="chemical.potassium"
                 type="number"
                 step="1"
                 min={0}
                 {...register('chemical.potassium', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.potassium}
               />
               {errors.chemical?.potassium && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.potassium.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.calciumLabel', 'Calcium (Ca)')} htmlFor="chemical.calcium" required>
               <Input
                 id="chemical.calcium"
                 type="number"
                 step={0.1}
                 min={0}
                 {...register('chemical.calcium', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.calcium}
               />
               {errors.chemical?.calcium && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.calcium.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.magnesiumLabel', 'Magnesium (Mg)')} htmlFor="chemical.magnesium" required>
               <Input
                 id="chemical.magnesium"
                 type="number"
                 step={0.1}
                 min={0}
                 {...register('chemical.magnesium', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.magnesium}
               />
               {errors.chemical?.magnesium && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.magnesium.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.sulfurLabel', 'Sulfur (S)')} htmlFor="chemical.sulfur" required>
               <Input
                 id="chemical.sulfur"
                 type="number"
                 step={0.1}
                 min={0}
                 {...register('chemical.sulfur', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.sulfur}
               />
               {errors.chemical?.sulfur && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.sulfur.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.ironLabel', 'Iron (Fe)')} htmlFor="chemical.iron" required>
               <Input
                 id="chemical.iron"
                 type="number"
                 step={0.1}
                 min={0}
                 {...register('chemical.iron', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.iron}
               />
               {errors.chemical?.iron && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.iron.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.manganeseLabel', 'Manganese (Mn)')} htmlFor="chemical.manganese" required>
               <Input
                 id="chemical.manganese"
                 type="number"
                 step={0.1}
                 min={0}
                 {...register('chemical.manganese', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.manganese}
               />
               {errors.chemical?.manganese && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.manganese.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.zincLabel', 'Zinc (Zn)')} htmlFor="chemical.zinc" required>
               <Input
                 id="chemical.zinc"
                 type="number"
                 step={0.1}
                 min={0}
                 {...register('chemical.zinc', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.zinc}
               />
               {errors.chemical?.zinc && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.zinc.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.copperLabel', 'Copper (Cu)')} htmlFor="chemical.copper" required>
               <Input
                 id="chemical.copper"
                 type="number"
                 step={0.1}
                 min={0}
                 {...register('chemical.copper', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.copper}
               />
               {errors.chemical?.copper && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.copper.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.boronLabel', 'Boron (B)')} htmlFor="chemical.boron" required>
               <Input
                 id="chemical.boron"
                 type="number"
                 step={0.1}
                 min={0}
                 {...register('chemical.boron', { valueAsNumber: true })}
                 invalid={!!errors.chemical?.boron}
               />
               {errors.chemical?.boron && (
                 <p className="text-red-600 text-sm mt-1">{errors.chemical.boron.message}</p>
               )}
             </FormField>
           </div>
         </div>

         {/* Biological Properties */}
         <div>
            <h4 className="font-medium mb-4">{t('soilAnalysis.biologicalProperties', 'Biological properties')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label={t('soilAnalysis.microorganismsLabel', 'Microorganisms (CFU/g)')} htmlFor="biological.microorganisms" required>
               <Input
                 id="biological.microorganisms"
                 type="number"
                 step={1000}
                 min={0}
                 {...register('biological.microorganisms', { valueAsNumber: true })}
                 invalid={!!errors.biological?.microorganisms}
               />
               {errors.biological?.microorganisms && (
                 <p className="text-red-600 text-sm mt-1">{errors.biological.microorganisms.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.earthwormsLabel', 'Earthworms (count/m²)')} htmlFor="biological.earthworms" required>
               <Input
                 id="biological.earthworms"
                 type="number"
                 step={1}
                 min={0}
                 {...register('biological.earthworms', { valueAsNumber: true })}
                 invalid={!!errors.biological?.earthworms}
               />
               {errors.biological?.earthworms && (
                 <p className="text-red-600 text-sm mt-1">{errors.biological.earthworms.message}</p>
               )}
             </FormField>

              <FormField label={t('soilAnalysis.organicActivityLabel', 'Organic activity (%)')} htmlFor="biological.organicActivity" required>
               <Input
                 id="biological.organicActivity"
                 type="number"
                 step={0.1}
                 min={0}
                 max={100}
                 {...register('biological.organicActivity', { valueAsNumber: true })}
                 invalid={!!errors.biological?.organicActivity}
               />
               {errors.biological?.organicActivity && (
                 <p className="text-red-600 text-sm mt-1">{errors.biological.organicActivity.message}</p>
               )}
             </FormField>
           </div>
         </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            {t('soilAnalysis.cancel', 'Cancel')}
          </Button>
          <Button variant="green" type="submit" className="px-4 py-2 rounded-md flex items-center space-x-2" >
            <Save className="h-4 w-4" />
            <span>{t('soilAnalysis.save', 'Save')}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SoilAnalysis;
