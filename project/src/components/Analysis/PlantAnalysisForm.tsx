import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import type { PlantAnalysisData } from '../../types/analysis';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface Parcel {
  id: string;
  name: string;
}

interface PlantAnalysisFormProps {
  onSave: (data: PlantAnalysisData, analysisDate: string, laboratory?: string, notes?: string) => void;
  onCancel: () => void;
  selectedParcel?: Parcel | null;
}

const PlantAnalysisForm: React.FC<PlantAnalysisFormProps> = ({ onSave, onCancel, selectedParcel }) => {
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().split('T')[0]);
  const [laboratory, setLaboratory] = useState('');
  const [notes, setNotes] = useState('');

  const [formData, setFormData] = useState<PlantAnalysisData>({
    plant_part: 'leaf',
    growth_stage: undefined,
    nitrogen_percentage: undefined,
    phosphorus_percentage: undefined,
    potassium_percentage: undefined,
    calcium_percentage: undefined,
    magnesium_percentage: undefined,
    sulfur_percentage: undefined,
    dry_matter_percentage: undefined,
    chlorophyll_content: undefined
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== undefined && v !== '')
    ) as PlantAnalysisData;

    onSave(cleanData, analysisDate, laboratory || undefined, notes || undefined);
  };

  const updateField = <K extends keyof PlantAnalysisData>(field: K, value: PlantAnalysisData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Nouvelle Analyse de Plante</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {selectedParcel && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
              Parcelle sélectionnée
            </h4>
            <p className="text-sm text-green-800 dark:text-green-200">
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

        {/* Plant Information */}
        <div>
          <h4 className="font-medium mb-4">Informations sur l'Échantillon</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Partie de la plante" htmlFor="plant_part" required>
              <Select
                id="plant_part"
                value={formData.plant_part}
                onChange={(e) => updateField('plant_part', e.target.value as any)}
                required
              >
                <option value="leaf">Feuille</option>
                <option value="stem">Tige</option>
                <option value="root">Racine</option>
                <option value="fruit">Fruit</option>
                <option value="whole_plant">Plante entière</option>
              </Select>
            </FormField>

            <FormField label="Stade de croissance" htmlFor="growth_stage">
              <Input
                id="growth_stage"
                type="text"
                value={formData.growth_stage || ''}
                onChange={(e) => updateField('growth_stage', e.target.value)}
                placeholder="Ex: Floraison, Fructification..."
              />
            </FormField>
          </div>
        </div>

        {/* Macronutrients (%) */}
        <div>
          <h4 className="font-medium mb-4">Macronutriments (%)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Azote (N)" htmlFor="nitrogen">
              <Input
                id="nitrogen"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.nitrogen_percentage || ''}
                onChange={(e) => updateField('nitrogen_percentage', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Phosphore (P)" htmlFor="phosphorus">
              <Input
                id="phosphorus"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.phosphorus_percentage || ''}
                onChange={(e) => updateField('phosphorus_percentage', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Potassium (K)" htmlFor="potassium">
              <Input
                id="potassium"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.potassium_percentage || ''}
                onChange={(e) => updateField('potassium_percentage', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Calcium (Ca)" htmlFor="calcium">
              <Input
                id="calcium"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.calcium_percentage || ''}
                onChange={(e) => updateField('calcium_percentage', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Magnésium (Mg)" htmlFor="magnesium">
              <Input
                id="magnesium"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.magnesium_percentage || ''}
                onChange={(e) => updateField('magnesium_percentage', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Soufre (S)" htmlFor="sulfur">
              <Input
                id="sulfur"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.sulfur_percentage || ''}
                onChange={(e) => updateField('sulfur_percentage', parseFloat(e.target.value))}
              />
            </FormField>
          </div>
        </div>

        {/* Health Indicators */}
        <div>
          <h4 className="font-medium mb-4">Indicateurs de Santé</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Matière sèche (%)" htmlFor="dry_matter">
              <Input
                id="dry_matter"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.dry_matter_percentage || ''}
                onChange={(e) => updateField('dry_matter_percentage', parseFloat(e.target.value))}
              />
            </FormField>

            <FormField label="Chlorophylle (SPAD)" htmlFor="chlorophyll">
              <Input
                id="chlorophyll"
                type="number"
                step="0.1"
                min="0"
                value={formData.chlorophyll_content || ''}
                onChange={(e) => updateField('chlorophyll_content', parseFloat(e.target.value))}
              />
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

export default PlantAnalysisForm;
