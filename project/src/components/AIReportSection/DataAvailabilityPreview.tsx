import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Satellite,
  Droplets,
  Leaf,
  FlaskConical,
  Cloud,
  Loader2,
} from 'lucide-react';
import { useDataAvailability } from '../../hooks/useAIReports';
import type { DataAvailabilityResponse } from '../../lib/api/ai-reports';

interface DataAvailabilityPreviewProps {
  parcelId: string;
  startDate?: string;
  endDate?: string;
}

interface DataSourceRowProps {
  icon: React.ReactNode;
  label: string;
  available: boolean;
  detail?: string;
  warning?: boolean;
}

const DataSourceRow: React.FC<DataSourceRowProps> = ({
  icon,
  label,
  available,
  detail,
  warning,
}) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-3">
        <div className={`p-1.5 rounded-lg ${available ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        {detail && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {detail}
          </span>
        )}
        {available ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : warning ? (
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
        ) : (
          <XCircle className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </div>
  );
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const DataAvailabilityPreview: React.FC<DataAvailabilityPreviewProps> = ({
  parcelId,
  startDate,
  endDate,
}) => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useDataAvailability(parcelId, startDate, endDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">
          {t('aiReport.dataAvailability.loading', 'Vérification des données...')}
        </span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const availableCount = [
    data.satellite.available,
    data.soil.available,
    data.water.available,
    data.plant.available,
    data.weather.available,
  ].filter(Boolean).length;

  const totalSources = 5;
  const coveragePercent = Math.round((availableCount / totalSources) * 100);

  const getStatusColor = () => {
    if (coveragePercent >= 80) return 'bg-green-500';
    if (coveragePercent >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (coveragePercent >= 80) return t('aiReport.dataAvailability.statusExcellent', 'Excellente couverture');
    if (coveragePercent >= 40) return t('aiReport.dataAvailability.statusPartial', 'Couverture partielle');
    return t('aiReport.dataAvailability.statusLimited', 'Couverture limitée');
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('aiReport.dataAvailability.title', 'Données disponibles')}
        </h4>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {getStatusText()} ({availableCount}/{totalSources})
          </span>
        </div>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-4">
        <div
          className={`h-1.5 rounded-full transition-all ${getStatusColor()}`}
          style={{ width: `${coveragePercent}%` }}
        />
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <DataSourceRow
          icon={<Satellite className={`w-4 h-4 ${data.satellite.available ? 'text-green-600' : 'text-gray-400'}`} />}
          label={t('aiReport.dataAvailability.satellite', 'Données satellites')}
          available={data.satellite.available}
          detail={data.satellite.available 
            ? t('aiReport.dataAvailability.satelliteDetail', '{{count}} points', { count: data.satellite.dataPoints })
            : undefined
          }
        />
        <DataSourceRow
          icon={<FlaskConical className={`w-4 h-4 ${data.soil.available ? 'text-green-600' : 'text-gray-400'}`} />}
          label={t('aiReport.dataAvailability.soil', 'Analyse de sol')}
          available={data.soil.available}
          detail={data.soil.lastAnalysisDate ? formatDate(data.soil.lastAnalysisDate) : undefined}
        />
        <DataSourceRow
          icon={<Droplets className={`w-4 h-4 ${data.water.available ? 'text-green-600' : 'text-gray-400'}`} />}
          label={t('aiReport.dataAvailability.water', "Analyse d'eau")}
          available={data.water.available}
          detail={data.water.lastAnalysisDate ? formatDate(data.water.lastAnalysisDate) : undefined}
        />
        <DataSourceRow
          icon={<Leaf className={`w-4 h-4 ${data.plant.available ? 'text-green-600' : 'text-gray-400'}`} />}
          label={t('aiReport.dataAvailability.plant', 'Analyse végétale')}
          available={data.plant.available}
          detail={data.plant.lastAnalysisDate ? formatDate(data.plant.lastAnalysisDate) : undefined}
        />
        <DataSourceRow
          icon={<Cloud className={`w-4 h-4 ${data.weather.available ? 'text-green-600' : 'text-gray-400'}`} />}
          label={t('aiReport.dataAvailability.weather', 'Données météo')}
          available={data.weather.available}
          warning={!data.weather.available}
        />
      </div>

      {availableCount < 3 && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            {t(
              'aiReport.dataAvailability.lowCoverageWarning',
              'Le rapport IA sera moins précis avec peu de données. Ajoutez des analyses pour de meilleurs résultats.'
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default DataAvailabilityPreview;
