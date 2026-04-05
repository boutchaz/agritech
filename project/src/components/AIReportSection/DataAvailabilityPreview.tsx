import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
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
  Plus,
} from 'lucide-react';
import { useDataAvailability } from '../../hooks/useAIReports';
import { Button } from '@/components/ui/button';

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
  required?: boolean;
  optional?: boolean;
  optionalLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const DataSourceRow = ({
  icon,
  label,
  available,
  detail,
  warning,
  required,
  optional,
  optionalLabel,
  actionLabel,
  onAction,
}: DataSourceRowProps) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-3">
        <div className={`p-1.5 rounded-lg ${available ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
          {icon}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {optional && !available && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
              ({optionalLabel})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {detail && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {detail}
          </span>
        )}
        {!available && onAction && (
          <Button
            onClick={onAction}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            {actionLabel}
          </Button>
        )}
        {available ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : required && !available ? (
          <XCircle className="w-5 h-5 text-red-500" />
        ) : warning ? (
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
        ) : !onAction ? (
          <XCircle className="w-5 h-5 text-gray-400" />
        ) : null}
      </div>
    </div>
  );
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const DataAvailabilityPreview = ({
  parcelId,
  startDate,
  endDate,
}: DataAvailabilityPreviewProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error } = useDataAvailability(parcelId, startDate, endDate);

  const handleAddAnalysis = (type: 'soil' | 'plant' | 'water') => {
    navigate({
      to: '/parcels/$parcelId/analyse',
      params: { parcelId },
      search: { type }
    });
  };

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

  // Required data sources (needed for basic report generation)
  const requiredAvailable = data.satellite.available && data.weather.available;

  // Optional data sources (enhance report quality)
  const optionalCount = [
    data.soil.available,
    data.water.available,
    data.plant.available,
  ].filter(Boolean).length;

  const totalSources = 5;
  const availableCount = (requiredAvailable ? 2 : (data.satellite.available ? 1 : 0) + (data.weather.available ? 1 : 0)) + optionalCount;
  const coveragePercent = Math.round((availableCount / totalSources) * 100);

  const getStatusColor = () => {
    if (!requiredAvailable) return 'bg-red-500';
    if (optionalCount >= 2) return 'bg-green-500';
    if (optionalCount >= 1) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (!requiredAvailable) return t('aiReport.dataAvailability.statusInsufficient', 'Données insuffisantes');
    if (optionalCount >= 2) return t('aiReport.dataAvailability.statusExcellent', 'Excellente couverture');
    if (optionalCount >= 1) return t('aiReport.dataAvailability.statusGood', 'Bonne couverture');
    return t('aiReport.dataAvailability.statusBasic', 'Couverture de base');
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

      {/* Required data section */}
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          {t('aiReport.dataAvailability.requiredSection', 'Requis')}
        </p>
        <div className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <DataSourceRow
            icon={<Satellite className={`w-4 h-4 ${data.satellite.available ? 'text-green-600' : 'text-red-500'}`} />}
            label={t('aiReport.dataAvailability.satellite', 'Données satellites')}
            available={data.satellite.available}
            required
            detail={data.satellite.available
              ? t('aiReport.dataAvailability.satelliteDetail', '{{count}} points', { count: data.satellite.dataPoints })
              : undefined
            }
          />
          <DataSourceRow
            icon={<Cloud className={`w-4 h-4 ${data.weather.available ? 'text-green-600' : 'text-red-500'}`} />}
            label={t('aiReport.dataAvailability.weather', 'Données météo')}
            available={data.weather.available}
            required
          />
        </div>
      </div>

      {/* Optional data section */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          {t('aiReport.dataAvailability.optionalSection', 'Optionnel (améliore la précision)')}
        </p>
        <div className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <DataSourceRow
            icon={<FlaskConical className={`w-4 h-4 ${data.soil.available ? 'text-green-600' : 'text-gray-400'}`} />}
            label={t('aiReport.dataAvailability.soil', 'Analyse de sol')}
            available={data.soil.available}
            optional
            optionalLabel={t('aiReport.dataAvailability.optional', 'optionnel')}
            detail={data.soil.lastAnalysisDate ? formatDate(data.soil.lastAnalysisDate) : undefined}
            actionLabel={t('aiReport.dataAvailability.addAnalysis', 'Ajouter')}
            onAction={() => handleAddAnalysis('soil')}
          />
          <DataSourceRow
            icon={<Droplets className={`w-4 h-4 ${data.water.available ? 'text-green-600' : 'text-gray-400'}`} />}
            label={t('aiReport.dataAvailability.water', "Analyse d'eau")}
            available={data.water.available}
            optional
            optionalLabel={t('aiReport.dataAvailability.optional', 'optionnel')}
            detail={data.water.lastAnalysisDate ? formatDate(data.water.lastAnalysisDate) : undefined}
            actionLabel={t('aiReport.dataAvailability.addAnalysis', 'Ajouter')}
            onAction={() => handleAddAnalysis('water')}
          />
          <DataSourceRow
            icon={<Leaf className={`w-4 h-4 ${data.plant.available ? 'text-green-600' : 'text-gray-400'}`} />}
            label={t('aiReport.dataAvailability.plant', 'Analyse végétale')}
            available={data.plant.available}
            optional
            optionalLabel={t('aiReport.dataAvailability.optional', 'optionnel')}
            detail={data.plant.lastAnalysisDate ? formatDate(data.plant.lastAnalysisDate) : undefined}
            actionLabel={t('aiReport.dataAvailability.addAnalysis', 'Ajouter')}
            onAction={() => handleAddAnalysis('plant')}
          />
        </div>
      </div>

      {/* Status messages */}
      {requiredAvailable && optionalCount === 0 && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            {t(
              'aiReport.dataAvailability.canGenerateBasic',
              'Vous pouvez générer un rapport de base. Ajoutez des analyses pour plus de précision.'
            )}
          </p>
        </div>
      )}

      {!requiredAvailable && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-400">
            {t(
              'aiReport.dataAvailability.cannotGenerate',
              'Les données satellites et météo sont requises pour générer un rapport.'
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default DataAvailabilityPreview;
