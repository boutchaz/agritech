import React, { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Loader2 } from 'lucide-react';
import SoilAnalysisForm from './SoilAnalysisForm';
import { useSoilAnalyses } from '../hooks/useSoilAnalyses';
import type { SoilAnalysis } from '../types';

const MOCK_FARM_ID = '123e4567-e89b-12d3-a456-426614174000'; // À remplacer par l'ID réel de la ferme
const MOCK_PARCEL_ID = '123e4567-e89b-12d3-a456-426614174001'; // À remplacer par l'ID réel de la parcelle
const MOCK_TEST_TYPE_ID = '123e4567-e89b-12d3-a456-426614174002'; // Default test type ID

const SoilAnalysisPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const { analyses, loading, error, addAnalysis, deleteAnalysis } = useSoilAnalyses(MOCK_FARM_ID);

  const handleSave = async (data: SoilAnalysis) => {
    try {
      await addAnalysis(MOCK_PARCEL_ID, MOCK_TEST_TYPE_ID, data);
      setShowForm(false);
    } catch (err) {
      console.error('Error saving soil analysis:', err);
      // TODO: Show error message to user
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnalysis(id);
    } catch (err) {
      console.error('Error deleting soil analysis:', err);
      // TODO: Show error message to user
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="p-6">
        <SoilAnalysisForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analyses de Sol
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvelle Analyse</span>
        </button>
      </div>

      {analyses.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune analyse enregistrée
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Commencez par ajouter une nouvelle analyse de sol
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map(analysis => (
            <div
              key={analysis.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Analyse du {new Date(analysis.analysis_date).toLocaleDateString()}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {analysis.physical.soilType}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(analysis.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Propriétés Physiques
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Texture</span>
                      <span>{analysis.physical.texture}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>pH</span>
                      <span>{analysis.physical.ph}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Matière organique</span>
                      <span>{analysis.physical.organicMatter}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Propriétés Chimiques
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Phosphore</span>
                      <span>{analysis.chemical.phosphorus} mg/kg P2O5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Potassium</span>
                      <span>{analysis.chemical.potassium} mg/kg K2O</span>
                    </div>
                    {analysis.chemical.nitrogen > 0 && (
                      <div className="flex justify-between">
                        <span>Azote</span>
                        <span>{analysis.chemical.nitrogen} g/kg N</span>
                      </div>
                    )}
                  </div>
                </div>

                {analysis.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Notes
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {analysis.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SoilAnalysisPage;