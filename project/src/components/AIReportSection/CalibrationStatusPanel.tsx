import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export interface CalibrationStatus {
  status: 'ready' | 'warning' | 'blocked';
  accuracy: number;
  missingData: string[];
  recommendations: string[];
  lastValidated: string;
  nextAutoRefresh?: string;
  satellite: {
    status: 'available' | 'stale' | 'missing';
    imageCount: number;
    latestDate: string | null;
    ageDays: number | null;
    cloudCoverage: number | null;
    isValid: boolean;
  };
  weather: {
    status: 'available' | 'incomplete' | 'missing';
    completeness: number;
    latestDate: string | null;
    ageHours: number | null;
    isValid: boolean;
  };
  soil: {
    present: boolean;
    latestDate: string | null;
    ageDays: number | null;
    isValid: boolean;
  };
  water: {
    present: boolean;
    latestDate: string | null;
    ageDays: number | null;
    isValid: boolean;
  };
  plant: {
    present: boolean;
    latestDate: string | null;
    ageDays: number | null;
    isValid: boolean;
  };
}

interface CalibrationStatusPanelProps {
  status: CalibrationStatus;
  onRecalibrate: () => void;
  onFetchData?: (sources: string[]) => void;
  onAddAnalysis?: (type: 'soil' | 'water' | 'plant') => void;
  isLoading?: boolean;
}

