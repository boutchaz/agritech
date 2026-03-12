import { createFileRoute } from '@tanstack/react-router'
import { useAICalibration, useStartAICalibration } from '@/hooks/useAICalibration'
import { useAIDiagnostics } from '@/hooks/useAIDiagnostics'
import { CalibrationCard } from '@/components/ai/CalibrationCard'
import { BrainCircuit, Play, AlertCircle, Satellite, CloudRain, CheckCircle2 } from 'lucide-react'

const AICalibrationPage = () => {
  const { parcelId } = Route.useParams();
  const { data: calibration, isLoading: isCalibrationLoading } = useAICalibration(parcelId);
  const { data: diagnostics } = useAIDiagnostics(parcelId);
  const { mutate: startCalibration, isPending: isStarting } = useStartAICalibration();

  const isInProgress = calibration?.status === 'in_progress' || calibration?.status === 'provisioning';
  const isBusy = isInProgress || isStarting;
  const isCompleted = calibration?.status === 'completed';

  if (isCalibrationLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Calibration</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage the AI model calibration for this parcel.</p>
        </div>
        {calibration && (
          <button
            type="button"
            onClick={() => startCalibration(parcelId)}
            disabled={isBusy}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isBusy ? (
              <BrainCircuit className="w-4 h-4 animate-pulse" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{isInProgress ? 'Calibrating...' : 'Re-calibrate'}</span>
          </button>
        )}
      </div>

      {isInProgress && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800/30 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Provisioning Data</h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Fetching satellite imagery and weather data for this parcel. This may take a few minutes.
              </p>
            </div>
          </div>
          <div className="space-y-3 ml-11">
            <div className="flex items-center space-x-2 text-sm text-purple-700 dark:text-purple-300">
              <Satellite className="w-4 h-4 animate-pulse" />
              <span>Fetching satellite indices (NDVI, NDRE, NDMI, EVI, SAVI, GCI)...</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-purple-700 dark:text-purple-300">
              <CloudRain className="w-4 h-4 animate-pulse" />
              <span>Fetching weather history (temperature, precipitation, evapotranspiration)...</span>
            </div>
          </div>
          <div className="mt-4 ml-11">
            <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-purple-600 dark:bg-purple-400 h-1.5 rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}

      {isCompleted && calibration && (
        <CalibrationCard calibration={calibration} />
      )}

      {calibration?.status === 'failed' && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/30 p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Calibration Failed</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                The calibration process encountered an error. Please try again.
              </p>
              <button
                type="button"
                onClick={() => startCalibration(parcelId)}
                disabled={isStarting}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>Retry Calibration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!calibration && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl border border-green-200 dark:border-green-800/30 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm inline-block mb-6">
              <BrainCircuit className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Launch AI Calibration</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Calibrate the AI model for this parcel to enable diagnostics, alerts, and recommendations.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">What happens during calibration</p>
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <Satellite className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Satellite data is fetched (NDVI, NDRE, NDMI and more)</span>
                </div>
                <div className="flex items-center space-x-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <CloudRain className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Weather history is provisioned (temperature, rain, ET0)</span>
                </div>
                <div className="flex items-center space-x-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <BrainCircuit className="w-4 h-4 text-green-500 shrink-0" />
                  <span>AI baselines and thresholds are computed</span>
                </div>
                <div className="flex items-center space-x-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Diagnostics, alerts, and plans become available</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => startCalibration(parcelId)}
              disabled={isStarting}
              className="inline-flex items-center space-x-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-50 font-medium shadow-sm"
            >
              {isStarting ? (
                <BrainCircuit className="w-5 h-5 animate-pulse" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <span>{isStarting ? 'Starting...' : 'Start Calibration'}</span>
            </button>
          </div>
        </div>
      )}

      {diagnostics && Array.isArray(diagnostics) && diagnostics.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Diagnostics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diagnostics.map((diagnostic) => (
              <div key={diagnostic.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-start space-x-3">
                <AlertCircle className={`w-5 h-5 mt-0.5 ${
                  diagnostic.severity === 'critical' ? 'text-red-500' :
                  diagnostic.severity === 'high' ? 'text-orange-500' :
                  diagnostic.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                }`} />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white capitalize">{diagnostic.diagnostic_type.replace(/_/g, ' ')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{diagnostic.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/calibration')({
  component: AICalibrationPage,
});
