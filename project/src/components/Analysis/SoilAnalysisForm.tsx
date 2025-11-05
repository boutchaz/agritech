import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X } from 'lucide-react';
import type { SoilAnalysisData } from '../../types/analysis';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

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

const SoilAnalysisForm: React.FC<SoilAnalysisFormProps> = ({ onSave, onCancel, selectedParcel }) => {
  const { t } = useTranslation();
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().split('T')[0]);
  const [laboratory, setLaboratory] = useState('');
  const [notes, setNotes] = useState('');

  const [formData, setFormData] = useState<SoilAnalysisData>({
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
    cec_meq_per_100g: undefined
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== undefined && v !== '')
    ) as SoilAnalysisData;

    onSave(cleanData, analysisDate, laboratory || undefined, notes || undefined);
  };

  const updateField = <K extends keyof SoilAnalysisData>(field: K, value: SoilAnalysisData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

      <form onSubmit={handleSubmit} className="space-y-6">
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
              value={analysisDate}
              onChange={(e) => setAnalysisDate(e.target.value)}
              required
            />
          </FormField>

          <FormField label={t('farmHierarchy.parcel.soil.form.laboratoryOptional')} htmlFor="laboratory">
            <Input
              id="laboratory"
              type="text"
              value={laboratory}
              onChange={(e) => setLaboratory(e.target.value)}
              placeholder={t('farmHierarchy.parcel.soil.form.laboratoryPlaceholder')}
            />
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
                step="0.1"
                min="0"
                max="14"
                value={formData.ph_level || ''}
                onChange={(e) => updateField('ph_level', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label={t('farmHierarchy.parcel.soil.form.texture')} htmlFor="texture">
              <Select
                id="texture"
                value={formData.texture || ''}
                onChange={(e) => updateField('texture', e.target.value as 'sand' | 'loamy_sand' | 'sandy_loam' | 'loam' | 'silt_loam' | 'silt' | 'sandy_clay_loam' | 'clay_loam' | 'silty_clay_loam' | 'sandy_clay' | 'silty_clay' | 'clay' | undefined)}
              >
                <option value="">{t('farmHierarchy.parcel.soil.form.selectTexture')}</option>
                <option value="sand">{t('farmHierarchy.parcel.soil.form.textures.sand')}</option>
                <option value="loamy_sand">{t('farmHierarchy.parcel.soil.form.textures.loamy_sand')}</option>
                <option value="sandy_loam">{t('farmHierarchy.parcel.soil.form.textures.sandy_loam')}</option>
                <option value="loam">{t('farmHierarchy.parcel.soil.form.textures.loam')}</option>
                <option value="silt_loam">{t('farmHierarchy.parcel.soil.form.textures.silt_loam')}</option>
                <option value="silt">{t('farmHierarchy.parcel.soil.form.textures.silt')}</option>
                <option value="clay_loam">{t('farmHierarchy.parcel.soil.form.textures.clay_loam')}</option>
                <option value="silty_clay_loam">{t('farmHierarchy.parcel.soil.form.textures.silty_clay_loam')}</option>
                <option value="sandy_clay">{t('farmHierarchy.parcel.soil.form.textures.sandy_clay')}</option>
                <option value="silty_clay">{t('farmHierarchy.parcel.soil.form.textures.silty_clay')}</option>
                <option value="clay">{t('farmHierarchy.parcel.soil.form.textures.clay')}</option>
              </Select>
            </FormField>

            <FormField label={t('farmHierarchy.parcel.soil.form.organicMatter')} htmlFor="organic_matter">
              <Input
                id="organic_matter"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.organic_matter_percentage || ''}
                onChange={(e) => updateField('organic_matter_percentage', parseFloat(e.target.value))}
              />
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
                value={formData.nitrogen_ppm || ''}
                onChange={(e) => updateField('nitrogen_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label={t('farmHierarchy.parcel.soil.form.phosphorus')} htmlFor="phosphorus">
              <Input
                id="phosphorus"
                type="number"
                step="0.1"
                min="0"
                value={formData.phosphorus_ppm || ''}
                onChange={(e) => updateField('phosphorus_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label={t('farmHierarchy.parcel.soil.form.potassium')} htmlFor="potassium">
              <Input
                id="potassium"
                type="number"
                step="0.1"
                min="0"
                value={formData.potassium_ppm || ''}
                onChange={(e) => updateField('potassium_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label={t('farmHierarchy.parcel.soil.form.calcium')} htmlFor="calcium">
              <Input
                id="calcium"
                type="number"
                step="0.1"
                min="0"
                value={formData.calcium_ppm || ''}
                onChange={(e) => updateField('calcium_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label={t('farmHierarchy.parcel.soil.form.magnesium')} htmlFor="magnesium">
              <Input
                id="magnesium"
                type="number"
                step="0.1"
                min="0"
                value={formData.magnesium_ppm || ''}
                onChange={(e) => updateField('magnesium_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label={t('farmHierarchy.parcel.soil.form.sulfur')} htmlFor="sulfur">
              <Input
                id="sulfur"
                type="number"
                step="0.1"
                min="0"
                value={formData.sulfur_ppm || ''}
                onChange={(e) => updateField('sulfur_ppm', parseFloat(e.target.value))}
              />
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
                value={formData.salinity_level || ''}
                onChange={(e) => updateField('salinity_level', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label={t('farmHierarchy.parcel.soil.form.cec')} htmlFor="cec">
              <Input
                id="cec"
                type="number"
                step="0.1"
                min="0"
                value={formData.cec_meq_per_100g || ''}
                onChange={(e) => updateField('cec_meq_per_100g', parseFloat(e.target.value))}
              />
            </FormField>
          </div>
        </div>

        {/* Notes */}
        <FormField label={t('farmHierarchy.parcel.soil.form.notesOptional')} htmlFor="notes">
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={4}
            placeholder={t('farmHierarchy.parcel.soil.form.notesPlaceholder')}
          />
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
