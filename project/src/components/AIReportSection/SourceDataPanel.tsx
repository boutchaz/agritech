import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Database,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Satellite,
  Cloud,
  FlaskConical,
  Droplets,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DataFreshnessDot, DataSufficiencyBadge } from './DataFreshnessIndicator';
import type { SourceDataMetadata, DataSourceInfo } from '@/lib/api/source-data';

interface SourceDataPanelProps {
  metadata: SourceDataMetadata | null;
  isLoading?: boolean;
  defaultOpen?: boolean;
  onViewDetails?: () => void;
  onRefreshData?: (sources: string[]) => void;
  isRefreshing?: boolean;
  compact?: boolean;
}

/**
 * Collapsible panel showing source data summary
 * Can be embedded in the report preview or shown as a standalone component
 */
export const SourceDataPanel: React.FC<SourceDataPanelProps> = ({
  metadata,
  isLoading = false,
  defaultOpen = false,
  onViewDetails,
  onRefreshData,
  isRefreshing = false,
  compact = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getSourceIcon = (sourceName: string, available: boolean) => {
    const iconClass = cn(
      'w-4 h-4',
      available ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
    );

    const icons: Record<string, React.ReactNode> = {
      satellite: <Satellite className={iconClass} />,
      weather: <Cloud className={iconClass} />,
      soil: <FlaskConical className={iconClass} />,
      water: <Droplets className={iconClass} />,
      plant: <Leaf className={iconClass} />,
    };
    return icons[sourceName] || <Database className={iconClass} />;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('dataTransparency.notAvailable', 'N/A');
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('dataTransparency.loading', 'Loading source data...')}
          </span>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  const staleSources = Object.entries(metadata.sources)
    .filter(([_, info]) => info.freshnessLevel === 'stale' && info.available)
    .map(([name]) => name);

  const hasWarnings = metadata.warnings.length > 0 || staleSources.length > 0;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Panel Header */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {t('dataTransparency.panelTitle', 'Source Data')}
              </span>
              {hasWarnings && (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {metadata.totalDataPoints.toLocaleString()} {t('dataTransparency.dataPoints', 'data points')} •{' '}
              {metadata.includedSources.length} {t('dataTransparency.sources', 'sources')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DataSufficiencyBadge
            status={metadata.sufficiencyStatus}
            score={metadata.sufficiencyScore}
            size="sm"
          />
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </Button>

      {/* Panel Content */}
      {isOpen && (
        <div className="p-4 bg-white dark:bg-gray-800 space-y-4">
          {/* Data Period */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {t('dataTransparency.analysisDateRange', 'Analysis Period')}:
            </span>
            <span className="text-gray-900 dark:text-white">
              {formatDate(metadata.dataCollectionPeriod.start)} - {formatDate(metadata.dataCollectionPeriod.end)}
            </span>
          </div>

          {/* Sources Grid */}
          <div className={cn('grid gap-2', compact ? 'grid-cols-5' : 'grid-cols-2 md:grid-cols-5')}>
            {Object.entries(metadata.sources).map(([name, source]) => (
              <SourceCard
                key={name}
                name={name}
                source={source}
                icon={getSourceIcon(name, source.available)}
                compact={compact}
              />
            ))}
          </div>

          {/* Warnings Summary */}
          {metadata.warnings.length > 0 && !compact && (
            <div className="space-y-2">
              {metadata.warnings.slice(0, 2).map((warning, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-2 rounded-lg flex items-center gap-2 text-sm',
                    warning.severity === 'critical'
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : warning.severity === 'warning'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  )}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{warning.message}</span>
                </div>
              ))}
              {metadata.warnings.length > 2 && (
                <p className="text-xs text-gray-500">
                  {t('dataTransparency.andMoreWarnings', 'And {{count}} more warnings...', {
                    count: metadata.warnings.length - 2,
                  })}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                {t('dataTransparency.viewDetails', 'View Details')}
              </Button>
            )}

            {staleSources.length > 0 && onRefreshData && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshData(staleSources);
                }}
                disabled={isRefreshing}
                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-900/30"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                {t('dataTransparency.refreshStale', 'Refresh Stale Data')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact card showing individual source status
 */
const SourceCard: React.FC<{
  name: string;
  source: DataSourceInfo;
  icon: React.ReactNode;
  compact?: boolean;
}> = ({ name, source, icon, compact }) => {
  return (
    <div
      className={cn(
        'p-2 rounded-lg border transition-colors',
        source.available
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        {!compact && (
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize truncate">
            {name}
          </span>
        )}
        {source.available && <DataFreshnessDot level={source.freshnessLevel} size="sm" />}
      </div>
      {!compact && source.available && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {source.dataPoints} pts
        </div>
      )}
      {compact && (
        <div className="mt-1 flex items-center justify-center">
          {source.available ? (
            <CheckCircle2 className="w-3 h-3 text-green-500" />
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Inline badge version for use in headers or summaries
 */
export const SourceDataBadge: React.FC<{
  metadata: SourceDataMetadata | null;
  onClick?: () => void;
}> = ({ metadata, onClick }) => {
  if (!metadata) return null;

  const hasIssues =
    metadata.sufficiencyStatus !== 'sufficient' || metadata.warnings.length > 0;

  return (
    <Button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full border transition-colors',
        hasIssues
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40'
      )}
    >
      <Database className="w-3 h-3" />
      <span>{metadata.totalDataPoints.toLocaleString()} pts</span>
      {hasIssues && <AlertTriangle className="w-3 h-3" />}
    </Button>
  );
};

export default SourceDataPanel;
