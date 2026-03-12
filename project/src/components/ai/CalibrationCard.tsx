import React from 'react';
import { AIStatusBadge } from './AIStatusBadge';
import type { AICalibration } from '@/lib/api/ai-calibration';

interface CalibrationCardProps {
  calibration: AICalibration;
}

export const CalibrationCard: React.FC<CalibrationCardProps> = ({ calibration }) => {
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
            {(calibration.confidence_score * 100).toFixed(1)}%
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${calibration.confidence_score * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Zone Classification</div>
          <div className="space-y-2">
            {Object.entries(calibration.zone_classification || {}).map(([zone, value]) => (
              <div key={zone} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300 capitalize">{zone}</span>
                <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
              </div>
            ))}
            {Object.keys(calibration.zone_classification || {}).length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic">No zones classified yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
