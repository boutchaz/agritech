import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import type { WaterAnalysisData } from '../../types/analysis';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface Parcel {
  id: string;
  name: string;
}

interface WaterAnalysisFormProps {
  onSave: (data: WaterAnalysisData, analysisDate: string, laboratory?: string, notes?: string) => void;
  onCancel: () => void;
  selectedParcel?: Parcel | null;
}

const WaterAnalysisForm: React.FC<WaterAnalysisFormProps> = ({ onSave, onCancel, selectedParcel }) => {
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().split('T')[0]);
  const [laboratory, setLaboratory] = useState('');
  const [notes, setNotes] = useState('');

  const [formData, setFormData] = useState<WaterAnalysisData>({
    water_source: 'well',
    ph_level: undefined,
    temperature_celsius: undefined,
    ec_ds_per_m: undefined,
    tds_ppm: undefined,
    calcium_ppm: undefined,
    magnesium_ppm: undefined,
    sodium_ppm: undefined,
    potassium_ppm: undefined,
    chloride_ppm: undefined,
    sulfate_ppm: undefined,
    nitrate_ppm: undefined,
    sar: undefined,
    hardness_ppm: undefined,
    irrigation_suitability: undefined
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== undefined && v !== '')
    ) as WaterAnalysisData;

    onSave(cleanData, analysisDate, laboratory || undefined, notes || undefined);
  };

  const updateField = <K extends keyof WaterAnalysisData>(field: K, value: WaterAnalysisData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Nouvelle Analyse d'Eau</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {selectedParcel && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Parcelle sélectionnée
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>{selectedParcel.name}</strong>
            </p>
          </div>
        )}

        {/* General Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Date d'analyse" htmlFor="analysisDate">
            <Input
              id="analysisDate"
              type="date"
              value={analysisDate}
              onChange={(e) => setAnalysisDate(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Laboratoire (optionnel)" htmlFor="laboratory">
            <Input
              id="laboratory"
              type="text"
              value={laboratory}
              onChange={(e) => setLaboratory(e.target.value)}
              placeholder="Nom du laboratoire"
            />
          </FormField>
        </div>

        {/* Water Source */}
        <div>
          <h4 className="font-medium mb-4">Source d'Eau</h4>
          <FormField label="Source" htmlFor="water_source" required>
            <Select
              id="water_source"
              value={formData.water_source}
              onChange={(e) => updateField('water_source', e.target.value as 'well' | 'river' | 'irrigation' | 'rainwater' | 'municipal' | 'other')}
              required
            >
              <option value="well">Puits</option>
              <option value="river">Rivière</option>
              <option value="irrigation">Irrigation</option>
              <option value="rainwater">Eau de pluie</option>
              <option value="municipal">Réseau municipal</option>
              <option value="other">Autre</option>
            </Select>
          </FormField>
        </div>

        {/* Physical Properties */}
        <div>
          <h4 className="font-medium mb-4">Propriétés Physiques</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="pH" htmlFor="ph_level">
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

            <FormField label="Température (°C)" htmlFor="temperature">
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={formData.temperature_celsius || ''}
                onChange={(e) => updateField('temperature_celsius', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Conductivité (dS/m)" htmlFor="ec">
              <Input
                id="ec"
                type="number"
                step="0.01"
                min="0"
                value={formData.ec_ds_per_m || ''}
                onChange={(e) => updateField('ec_ds_per_m', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="TDS (ppm)" htmlFor="tds">
              <Input
                id="tds"
                type="number"
                step="1"
                min="0"
                value={formData.tds_ppm || ''}
                onChange={(e) => updateField('tds_ppm', parseFloat(e.target.value))}
              />
            </FormField>
          </div>
        </div>

        {/* Major Ions */}
        <div>
          <h4 className="font-medium mb-4">Ions Majeurs (ppm)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Calcium (Ca²⁺)" htmlFor="calcium">
              <Input
                id="calcium"
                type="number"
                step="0.1"
                min="0"
                value={formData.calcium_ppm || ''}
                onChange={(e) => updateField('calcium_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Magnésium (Mg²⁺)" htmlFor="magnesium">
              <Input
                id="magnesium"
                type="number"
                step="0.1"
                min="0"
                value={formData.magnesium_ppm || ''}
                onChange={(e) => updateField('magnesium_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Sodium (Na⁺)" htmlFor="sodium">
              <Input
                id="sodium"
                type="number"
                step="0.1"
                min="0"
                value={formData.sodium_ppm || ''}
                onChange={(e) => updateField('sodium_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Potassium (K⁺)" htmlFor="potassium">
              <Input
                id="potassium"
                type="number"
                step="0.1"
                min="0"
                value={formData.potassium_ppm || ''}
                onChange={(e) => updateField('potassium_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Chlorure (Cl⁻)" htmlFor="chloride">
              <Input
                id="chloride"
                type="number"
                step="0.1"
                min="0"
                value={formData.chloride_ppm || ''}
                onChange={(e) => updateField('chloride_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Sulfate (SO₄²⁻)" htmlFor="sulfate">
              <Input
                id="sulfate"
                type="number"
                step="0.1"
                min="0"
                value={formData.sulfate_ppm || ''}
                onChange={(e) => updateField('sulfate_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Nitrate (NO₃⁻)" htmlFor="nitrate">
              <Input
                id="nitrate"
                type="number"
                step="0.1"
                min="0"
                value={formData.nitrate_ppm || ''}
                onChange={(e) => updateField('nitrate_ppm', parseFloat(e.target.value))}
              />
            </FormField>
          </div>
        </div>

        {/* Water Quality Indicators */}
        <div>
          <h4 className="font-medium mb-4">Indicateurs de Qualité</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="SAR (Sodium Adsorption Ratio)" htmlFor="sar">
              <Input
                id="sar"
                type="number"
                step="0.01"
                min="0"
                value={formData.sar || ''}
                onChange={(e) => updateField('sar', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Dureté (ppm CaCO₃)" htmlFor="hardness">
              <Input
                id="hardness"
                type="number"
                step="1"
                min="0"
                value={formData.hardness_ppm || ''}
                onChange={(e) => updateField('hardness_ppm', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Convenance irrigation" htmlFor="suitability">
              <Select
                id="suitability"
                value={formData.irrigation_suitability || ''}
                onChange={(e) => updateField('irrigation_suitability', e.target.value as 'excellent' | 'good' | 'marginal' | 'poor' | 'unsuitable' | undefined)}
              >
                <option value="">Sélectionner...</option>
                <option value="excellent">Excellente</option>
                <option value="good">Bonne</option>
                <option value="fair">Acceptable</option>
                <option value="poor">Médiocre</option>
                <option value="unsuitable">Inadéquate</option>
              </Select>
            </FormField>
          </div>
        </div>

        {/* Notes */}
        <FormField label="Notes (optionnel)" htmlFor="notes">
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={4}
            placeholder="Observations supplémentaires..."
          />
        </FormField>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Enregistrer</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default WaterAnalysisForm;
