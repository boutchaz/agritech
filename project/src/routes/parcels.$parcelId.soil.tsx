import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParcelById } from '../hooks/useParcelsQuery'
import { useAnalyses } from '../hooks/useAnalyses'
import { FlaskRound as Flask, Plus } from 'lucide-react'
import SoilAnalysisForm from '../components/Analysis/SoilAnalysisForm'
import type { Analysis, AnalysisType, SoilAnalysisData } from '../types/analysis'

const ParcelSoilAnalysis = () => {
  const { t } = useTranslation();
  const { parcelId } = Route.useParams();
  const { data: parcel, isLoading } = useParcelById(parcelId);
  const [analysisTab, setAnalysisTab] = useState<AnalysisType>('soil');
  const [showForm, setShowForm] = useState(false);
  
  // Fetch real analyses data
  const { analyses: soilAnalyses, loading: soilLoading, addAnalysis: addSoilAnalysis, deleteAnalysis } = useAnalyses(parcelId, 'soil');
  const { analyses: plantAnalyses, loading: plantLoading } = useAnalyses(parcelId, 'plant');
  const { analyses: waterAnalyses, loading: waterLoading } = useAnalyses(parcelId, 'water');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!parcel) return null;

  const analysesLoading = soilLoading || plantLoading || waterLoading;
  const currentAnalyses: Analysis[] = analysisTab === 'soil' ? soilAnalyses :
                                      analysisTab === 'plant' ? plantAnalyses :
                                      waterAnalyses;

  const handleSaveAnalysis = async (
    data: SoilAnalysisData,
    analysisDate: string,
    laboratory?: string,
    notes?: string
  ) => {
    try {
      await addSoilAnalysis(parcelId, 'soil', analysisDate, data, laboratory, notes);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving analysis:', error);
      alert(t('farmHierarchy.parcel.soil.saveError'));
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (confirm(t('farmHierarchy.parcel.soil.deleteConfirm'))) {
      try {
        await deleteAnalysis(id);
      } catch (error) {
        console.error('Error deleting analysis:', error);
        alert(t('farmHierarchy.parcel.soil.deleteError'));
      }
    }
  };

  // Show form if needed
  if (showForm) {
    return (
      <div className="space-y-6">
        <SoilAnalysisForm
          onSave={handleSaveAnalysis}
          onCancel={() => setShowForm(false)}
          selectedParcel={parcel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t('farmHierarchy.parcel.soil.title')}
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{t('farmHierarchy.parcel.soil.newAnalysis')}</span>
        </button>
      </div>

      {/* Analysis Type Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setAnalysisTab('soil')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              analysisTab === 'soil'
                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Flask className="h-4 w-4" />
              <span>{t('farmHierarchy.parcel.soil.tabs.soil')}</span>
            </div>
          </button>
          <button
            onClick={() => setAnalysisTab('plant')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              analysisTab === 'plant'
                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Flask className="h-4 w-4" />
              <span>{t('farmHierarchy.parcel.soil.tabs.plant')}</span>
            </div>
          </button>
          <button
            onClick={() => setAnalysisTab('water')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              analysisTab === 'water'
                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Flask className="h-4 w-4" />
              <span>{t('farmHierarchy.parcel.soil.tabs.water')}</span>
            </div>
          </button>
        </div>

        {/* Analysis Content */}
        <div className="p-6">
          {analysesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : currentAnalyses.length === 0 ? (
            <div className="text-center py-12">
              <Flask className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('farmHierarchy.parcel.soil.noAnalyses')}
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('farmHierarchy.parcel.soil.addAnalysis')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {currentAnalyses.map((analysis) => {
                const analysisData = analysis.data as any;
                return (
                  <div
                    key={analysis.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {t('farmHierarchy.parcel.soil.analysisDate')} {new Date(analysis.analysis_date).toLocaleDateString()}
                        </span>
                        {analysis.laboratory && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('farmHierarchy.parcel.soil.laboratory')}: {analysis.laboratory}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAnalysis(analysis.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                      >
                        {t('farmHierarchy.parcel.soil.deleteAnalysis')}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(analysisData)
                        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
                        .map(([key, value]) => {
                          // Format key for display
                          const displayKey = key
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, l => l.toUpperCase());
                          
                          // Format value
                          let displayValue = value;
                          if (typeof value === 'number') {
                            displayValue = value.toFixed(value % 1 === 0 ? 0 : 2);
                          } else if (typeof value === 'object') {
                            displayValue = JSON.stringify(value);
                          }
                          
                          return (
                            <div key={key}>
                              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                {displayKey}:
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {String(displayValue)}
                                {key.includes('percentage') || key.includes('ppm') || key.includes('meq') ? 
                                  (key.includes('percentage') ? '%' : key.includes('ppm') ? ' ppm' : ' meq/100g') : ''}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                    {analysis.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>{t('farmHierarchy.parcel.soil.notes')}:</strong> {analysis.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary if parcel has soil type */}
      {parcel.soil_type && analysisTab === 'soil' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('farmHierarchy.parcel.soil.soilInfo')}
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">{t('farmHierarchy.parcel.soil.soilType')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.soil_type}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/parcels/$parcelId/soil')({
  component: ParcelSoilAnalysis,
});
