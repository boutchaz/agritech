import { AIStatusBadge } from './AIStatusBadge';
import type { AICalibration } from '@/lib/api/ai-calibration';
import { confidenceValueToPercent } from '@/lib/calibration-confidence';

interface CalibrationCardProps {
  calibration: AICalibration;
}

export const CalibrationCard = ({ calibration }: CalibrationCardProps) => {
  const confidencePct = confidenceValueToPercent(calibration.confidence_score);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Calibration Status</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date(calibration.updated_at).toLocaleDateString()}
          </p>
        </div>
        <AIStatusBadge status={calibration.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Confidence Score</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {confidencePct != null ? `${confidencePct}%` : '—'}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${confidencePct ?? 0}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Zone Classification</div>
          {calibration.zone_classification ? (
            <div className="mt-2">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                calibration.zone_classification === 'optimal'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : calibration.zone_classification === 'normal'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {calibration.zone_classification === 'optimal' && '✓ '}
                {calibration.zone_classification === 'stressed' && '⚠ '}
                <span className="capitalize">{String(calibration.zone_classification)}</span>
              </span>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic mt-2">No zones classified yet</div>
          )}
        </div>
      </div>
    </div>
  );
};
