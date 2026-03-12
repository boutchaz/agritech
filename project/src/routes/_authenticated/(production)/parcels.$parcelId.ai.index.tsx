import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAICalibration } from '@/hooks/useAICalibration'
import { AIStatusBadge } from '@/components/ai/AIStatusBadge'
import { BrainCircuit, AlertTriangle, Lightbulb, Calendar } from 'lucide-react'

const AIDashboard = () => {
  const { parcelId } = Route.useParams();
  const navigate = useNavigate();
  const { data: calibration, isLoading } = useAICalibration(parcelId);

  const shouldRedirectToCalibration =
    !isLoading &&
    (!calibration ||
      calibration.status === 'pending' ||
      calibration.status === 'failed' ||
      calibration.status === 'in_progress');

  useEffect(() => {
    if (shouldRedirectToCalibration) {
      navigate({ to: `/parcels/${parcelId}/ai/calibration` });
    }
  }, [shouldRedirectToCalibration, navigate, parcelId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (shouldRedirectToCalibration || !calibration) {
    return null; // Will redirect
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl p-8 border border-green-100 dark:border-green-800/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <BrainCircuit className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Agromind IA</h2>
              <p className="text-gray-600 dark:text-gray-400">Your intelligent farming assistant</p>
            </div>
          </div>
          <AIStatusBadge status={calibration.status} className="text-sm px-3 py-1.5" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <button
            type="button"
            onClick={() => navigate({ to: `/parcels/${parcelId}/ai/alerts` })}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors text-left group"
          >
            <AlertTriangle className="w-8 h-8 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Active Alerts</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">View and manage AI-detected risks and anomalies.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: `/parcels/${parcelId}/ai/recommendations` })}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors text-left group"
          >
            <Lightbulb className="w-8 h-8 text-yellow-500 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Recommendations</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Actionable insights to improve crop health and yield.</p>
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: `/parcels/${parcelId}/ai/plan` })}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors text-left group"
          >
            <Calendar className="w-8 h-8 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Annual Plan</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">AI-generated schedule for interventions and tasks.</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/')({
  component: AIDashboard,
});
