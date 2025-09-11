import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import type { SoilAnalysis } from '../types';

interface SoilAnalysisFormProps {
  onSave: (data: SoilAnalysis) => void;
  onCancel: () => void;
  initialData?: SoilAnalysis;
}

const SoilAnalysisForm: React.FC<SoilAnalysisFormProps> = ({ onSave, onCancel, initialData }) => {
  const [testType, setTestType] = useState('basic');
  const [formData, setFormData] = useState<SoilAnalysis>(initialData || {
    physical: {
      texture: '',
      ph: 7.0,
      organicMatter: 0,
      soilType: ''
    },
    chemical: {
      nitrogen: 0,
      phosphorus: 0,
      potassium: 0
    },
    recommendations: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Analyse du Sol</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Type d'analyse
          </label>
          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="basic">Analyse de base</option>
            <option value="complete">Analyse complète</option>
            <option value="specialized">Analyse spécialisée arboriculture</option>
          </select>
        </div>

        {/* Physical Properties */}
        <div>
          <h4 className="font-medium mb-4">Propriétés Physiques</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Type de sol
              </label>
              <input
                type="text"
                value={formData.physical.soilType}
                onChange={(e) => setFormData({
                  ...formData,
                  physical: {
                    ...formData.physical,
                    soilType: e.target.value
                  }
                })}
                placeholder="Ex: Sols calci-magnésique, carbonatés..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Texture du Sol
              </label>
              <select
                value={formData.physical.texture}
                onChange={(e) => setFormData({
                  ...formData,
                  physical: {
                    ...formData.physical,
                    texture: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Sélectionner...</option>
                <option value="Limoneuse">Limoneuse</option>
                <option value="Argileuse">Argileuse</option>
                <option value="Sableuse">Sableuse</option>
                <option value="Argilo-limoneuse">Argilo-limoneuse</option>
                <option value="Limono-sableuse">Limono-sableuse</option>
                <option value="Argilo-sableuse">Argilo-sableuse</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                pH
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="14"
                value={formData.physical.ph}
                onChange={(e) => setFormData({
                  ...formData,
                  physical: {
                    ...formData.physical,
                    ph: parseFloat(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Matière Organique (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.physical.organicMatter}
                onChange={(e) => setFormData({
                  ...formData,
                  physical: {
                    ...formData.physical,
                    organicMatter: parseFloat(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
        </div>

        {/* Chemical Properties */}
        <div>
          <h4 className="font-medium mb-4">Propriétés Chimiques</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Phosphore assimilable (mg/kg P2O5)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.chemical.phosphorus}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    phosphorus: parseFloat(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Potassium (mg/kg K2O)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.chemical.potassium}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    potassium: parseFloat(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            {testType !== 'basic' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Azote total (g/kg N)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.chemical.nitrogen}
                  onChange={(e) => setFormData({
                    ...formData,
                    chemical: {
                      ...formData.chemical,
                      nitrogen: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}
          </div>
        </div>

        {testType === 'specialized' && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              Cette analyse est spécialement adaptée pour l'arboriculture. Des recommandations 
              spécifiques pour la gestion des vergers seront générées en fonction des résultats.
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
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

export default SoilAnalysisForm;