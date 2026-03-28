import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { useFormErrors } from '@/hooks/useFormErrors';
import { Button } from '@/components/ui/button';

interface SoilAnalysisProps {
  onSave: (data: SoilAnalysisData) => void;
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

const soilAnalysisSchema = z.object({
  physical: z.object({
    texture: z.string().min(1, 'Texture is required'),
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

type SoilAnalysisFormData = z.infer<typeof soilAnalysisSchema>;

const SoilAnalysis: React.FC<SoilAnalysisProps> = ({ onSave, onCancel, initialData }) => {
  const { handleFormError } = useFormErrors<SoilAnalysisFormData>();
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
      onSave(formData);
    } catch (error: unknown) {
      handleFormError(error, setError, {
        toastMessage: 'Failed to save soil analysis',
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Analyse du Sol</h3>
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
           <h4 className="font-medium mb-4">Propriétés Physiques</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField label="Texture du Sol" htmlFor="physical.texture" required>
               <Select
                 id="physical.texture"
                 {...register('physical.texture')}
                 invalid={!!errors.physical?.texture}
               >
                 <option value="">Sélectionner...</option>
                 <option value="Sableuse">Sableuse</option>
                 <option value="Limoneuse">Limoneuse</option>
                 <option value="Argileuse">Argileuse</option>
                 <option value="Limono-sableuse">Limono-sableuse</option>
                 <option value="Argilo-limoneuse">Argilo-limoneuse</option>
               </Select>
               {errors.physical?.texture && (
                 <p className="text-red-600 text-sm mt-1">{errors.physical.texture.message}</p>
               )}
             </FormField>

             <FormField label="pH" htmlFor="physical.ph" required>
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

             <FormField label="Matière Organique (%)" htmlFor="physical.organicMatter" required>
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

             <FormField label="Densité Apparente (g/cm³)" htmlFor="physical.density" required>
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

             <FormField label="Rétention d'eau (%)" htmlFor="physical.waterRetention" required>
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
           <h4 className="font-medium mb-4">Propriétés Chimiques (mg/kg)</h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <FormField label="Azote (N)" htmlFor="chemical.nitrogen" required>
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

             <FormField label="Phosphore (P)" htmlFor="chemical.phosphorus" required>
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

             <FormField label="Potassium (K)" htmlFor="chemical.potassium" required>
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

             <FormField label="Calcium (Ca)" htmlFor="chemical.calcium" required>
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

             <FormField label="Magnésium (Mg)" htmlFor="chemical.magnesium" required>
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

             <FormField label="Soufre (S)" htmlFor="chemical.sulfur" required>
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

             <FormField label="Fer (Fe)" htmlFor="chemical.iron" required>
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

             <FormField label="Manganèse (Mn)" htmlFor="chemical.manganese" required>
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

             <FormField label="Zinc (Zn)" htmlFor="chemical.zinc" required>
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

             <FormField label="Cuivre (Cu)" htmlFor="chemical.copper" required>
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

             <FormField label="Bore (B)" htmlFor="chemical.boron" required>
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
           <h4 className="font-medium mb-4">Propriétés Biologiques</h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <FormField label="Microorganismes (UFC/g)" htmlFor="biological.microorganisms" required>
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

             <FormField label="Vers de terre (nb/m²)" htmlFor="biological.earthworms" required>
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

             <FormField label="Activité Organique (%)" htmlFor="biological.organicActivity" required>
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
            Annuler
          </Button>
          <Button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Enregistrer</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SoilAnalysis;
