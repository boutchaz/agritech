import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { useAnalyses } from '@/hooks/useAnalyses'
import { useCalibrationStatus } from '@/hooks/useAIReports'
import { FlaskRound as Flask, Plus, Leaf, Droplets, X, FileText, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import SoilAnalysisForm from '@/components/Analysis/SoilAnalysisForm'
import PlantAnalysisForm from '@/components/Analysis/PlantAnalysisForm'
import WaterAnalysisForm from '@/components/Analysis/WaterAnalysisForm'
import type { Analysis, AnalysisType, SoilAnalysisData, PlantAnalysisData, WaterAnalysisData } from '@/types/analysis'

const ParcelSoilAnalysis = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { parcelId } = Route.useParams();
  const search = Route.useSearch();
  const { data: parcel, isLoading } = useParcelById(parcelId);
  const { data: calibrationStatus } = useCalibrationStatus(parcelId);
  const [analysisTab, setAnalysisTab] = useState<AnalysisType>(search.type || 'soil');
  const [showForm, setShowForm] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState<AnalysisType | null>(null);

  const returnTo = (search as any).returnTo || 'stay';

  // Auto-show form if type is specified in search params (from calibration panel)
  useEffect(() => {
    if (search.type && !showForm && !selectedFormType) {
      setSelectedFormType(search.type as AnalysisType);
      setShowForm(true);
    }
  }, [search.type]);

  // Fetch real analyses data
  const { analyses: soilAnalyses, loading: soilLoading, addAnalysis: addSoilAnalysis, deleteAnalysis: deleteSoilAnalysis } = useAnalyses(parcelId, 'soil', 'parcel', parcel.organization_id);
  const { analyses: plantAnalyses, loading: plantLoading, addAnalysis: addPlantAnalysis, deleteAnalysis: deletePlantAnalysis } = useAnalyses(parcelId, 'plant', 'parcel', parcel.organization_id);
  const { analyses: waterAnalyses, loading: waterLoading, addAnalysis: addWaterAnalysis, deleteAnalysis: deleteWaterAnalysis } = useAnalyses(parcelId, 'water', 'parcel', parcel.organization_id);

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

  const handleSaveSoilAnalysis = async (
    data: SoilAnalysisData,
    analysisDate: string,
    laboratory?: string,
    notes?: string
  ) => {
    try {
      await addSoilAnalysis(parcelId, 'soil', analysisDate, data, laboratory, notes);
      setShowForm(false);
      setSelectedFormType(null);

      // Navigate back to reports after successful save
      if (returnTo === 'reports') {
        navigate({
          to: '/parcels/$parcelId/reports',
          params: { parcelId },
          search: { autoRecalibrate: true },
        });
      } else {
        setAnalysisTab('soil'); // Switch to soil tab to show the new analysis
      }
    } catch (error) {
      console.error('Error saving soil analysis:', error);
      toast.error(t('parcels.analyse.saveError'));
    }
  };

  const handleSavePlantAnalysis = async (
    data: PlantAnalysisData,
    analysisDate: string,
    laboratory?: string,
    notes?: string
  ) => {
    try {
      await addPlantAnalysis(parcelId, 'plant', analysisDate, data, laboratory, notes);
      setShowForm(false);
      setSelectedFormType(null);

      // Navigate back to reports after successful save
      if (returnTo === 'reports') {
        navigate({
          to: '/parcels/$parcelId/reports',
          params: { parcelId },
          search: { autoRecalibrate: true },
        });
      } else {
        setAnalysisTab('plant'); // Switch to plant tab to show the new analysis
      }
    } catch (error) {
      console.error('Error saving plant analysis:', error);
      toast.error(t('parcels.analyse.plantSaveError'));
    }
  };

  const handleSaveWaterAnalysis = async (
    data: WaterAnalysisData,
    analysisDate: string,
    laboratory?: string,
    notes?: string
  ) => {
    try {
      await addWaterAnalysis(parcelId, 'water', analysisDate, data, laboratory, notes);
      setShowForm(false);
      setSelectedFormType(null);

      // Navigate back to reports after successful save
      if (returnTo === 'reports') {
        navigate({
          to: '/parcels/$parcelId/reports',
          params: { parcelId },
          search: { autoRecalibrate: true },
        });
      } else {
        setAnalysisTab('water'); // Switch to water tab to show the new analysis
      }
    } catch (error) {
      console.error('Error saving water analysis:', error);
      toast.error(t('parcels.analyse.waterSaveError'));
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (confirm(t('parcels.analyse.deleteConfirm'))) {
      try {
        // Use the correct delete function based on the current tab
        if (analysisTab === 'soil') {
          await deleteSoilAnalysis(id);
        } else if (analysisTab === 'plant') {
          await deletePlantAnalysis(id);
        } else {
          await deleteWaterAnalysis(id);
        }
      } catch (error) {
        console.error('Error deleting analysis:', error);
        toast.error(t('parcels.analyse.deleteError'));
      }
    }
  };

  // Handle type selection and show form
  const handleTypeSelect = (type: AnalysisType) => {
    setSelectedFormType(type);
    setShowTypeSelector(false);
    setShowForm(true);
  };

  // Handle form cancel - reset both form and type selection
  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedFormType(null);
  };

  // Render the correct form based on the selected type
  const renderForm = () => {
    switch (selectedFormType) {
      case 'soil':
        return (
          <SoilAnalysisForm
            onSave={handleSaveSoilAnalysis}
            onCancel={handleFormCancel}
            selectedParcel={parcel}
          />
        );
      case 'plant':
        return (
          <PlantAnalysisForm
            onSave={handleSavePlantAnalysis}
            onCancel={handleFormCancel}
            selectedParcel={parcel}
          />
        );
      case 'water':
        return (
          <WaterAnalysisForm
            onSave={handleSaveWaterAnalysis}
            onCancel={handleFormCancel}
            selectedParcel={parcel}
          />
        );
      default:
        return null;
    }
  };

  // Render the analysis type selection modal
  const renderTypeSelector = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('parcels.analyse.selectAnalysisType')}
          </h3>
          <button
            onClick={() => setShowTypeSelector(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <button
            onClick={() => handleTypeSelect('soil')}
            className="w-full flex items-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mr-4">
              <Flask className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">
                {t('parcels.analyse.tabs.soil')}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('parcels.analyse.soilDescription')}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('plant')}
            className="w-full flex items-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-4">
              <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">
                {t('parcels.analyse.tabs.plant')}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('parcels.analyse.plantDescription')}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('water')}
            className="w-full flex items-center p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-4">
              <Droplets className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {t('parcels.analyse.tabs.water')}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('parcels.analyse.waterDescription')}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  // Show form if needed
  if (showForm && selectedFormType) {
    return (
      <div className="space-y-6">
        {renderForm()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Type Selection Modal */}
      {showTypeSelector && renderTypeSelector()}
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t('parcels.analyse.title')}
        </h3>
        <button
          onClick={() => setShowTypeSelector(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{t('parcels.analyse.newAnalysis')}</span>
        </button>
      </div>

      {/* Calibration Status Banner */}
      {calibrationStatus && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                calibrationStatus.accuracy >= 75
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : calibrationStatus.accuracy >= 50
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <TrendingUp className={`w-5 h-5 ${
                  calibrationStatus.accuracy >= 75
                    ? 'text-green-600 dark:text-green-400'
                    : calibrationStatus.accuracy >= 50
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('parcels.analyse.calibrationAccuracy', 'Calibration Accuracy')}: {calibrationStatus.accuracy}%
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {calibrationStatus.recommendations.length > 0
                    ? calibrationStatus.recommendations[0]
                    : t('parcels.analyse.allGood', 'All data sources available')
                  }
                </p>
              </div>
            </div>
            <Link
              to="/parcels/$parcelId/reports"
              params={{ parcelId }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">{t('parcels.analyse.generateReport', 'Generate AI Report')}</span>
            </Link>
          </div>

          {/* Missing Analyses Indicator */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {t('parcels.analyse.missingData', 'Missing analyses for better accuracy')}:
            </p>
            <div className="flex gap-2">
              {!calibrationStatus.soil.present && (
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded">
                  {t('parcels.analyse.tabs.soil')}
                </span>
              )}
              {!calibrationStatus.water.present && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                  {t('parcels.analyse.tabs.water')}
                </span>
              )}
              {!calibrationStatus.plant.present && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                  {t('parcels.analyse.tabs.plant')}
                </span>
              )}
              {calibrationStatus.soil.present && calibrationStatus.water.present && calibrationStatus.plant.present && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                  {t('parcels.analyse.allComplete', 'All analyses complete')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

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
              <span>{t('parcels.analyse.tabs.soil')}</span>
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
              <Leaf className="h-4 w-4" />
              <span>{t('parcels.analyse.tabs.plant')}</span>
            </div>
          </button>
          <button
            onClick={() => setAnalysisTab('water')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              analysisTab === 'water'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Droplets className="h-4 w-4" />
              <span>{t('parcels.analyse.tabs.water')}</span>
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
              {analysisTab === 'soil' && <Flask className="h-12 w-12 text-gray-400 mx-auto mb-4" />}
              {analysisTab === 'plant' && <Leaf className="h-12 w-12 text-gray-400 mx-auto mb-4" />}
              {analysisTab === 'water' && <Droplets className="h-12 w-12 text-gray-400 mx-auto mb-4" />}
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('parcels.analyse.noAnalyses')}
              </p>
              <button
                onClick={() => {
                  setSelectedFormType(analysisTab);
                  setShowForm(true);
                }}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  analysisTab === 'water'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {t('parcels.analyse.addAnalysis')}
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
                          {t('parcels.analyse.analysisDate')} {new Date(analysis.analysis_date).toLocaleDateString()}
                        </span>
                        {analysis.laboratory && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('parcels.analyse.laboratory')}: {analysis.laboratory}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAnalysis(analysis.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                      >
                        {t('parcels.analyse.deleteAnalysis')}
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
                          <strong>{t('parcels.analyse.notes')}:</strong> {analysis.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      {/* Quick Summary if parcel has soil type */}
      {parcel.soil_type && analysisTab === 'soil' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('parcels.analyse.soilInfo')}
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.analyse.soilType')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.soil_type}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/analyse')({
  component: ParcelSoilAnalysis,
  validateSearch: (search: Record<string, unknown>) => ({
    type: (search.type as 'soil' | 'plant' | 'water') || undefined,
  }),
});