export const CalibrationStatusPanel: React.FC<CalibrationStatusPanelProps> = ({
  status,
  onRecalibrate,
  onFetchData,
  onAddAnalysis,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  const getStatusIcon = (isValid: boolean, statusType: string) => {
    if (isValid) {
      return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    if (statusType === 'stale' || statusType === 'incomplete') {
      return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
    }
    return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
  };

  const getStatusColor = (isValid: boolean, statusType: string) => {
    if (isValid) return 'text-green-700 dark:text-green-400';
    if (statusType === 'stale' || statusType === 'incomplete') return 'text-yellow-700 dark:text-yellow-400';
    return 'text-red-700 dark:text-red-400';
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const formatAge = (days: number | null, unit: 'days' | 'hours' = 'days') => {
    if (days === null) return 'N/A';
    if (unit === 'hours') {
      if (days < 24) return `${Math.floor(days)}h ago`;
      return `${Math.floor(days / 24)} days ago`;
    }
    return `${days} days ago`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 75) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusLabel = (status: 'ready' | 'warning' | 'blocked') => {
    switch (status) {
      case 'ready':
        return t('calibration.status.ready', 'READY');
      case 'warning':
        return t('calibration.status.warning', 'WARNING');
      case 'blocked':
        return t('calibration.status.blocked', 'BLOCKED');
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">📊</span>
            {t('calibration.title', 'Data Calibration Status')}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRecalibrate}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {t('calibration.recalibrate', 'Recalibrate')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Required Data Section */}
        <div>
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
            {t('calibration.requiredData', 'REQUIRED DATA')}
          </h4>
          <div className="space-y-3">
            {/* Satellite Data */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {getStatusIcon(status.satellite.isValid, status.satellite.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${getStatusColor(status.satellite.isValid, status.satellite.status)}`}>
                    {t('calibration.satelliteData', 'Satellite Data')} ({status.satellite.imageCount} {t('calibration.images', 'images')})
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {status.satellite.latestDate && (
                    <>
                      {t('calibration.latest', 'Latest')}: {formatDate(status.satellite.latestDate)}
                      {status.satellite.ageDays !== null && ` (${formatAge(status.satellite.ageDays)})`}
                    </>
                  )}
                  {status.satellite.cloudCoverage !== null && (
                    <span className="ml-2">
                      • {status.satellite.cloudCoverage.toFixed(1)}% {t('calibration.cloudCover', 'cloud cover')}
                    </span>
                  )}
                  {status.satellite.status === 'stale' && (
                    <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                      ({t('calibration.stale', 'Stale')})
                    </span>
                  )}
                </div>
                {!status.satellite.isValid && onFetchData && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => onFetchData(['satellite'])}
                  >
                    {t('calibration.fetchSatellite', 'Fetch Satellite Data')}
                  </Button>
                )}
              </div>
            </div>

            {/* Weather Data */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {getStatusIcon(status.weather.isValid, status.weather.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${getStatusColor(status.weather.isValid, status.weather.status)}`}>
                    {t('calibration.weatherData', 'Weather Data')}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {status.weather.latestDate && (
                    <>
                      {t('calibration.lastUpdate', 'Last update')}: {formatDate(status.weather.latestDate)}
                      {status.weather.ageHours !== null && ` (${formatAge(status.weather.ageHours, 'hours')})`}
                    </>
                  )}
                  {status.weather.completeness > 0 && (
                    <span className="ml-2">
                      • {status.weather.completeness.toFixed(0)}% {t('calibration.completeness', 'completeness')}
                    </span>
                  )}
                  {status.weather.status === 'incomplete' && (
                    <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                      ({t('calibration.incomplete', 'Incomplete')})
                    </span>
                  )}
                </div>
                {!status.weather.isValid && onFetchData && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => onFetchData(['weather'])}
                  >
                    {t('calibration.fetchWeather', 'Fetch Weather Data')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Optional Data Section */}
        <div>
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
            {t('calibration.optionalData', 'OPTIONAL DATA (Accuracy Enhancement)')}
          </h4>
          <div className="space-y-2">
            {/* Soil Analysis */}
            <div className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {getStatusIcon(status.soil.isValid, status.soil.present ? 'available' : 'missing')}
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <span className={`text-sm font-medium ${getStatusColor(status.soil.isValid, status.soil.present ? 'available' : 'missing')}`}>
                    {t('calibration.soilAnalysis', 'Soil Analysis')}
                    {status.soil.present && status.soil.latestDate && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({formatDate(status.soil.latestDate)})
                      </span>
                    )}
                  </span>
                  {status.soil.ageDays !== null && status.soil.ageDays >= 365 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {t('calibration.outdated', 'Outdated')} ({formatAge(status.soil.ageDays)})
                    </p>
                  )}
                </div>
                {!status.soil.present && onAddAnalysis && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddAnalysis('soil')}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('calibration.add', 'Add')}
                  </Button>
                )}
              </div>
            </div>

            {/* Water Analysis */}
            <div className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {getStatusIcon(status.water.isValid, status.water.present ? 'available' : 'missing')}
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <span className={`text-sm font-medium ${getStatusColor(status.water.isValid, status.water.present ? 'available' : 'missing')}`}>
                    {t('calibration.waterAnalysis', 'Water Analysis')}
                    {status.water.present && status.water.latestDate && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({formatDate(status.water.latestDate)})
                      </span>
                    )}
                  </span>
                  {status.water.ageDays !== null && status.water.ageDays >= 365 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {t('calibration.outdated', 'Outdated')} ({formatAge(status.water.ageDays)})
                    </p>
                  )}
                </div>
                {!status.water.present && onAddAnalysis && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddAnalysis('water')}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('calibration.add', 'Add')}
                  </Button>
                )}
              </div>
            </div>

            {/* Plant Analysis */}
            <div className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {getStatusIcon(status.plant.isValid, status.plant.present ? 'available' : 'missing')}
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <span className={`text-sm font-medium ${getStatusColor(status.plant.isValid, status.plant.present ? 'available' : 'missing')}`}>
                    {t('calibration.plantAnalysis', 'Plant Analysis')}
                    {status.plant.present && status.plant.latestDate && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({formatDate(status.plant.latestDate)})
                      </span>
                    )}
                  </span>
                  {status.plant.ageDays !== null && status.plant.ageDays >= 180 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {t('calibration.outdated', 'Outdated')} ({formatAge(status.plant.ageDays)})
                    </p>
                  )}
                </div>
                {!status.plant.present && onAddAnalysis && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddAnalysis('plant')}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('calibration.add', 'Add')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Readiness */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('calibration.analysisReadiness', '🎯 Analysis Readiness')}:
            </span>
            <span className={`text-lg font-bold ${getAccuracyColor(status.accuracy)}`}>
              {status.accuracy}% ({getStatusLabel(status.status)})
            </span>
          </div>

          {status.recommendations.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                {t('calibration.recommendations', 'Recommendations')}:
              </p>
              <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
                {status.recommendations.map((rec, idx) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              {t('calibration.lastCalibration', 'Last calibration')}: {formatDate(status.lastValidated)}
            </p>
            {status.nextAutoRefresh && (
              <p>
                {t('calibration.nextAutoRefresh', 'Next auto-refresh')}: {formatDate(status.nextAutoRefresh)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
