import {  useState, useEffect, useMemo  } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SoilAnalysis } from '../types';
import { useFormErrors } from '@/hooks/useFormErrors';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from '@/components/ui/button';

interface Parcel {
  id: string;
  name: string;
  soil_type?: string | null;
}

interface SoilAnalysisFormProps {
  onSave: (data: SoilAnalysis) => void | Promise<void>;
  onCancel: () => void;
  initialData?: SoilAnalysis;
  selectedParcel?: Parcel | null;
}

const createSoilAnalysisSchema = (t: (key: string, fallback: string) => string) => z.object({
  texture: z.string().min(1, t('soilAnalysisForm.validation.textureRequired', 'Soil texture is required')),
  ph: z.number().min(0).max(14),
  organicMatter: z.number().min(0),
  soilType: z.string().optional(),
  nitrogen: z.number().min(0),
  phosphorus: z.number().min(0),
  potassium: z.number().min(0),
  microbialActivity: z.enum(['low', 'medium', 'high']),
  earthwormCount: z.number().min(0),
});

type SoilAnalysisFormData = z.infer<ReturnType<typeof createSoilAnalysisSchema>>;

const SoilAnalysisForm = ({ onSave, onCancel, initialData, selectedParcel }: SoilAnalysisFormProps) => {
  const [testType, setTestType] = useState('basic');
  const { t } = useTranslation();
  const { handleFormError } = useFormErrors<SoilAnalysisFormData>();
  const soilAnalysisSchema = useMemo(() => createSoilAnalysisSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SoilAnalysisFormData>({
    resolver: zodResolver(soilAnalysisSchema),
    defaultValues: {
      texture: initialData?.physical.texture || '',
      ph: initialData?.physical.ph || 7.0,
      organicMatter: initialData?.physical.organicMatter || 0,
      soilType: initialData?.physical.soilType || selectedParcel?.soil_type || '',
      nitrogen: initialData?.chemical.nitrogen || 0,
      phosphorus: initialData?.chemical.phosphorus || 0,
      potassium: initialData?.chemical.potassium || 0,
      microbialActivity: (initialData?.biological.microbialActivity as 'low' | 'medium' | 'high') || 'medium',
      earthwormCount: initialData?.biological.earthwormCount || 0,
    },
  });

  useEffect(() => {
    reset({
      texture: initialData?.physical.texture || '',
      ph: initialData?.physical.ph || 7.0,
      organicMatter: initialData?.physical.organicMatter || 0,
      soilType: initialData?.physical.soilType || selectedParcel?.soil_type || '',
      nitrogen: initialData?.chemical.nitrogen || 0,
      phosphorus: initialData?.chemical.phosphorus || 0,
      potassium: initialData?.chemical.potassium || 0,
      microbialActivity: (initialData?.biological.microbialActivity as 'low' | 'medium' | 'high') || 'medium',
      earthwormCount: initialData?.biological.earthwormCount || 0,
    });
  }, [initialData, selectedParcel, reset]);

  const onSubmit = async (formData: SoilAnalysisFormData) => {
    try {
      const soilAnalysis: SoilAnalysis = {
        physical: {
          texture: formData.texture,
          ph: formData.ph,
          organicMatter: formData.organicMatter,
          soilType: formData.soilType || '',
        },
        chemical: {
          nitrogen: formData.nitrogen,
          phosphorus: formData.phosphorus,
          potassium: formData.potassium,
        },
        biological: {
          microbialActivity: formData.microbialActivity,
          earthwormCount: formData.earthwormCount,
        },
        recommendations: [],
      };
      await onSave(soilAnalysis);
    } catch (error: unknown) {
      handleFormError(error, setError, {
        toastMessage: t('soilAnalysisForm.validation.saveError', 'Failed to save soil analysis'),
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{t('soilAnalysisForm.titleDetailed', 'Soil Analysis')}</h3>
        <Button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Parcel Information */}
        {selectedParcel && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              {t('soilAnalysisForm.parcelInfoTitle', 'Selected parcel')}
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>{selectedParcel.name}</strong>
              {selectedParcel.soil_type && (
                <span> - {t('soilAnalysisForm.parcelSoilType', 'Soil type')}: {selectedParcel.soil_type}</span>
              )}
            </p>
          </div>
        )}

        {/* Test Type Selection */}
        <FormField label={t('soilAnalysisForm.testTypeLabel', 'Test type')} htmlFor="testType">
          <Select
            id="testType"
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
          >
            <option value="basic">{t('soilAnalysisForm.testTypes.basic', 'Basic analysis')}</option>
            <option value="complete">{t('soilAnalysisForm.testTypes.complete', 'Complete analysis')}</option>
            <option value="specialized">{t('soilAnalysisForm.testTypes.specialized', 'Specialized orchard analysis')}</option>
          </Select>
        </FormField>

        {/* Physical Properties */}
        <div>
          <h4 className="font-medium mb-4">{t('soilAnalysisForm.physicalProperties', 'Physical properties')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormField
                label={
                  <>
                    {t('soilAnalysisForm.soilTypeLabel', 'Soil type')}
                    {selectedParcel?.soil_type && (
                      <span className="text-sm text-blue-600 dark:text-blue-400 ml-1">({t('soilAnalysisForm.soilTypeFromParcel', 'from parcel')})</span>
                    )}
                  </>
                }
                htmlFor="soilType"
              >
                <Input
                  id="soilType"
                  type="text"
                  {...register('soilType')}
                  invalid={!!errors.soilType}
                  placeholder={t('soilAnalysisForm.soilTypePlaceholder', 'E.g. calcareous, carbonate soils...')}
                  className={selectedParcel?.soil_type ? 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : ''}
                  readOnly={!!selectedParcel?.soil_type}
                />
              </FormField>
              {errors.soilType && (
                <p className="text-red-600 text-sm mt-1">{errors.soilType.message}</p>
              )}
            </div>

            <div>
              <FormField label={t('soilAnalysisForm.textureLabel', 'Soil texture')} htmlFor="texture">
                <Select
                  id="texture"
                  {...register('texture')}
                  invalid={!!errors.texture}
                >
                  <option value="">{t('soilAnalysisForm.selectPlaceholder', 'Select...')}</option>
                  <option value="Limoneuse">{t('soilAnalysisForm.textureOptions.silty', 'Silty')}</option>
                  <option value="Argileuse">{t('soilAnalysisForm.textureOptions.clayey', 'Clayey')}</option>
                  <option value="Sableuse">{t('soilAnalysisForm.textureOptions.sandy', 'Sandy')}</option>
                  <option value="Argilo-limoneuse">{t('soilAnalysisForm.textureOptions.siltyClay', 'Silty clay')}</option>
                  <option value="Limono-sableuse">{t('soilAnalysisForm.textureOptions.sandySilty', 'Sandy silty')}</option>
                  <option value="Argilo-sableuse">{t('soilAnalysisForm.textureOptions.sandyClay', 'Sandy clay')}</option>
                </Select>
              </FormField>
              {errors.texture && (
                <p className="text-red-600 text-sm mt-1">{errors.texture.message}</p>
              )}
            </div>

            <div>
              <FormField label={t('soilAnalysisForm.phLabel', 'pH')} htmlFor="ph">
                <Input
                  id="ph"
                  type="number"
                  step="0.1"
                  min={0}
                  max={14}
                  {...register('ph', { valueAsNumber: true })}
                  invalid={!!errors.ph}
                />
              </FormField>
              {errors.ph && (
                <p className="text-red-600 text-sm mt-1">{errors.ph.message}</p>
              )}
            </div>

            <div>
              <FormField label={t('soilAnalysisForm.moistureLabel', 'Moisture (%)')} htmlFor="organicMatter">
                <Input
                  id="organicMatter"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  {...register('organicMatter', { valueAsNumber: true })}
                  invalid={!!errors.organicMatter}
                />
              </FormField>
              {errors.organicMatter && (
                <p className="text-red-600 text-sm mt-1">{errors.organicMatter.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Chemical Properties */}
        <div>
          <h4 className="font-medium mb-4">{t('soilAnalysisForm.chemicalProperties', 'Chemical properties')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FormField label={t('soilAnalysisForm.phosphorusLabel', 'Available phosphorus (mg/kg P2O5)')} htmlFor="phosphorus">
                <Input
                  id="phosphorus"
                  type="number"
                  step="0.1"
                  min={0}
                  {...register('phosphorus', { valueAsNumber: true })}
                  invalid={!!errors.phosphorus}
                />
              </FormField>
              {errors.phosphorus && (
                <p className="text-red-600 text-sm mt-1">{errors.phosphorus.message}</p>
              )}
            </div>

            <div>
              <FormField label={t('soilAnalysisForm.potassiumLabel', 'Potassium (mg/kg K2O)')} htmlFor="potassium">
                <Input
                  id="potassium"
                  type="number"
                  step="0.1"
                  min={0}
                  {...register('potassium', { valueAsNumber: true })}
                  invalid={!!errors.potassium}
                />
              </FormField>
              {errors.potassium && (
                <p className="text-red-600 text-sm mt-1">{errors.potassium.message}</p>
              )}
            </div>

            {testType !== 'basic' && (
              <div>
                <FormField label={t('soilAnalysisForm.nitrogenLabel', 'Total nitrogen (g/kg N)')} htmlFor="nitrogen">
                  <Input
                    id="nitrogen"
                    type="number"
                    step="0.1"
                    min={0}
                    {...register('nitrogen', { valueAsNumber: true })}
                    invalid={!!errors.nitrogen}
                  />
                </FormField>
                {errors.nitrogen && (
                  <p className="text-red-600 text-sm mt-1">{errors.nitrogen.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Biological Properties */}
        <div>
          <h4 className="font-medium mb-4">{t('soilAnalysisForm.biologicalProperties', 'Biological properties')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormField label={t('soilAnalysisForm.microbialActivityLabel', 'Microbial activity')} htmlFor="microbialActivity">
                <Select
                  id="microbialActivity"
                  {...register('microbialActivity')}
                  invalid={!!errors.microbialActivity}
                >
                  <option value="low">{t('soilAnalysisForm.microbialActivityOptions.low', 'Low')}</option>
                  <option value="medium">{t('soilAnalysisForm.microbialActivityOptions.medium', 'Medium')}</option>
                  <option value="high">{t('soilAnalysisForm.microbialActivityOptions.high', 'High')}</option>
                </Select>
              </FormField>
              {errors.microbialActivity && (
                <p className="text-red-600 text-sm mt-1">{errors.microbialActivity.message}</p>
              )}
            </div>

            <div>
              <FormField label={t('soilAnalysisForm.earthwormCountLabel', 'Earthworm count (per m²)')} htmlFor="earthwormCount">
                <Input
                  id="earthwormCount"
                  type="number"
                  step="1"
                  min={0}
                  {...register('earthwormCount', { valueAsNumber: true })}
                  invalid={!!errors.earthwormCount}
                />
              </FormField>
              {errors.earthwormCount && (
                <p className="text-red-600 text-sm mt-1">{errors.earthwormCount.message}</p>
              )}
            </div>
          </div>
        </div>

        {testType === 'specialized' && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              {t('soilAnalysisForm.specializedNotice', 'This analysis is specially adapted for orchards. Specific recommendations for orchard management will be generated based on the results.')}
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            {t('soilAnalysisForm.cancel', 'Cancel')}
          </Button>
          <Button variant="green" type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md disabled:bg-green-400 flex items-center space-x-2" >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('soilAnalysisForm.saving', 'Saving...')}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{t('soilAnalysisForm.save', 'Save')}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SoilAnalysisForm;
