import { createFileRoute } from '@tanstack/react-router'
import { useAICalibration, useStartAICalibration } from '@/hooks/useAICalibration'
import { useAIDiagnostics } from '@/hooks/useAIDiagnostics'
import { CalibrationCard } from '@/components/ai/CalibrationCard'
import { BrainCircuit, Play, AlertCircle } from 'lucide-react'

const AICalibrationPage = () => {
  const { parcelId } = Route.useParams();
  const { data: calibration, isLoading: isCalibrationLoading } = useAICalibration(parcelId);
  const { data: diagnostics, isLoading: isDiagnosticsLoading } = useAIDiagnostics(parcelId);
  const { mutate: startCalibration, isPending: isStarting } = useStartAICalibration();

  if (isCalibrationLoading || isDiagnosticsLoading) {
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
        <button
          type="button"
          onClick={() => startCalibration(parcelId)}
          disabled={isStarting || calibration?.status === 'in_progress'}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isStarting || calibration?.status === 'in_progress' ? (
            <BrainCircuit className="w-4 h-4 animate-pulse" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{calibration?.status === 'in_progress' ? 'Calibrating...' : 'Start Calibration'}</span>
        </button>
      </div>

      {calibration ? (
        <CalibrationCard calibration={calibration} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BrainCircuit className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Calibration Data</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Start a calibration process to initialize the AI model for this parcel.</p>
          <button
            type="button"
            onClick={() => startCalibration(parcelId)}
            disabled={isStarting}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Play className="w-5 h-5" />
            <span>Start Calibration</span>
          </button>
        </div>
      )}

      {diagnostics && diagnostics.length > 0 && (
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
