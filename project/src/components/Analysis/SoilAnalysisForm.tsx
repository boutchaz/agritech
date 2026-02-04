import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, ChevronDown } from 'lucide-react';
import type { SoilAnalysisData } from '../../types/analysis';
import { useFormErrors } from '@/hooks/useFormErrors';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import {
  Select as RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/radix-select';

interface Parcel {
  id: string;
  name: string;
  soil_type?: string | null;
}

interface SoilAnalysisFormProps {
  onSave: (data: SoilAnalysisData, analysisDate: string, laboratory?: string, notes?: string) => void;
  onCancel: () => void;
  selectedParcel?: Parcel | null;
}

const soilAnalysisSchema = z.object({
  ph_level: z.number().min(0).max(14).optional(),
  texture: z.string().optional(),
  organic_matter_percentage: z.number().min(0).max(100).optional(),
  nitrogen_ppm: z.number().min(0).optional(),
  phosphorus_ppm: z.number().min(0).optional(),
  potassium_ppm: z.number().min(0).optional(),
  calcium_ppm: z.number().min(0).optional(),
  magnesium_ppm: z.number().min(0).optional(),
  sulfur_ppm: z.number().min(0).optional(),
  salinity_level: z.number().min(0).optional(),
  cec_meq_per_100g: z.number().min(0).optional(),
  analysisDate: z.string().min(1, 'Analysis date is required'),
  laboratory: z.string().optional(),
  notes: z.string().optional(),
});

type SoilAnalysisFormData = z.infer<typeof soilAnalysisSchema>;

const SoilAnalysisForm: React.FC<SoilAnalysisFormProps> = ({ onSave, onCancel, selectedParcel }) => {
  const { t } = useTranslation();
  const { handleFormError } = useFormErrors<SoilAnalysisFormData>();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<SoilAnalysisFormData>({
    resolver: zodResolver(soilAnalysisSchema),
    defaultValues: {
      ph_level: 7.0,
      texture: undefined,
      organic_matter_percentage: undefined,
      nitrogen_ppm: undefined,
      phosphorus_ppm: undefined,
      potassium_ppm: undefined,
      calcium_ppm: undefined,
      magnesium_ppm: undefined,
      sulfur_ppm: undefined,
      salinity_level: undefined,
      cec_meq_per_100g: undefined,
      analysisDate: new Date().toISOString().split('T')[0],
      laboratory: '',
      notes: '',
    },
  });

  useEffect(() => {
    reset({
      ph_level: 7.0,
      texture: undefined,
      organic_matter_percentage: undefined,
      nitrogen_ppm: undefined,
      phosphorus_ppm: undefined,
      potassium_ppm: undefined,
      calcium_ppm: undefined,
      magnesium_ppm: undefined,
      sulfur_ppm: undefined,
      salinity_level: undefined,
      cec_meq_per_100g: undefined,
      analysisDate: new Date().toISOString().split('T')[0],
      laboratory: '',
      notes: '',
    });
  }, [selectedParcel, reset]);

  const onSubmit = async (formData: SoilAnalysisFormData) => {
    try {
      const cleanData: SoilAnalysisData = {
        ph_level: formData.ph_level,
        texture: formData.texture as 'sand' | 'loamy_sand' | 'sandy_loam' | 'loam' | 'silt_loam' | 'silt' | 'sandy_clay_loam' | 'clay_loam' | 'silty_clay_loam' | 'sandy_clay' | 'silty_clay' | 'clay' | undefined,
        organic_matter_percentage: formData.organic_matter_percentage,
        nitrogen_ppm: formData.nitrogen_ppm,
        phosphorus_ppm: formData.phosphorus_ppm,
        potassium_ppm: formData.potassium_ppm,
        calcium_ppm: formData.calcium_ppm,
        magnesium_ppm: formData.magnesium_ppm,
        sulfur_ppm: formData.sulfur_ppm,
        salinity_level: formData.salinity_level,
        cec_meq_per_100g: formData.cec_meq_per_100g,
      };

      onSave(cleanData, formData.analysisDate, formData.laboratory || undefined, formData.notes || undefined);
    } catch (error: unknown) {
      handleFormError(error, setError, {
        toastMessage: t('farmHierarchy.parcel.soil.form.saveFailed'),
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{t('farmHierarchy.parcel.soil.form.title')}</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
         {/* Parcel Information */}
         {selectedParcel && (
           <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
             <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
               {t('farmHierarchy.parcel.soil.form.selectedParcel')}
             </h4>
             <p className="text-sm text-blue-800 dark:text-blue-200">
               <strong>{selectedParcel.name}</strong>
               {selectedParcel.soil_type && (
                 <span> - {t('farmHierarchy.parcel.soil.soilType')}: {selectedParcel.soil_type}</span>
               )}
             </p>
           </div>
         )}

         {/* General Information */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField label={t('farmHierarchy.parcel.soil.form.analysisDate')} htmlFor="analysisDate">
             <Input
               id="analysisDate"
               type="date"
               {...register('analysisDate')}
               invalid={!!errors.analysisDate}
             />
             {errors.analysisDate && (
               <p className="text-red-600 text-sm mt-1">{errors.analysisDate.message}</p>
             )}
           </FormField>

           <FormField label={t('farmHierarchy.parcel.soil.form.laboratoryOptional')} htmlFor="laboratory">
             <Input
               id="laboratory"
               type="text"
               {...register('laboratory')}
               invalid={!!errors.laboratory}
               placeholder={t('farmHierarchy.parcel.soil.form.laboratoryPlaceholder')}
             />
             {errors.laboratory && (
               <p className="text-red-600 text-sm mt-1">{errors.laboratory.message}</p>
             )}
           </FormField>
         </div>

         {/* Physical Properties */}
         <div>
           <h4 className="font-medium mb-4">{t('farmHierarchy.parcel.soil.form.physicalProperties')}</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField label={t('farmHierarchy.parcel.soil.form.ph')} htmlFor="ph_level">
               <Input
                 id="ph_level"
                 type="number"
                 step="0.01"
                 min="0"
                 max="14"
                 {...register('ph_level', { valueAsNumber: true })}
                 invalid={!!errors.ph_level}
               />
               {errors.ph_level && (
                 <p className="text-red-600 text-sm mt-1">{errors.ph_level.message}</p>
               )}
             </FormField>

             <FormField label={t('farmHierarchy.parcel.soil.form.texture')} htmlFor="texture">
               <RadixSelect
                 value={watch('texture') || ''}
                 onValueChange={(value) => {
                   const field = register('texture');
                   field.onChange({ target: { value } });
                 }}
               >
                 <SelectTrigger className="w-full">
                   <SelectValue placeholder={t('farmHierarchy.parcel.soil.form.selectTexture')} />
                   <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="sand">{t('farmHierarchy.parcel.soil.form.textures.sand')}</SelectItem>
                   <SelectItem value="loamy_sand">{t('farmHierarchy.parcel.soil.form.textures.loamy_sand')}</SelectItem>
                   <SelectItem value="sandy_loam">{t('farmHierarchy.parcel.soil.form.textures.sandy_loam')}</SelectItem>
                   <SelectItem value="loam">{t('farmHierarchy.parcel.soil.form.textures.loam')}</SelectItem>
                   <SelectItem value="silt_loam">{t('farmHierarchy.parcel.soil.form.textures.silt_loam')}</SelectItem>
                   <SelectItem value="silt">{t('farmHierarchy.parcel.soil.form.textures.silt')}</SelectItem>
                   <SelectItem value="clay_loam">{t('farmHierarchy.parcel.soil.form.textures.clay_loam')}</SelectItem>
                   <SelectItem value="silty_clay_loam">{t('farmHierarchy.parcel.soil.form.textures.silty_clay_loam')}</SelectItem>
                   <SelectItem value="sandy_clay">{t('farmHierarchy.parcel.soil.form.textures.sandy_clay')}</SelectItem>
                   <SelectItem value="silty_clay">{t('farmHierarchy.parcel.soil.form.textures.silty_clay')}</SelectItem>
                   <SelectItem value="clay">{t('farmHierarchy.parcel.soil.form.textures.clay')}</SelectItem>
                 </SelectContent>
               </RadixSelect>
               {errors.texture && (
                 <p className="text-red-600 text-sm mt-1">{errors.texture.message}</p>
               )}
             </FormField>

             <FormField label={t('farmHierarchy.parcel.soil.form.organicMatter')} htmlFor="organic_matter">
               <Input
                 id="organic_matter"
                 type="number"
                 step="0.1"
                 min="0"
                 max="100"
                 {...register('organic_matter_percentage', { valueAsNumber: true })}
                 invalid={!!errors.organic_matter_percentage}
               />
               {errors.organic_matter_percentage && (
                 <p className="text-red-600 text-sm mt-1">{errors.organic_matter_percentage.message}</p>
               )}
             </FormField>
           </div>
         </div>

         {/* Chemical Properties - Macronutrients */}
         <div>
           <h4 className="font-medium mb-4">{t('farmHierarchy.parcel.soil.form.macronutrients')}</h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <FormField label={t('farmHierarchy.parcel.soil.form.nitrogen')} htmlFor="nitrogen">
               <Input
                 id="nitrogen"
                 type="number"
                 step="0.1"
                 min="0"
                 {...register('nitrogen_ppm', { valueAsNumber: true })}
                 invalid={!!errors.nitrogen_ppm}
               />
               {errors.nitrogen_ppm && (
                 <p className="text-red-600 text-sm mt-1">{errors.nitrogen_ppm.message}</p>
               )}
             </FormField>

             <FormField label={t('farmHierarchy.parcel.soil.form.phosphorus')} htmlFor="phosphorus">
               <Input
                 id="phosphorus"
                 type="number"
                 step="0.1"
                 min="0"
                 {...register('phosphorus_ppm', { valueAsNumber: true })}
                 invalid={!!errors.phosphorus_ppm}
               />
               {errors.phosphorus_ppm && (
                 <p className="text-red-600 text-sm mt-1">{errors.phosphorus_ppm.message}</p>
               )}
             </FormField>

             <FormField label={t('farmHierarchy.parcel.soil.form.potassium')} htmlFor="potassium">
               <Input
                 id="potassium"
                 type="number"
                 step="0.1"
                 min="0"
                 {...register('potassium_ppm', { valueAsNumber: true })}
                 invalid={!!errors.potassium_ppm}
               />
               {errors.potassium_ppm && (
                 <p className="text-red-600 text-sm mt-1">{errors.potassium_ppm.message}</p>
               )}
             </FormField>

             <FormField label={t('farmHierarchy.parcel.soil.form.calcium')} htmlFor="calcium">
               <Input
                 id="calcium"
                 type="number"
                 step="0.1"
                 min="0"
                 {...register('calcium_ppm', { valueAsNumber: true })}
                 invalid={!!errors.calcium_ppm}
               />
               {errors.calcium_ppm && (
                 <p className="text-red-600 text-sm mt-1">{errors.calcium_ppm.message}</p>
               )}
             </FormField>

             <FormField label={t('farmHierarchy.parcel.soil.form.magnesium')} htmlFor="magnesium">
               <Input
                 id="magnesium"
                 type="number"
                 step="0.1"
                 min="0"
                 {...register('magnesium_ppm', { valueAsNumber: true })}
                 invalid={!!errors.magnesium_ppm}
               />
               {errors.magnesium_ppm && (
                 <p className="text-red-600 text-sm mt-1">{errors.magnesium_ppm.message}</p>
               )}
             </FormField>

             <FormField label={t('farmHierarchy.parcel.soil.form.sulfur')} htmlFor="sulfur">
               <Input
                 id="sulfur"
                 type="number"
                 step="0.1"
                 min="0"
                 {...register('sulfur_ppm', { valueAsNumber: true })}
                 invalid={!!errors.sulfur_ppm}
               />
               {errors.sulfur_ppm && (
                 <p className="text-red-600 text-sm mt-1">{errors.sulfur_ppm.message}</p>
               )}
             </FormField>
           </div>
         </div>

         {/* Soil Health Indicators */}
         <div>
           <h4 className="font-medium mb-4">{t('farmHierarchy.parcel.soil.form.soilHealth')}</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField label={t('farmHierarchy.parcel.soil.form.salinity')} htmlFor="salinity">
               <Input
                 id="salinity"
                 type="number"
                 step="0.1"
                 min="0"
                 {...register('salinity_level', { valueAsNumber: true })}
                 invalid={!!errors.salinity_level}
               />
               {errors.salinity_level && (
                 <p className="text-red-600 text-sm mt-1">{errors.salinity_level.message}</p>
               )}
             </FormField>

             <FormField label={t('farmHierarchy.parcel.soil.form.cec')} htmlFor="cec">
               <Input
                 id="cec"
                 type="number"
                 step="0.1"
                 min="0"
                 {...register('cec_meq_per_100g', { valueAsNumber: true })}
                 invalid={!!errors.cec_meq_per_100g}
               />
               {errors.cec_meq_per_100g && (
                 <p className="text-red-600 text-sm mt-1">{errors.cec_meq_per_100g.message}</p>
               )}
             </FormField>
           </div>
         </div>

         {/* Notes */}
         <FormField label={t('farmHierarchy.parcel.soil.form.notesOptional')} htmlFor="notes">
           <textarea
             id="notes"
             {...register('notes')}
             className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
               errors.notes ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
             }`}
             rows={4}
             placeholder={t('farmHierarchy.parcel.soil.form.notesPlaceholder')}
           />
           {errors.notes && (
             <p className="text-red-600 text-sm mt-1">{errors.notes.message}</p>
           )}
         </FormField>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('farmHierarchy.parcel.soil.form.cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{t('farmHierarchy.parcel.soil.form.save')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SoilAnalysisForm;
