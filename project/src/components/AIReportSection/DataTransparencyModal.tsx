import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Database,
  Satellite,
  Cloud,
  FlaskConical,
  Droplets,
  Leaf,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  FileText,
  Info,
  Loader2,
  Calendar,
  Hash,
  Shield,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DataFreshnessIndicator,
  DataFreshnessDot,
  DataSufficiencyBadge,
} from './DataFreshnessIndicator';
import type {
  SourceDataMetadata,
  DataSourceInfo,
  SatelliteDataDetails,
  WeatherDataDetails,
  AnalysisDataDetails,
} from '@/lib/api/source-data';

interface DataTransparencyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: SourceDataMetadata | null;
  isLoading?: boolean;
  onRefreshData?: (sources: string[]) => void;
  isRefreshing?: boolean;
}

/**
 * Modal component for displaying detailed data transparency information
 * Shows all source data used to generate an AI report
 */
export const DataTransparencyModal: React.FC<DataTransparencyModalProps> = ({
  open,
  onOpenChange,
  metadata,
  isLoading = false,
  onRefreshData,
  isRefreshing = false,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSources, setExpandedSources] = useState<string[]>(['satellite', 'weather']);

  const toggleSource = (source: string) => {
    setExpandedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('dataTransparency.notAvailable', 'N/A');
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return t('dataTransparency.notAvailable', 'N/A');
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceIcon = (sourceName: string) => {
    const icons: Record<string, React.ReactNode> = {
      satellite: <Satellite className="w-5 h-5" />,
      weather: <Cloud className="w-5 h-5" />,
      soil: <FlaskConical className="w-5 h-5" />,
      water: <Droplets className="w-5 h-5" />,
      plant: <Leaf className="w-5 h-5" />,
    };
    return icons[sourceName] || <Database className="w-5 h-5" />;
  };

  if (!metadata && !isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-600" />
            {t('dataTransparency.modalTitle', 'Source Data Transparency')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'dataTransparency.modalDescription',
              'View and verify the data sources used to generate this AI report.'
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              {t('dataTransparency.loading', 'Loading source data...')}
            </span>
          </div>
        ) : metadata ? (
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="mb-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {t('dataTransparency.tabs.overview', 'Overview')}
                </TabsTrigger>
                <TabsTrigger value="sources" className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  {t('dataTransparency.tabs.sources', 'Data Sources')}
                </TabsTrigger>
                <TabsTrigger value="rawdata" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t('dataTransparency.tabs.rawData', 'Raw Data')}
                </TabsTrigger>
                <TabsTrigger value="audit" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {t('dataTransparency.tabs.audit', 'Audit Trail')}
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2">
                <TabsContent value="overview" className="mt-0">
                  <OverviewTab
                    metadata={metadata}
                    formatDate={formatDate}
                    onRefreshData={onRefreshData}
                    isRefreshing={isRefreshing}
                  />
                </TabsContent>

                <TabsContent value="sources" className="mt-0">
                  <SourcesTab
                    metadata={metadata}
                    expandedSources={expandedSources}
                    toggleSource={toggleSource}
                    getSourceIcon={getSourceIcon}
                    formatDate={formatDate}
                  />
                </TabsContent>

                <TabsContent value="rawdata" className="mt-0">
                  <RawDataTab metadata={metadata} />
                </TabsContent>

                <TabsContent value="audit" className="mt-0">
                  <AuditTab metadata={metadata} formatDateTime={formatDateTime} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

/**
 * Overview tab showing summary of data transparency
 */
const OverviewTab: React.FC<{
  metadata: SourceDataMetadata;
  formatDate: (date: string | null) => string;
  onRefreshData?: (sources: string[]) => void;
  isRefreshing?: boolean;
}> = ({ metadata, formatDate, onRefreshData, isRefreshing }) => {
  const { t } = useTranslation();

  const staleSources = Object.entries(metadata.sources)
    .filter(([_, info]) => info.freshnessLevel === 'stale' && info.available)
    .map(([name]) => name);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Data Sufficiency Card */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('dataTransparency.sufficiencyLabel', 'Data Sufficiency')}
            </span>
            <DataSufficiencyBadge
              status={metadata.sufficiencyStatus}
              score={metadata.sufficiencyScore}
              size="sm"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{t('dataTransparency.thresholds.minimum', 'Minimum')}</span>
              <span>{metadata.sufficiencyThresholds.minimum}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  metadata.sufficiencyScore >= 70
                    ? 'bg-green-500'
                    : metadata.sufficiencyScore >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${metadata.sufficiencyScore}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{t('dataTransparency.thresholds.recommended', 'Recommended')}: {metadata.sufficiencyThresholds.recommended}%</span>
              <span>{t('dataTransparency.thresholds.optimal', 'Optimal')}: {metadata.sufficiencyThresholds.optimal}%</span>
            </div>
          </div>
        </div>

        {/* Data Points Card */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('dataTransparency.totalDataPoints', 'Total Data Points')}
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {metadata.totalDataPoints.toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('dataTransparency.acrossSources', 'Across {{count}} data sources', {
              count: metadata.includedSources.length,
            })}
          </p>
        </div>

        {/* Date Range Card */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('dataTransparency.analysisDateRange', 'Analysis Period')}
            </span>
          </div>
          <div className="text-sm text-gray-900 dark:text-white">
            <div>{formatDate(metadata.dataCollectionPeriod.start)}</div>
            <div className="text-gray-400">to</div>
            <div>{formatDate(metadata.dataCollectionPeriod.end)}</div>
          </div>
        </div>
      </div>

      {/* Warnings Section */}
      {metadata.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            {t('dataTransparency.warnings', 'Warnings & Alerts')}
          </h4>
          <div className="space-y-2">
            {metadata.warnings.map((warning, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-3 rounded-lg border flex items-start gap-3',
                  warning.severity === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : warning.severity === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                )}
              >
                {warning.severity === 'critical' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                ) : warning.severity === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      warning.severity === 'critical'
                        ? 'text-red-800 dark:text-red-300'
                        : warning.severity === 'warning'
                        ? 'text-yellow-800 dark:text-yellow-300'
                        : 'text-blue-800 dark:text-blue-300'
                    )}
                  >
                    {warning.message}
                  </p>
                  {warning.recommendation && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {warning.recommendation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Data Action */}
      {staleSources.length > 0 && onRefreshData && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {t('dataTransparency.staleDataDetected', 'Stale Data Detected')}
              </h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                {t('dataTransparency.staleDataDescription', 'Some data sources need refreshing for better accuracy.')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefreshData(staleSources)}
              disabled={isRefreshing}
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-400"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {t('dataTransparency.refreshData', 'Refresh Data')}
            </Button>
          </div>
        </div>
      )}

      {/* Included/Excluded Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {t('dataTransparency.includedSources', 'Included Sources')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {metadata.includedSources.map((source) => (
              <span
                key={source}
                className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300 rounded-full capitalize"
              >
                {source}
              </span>
            ))}
          </div>
        </div>

        {metadata.excludedSources.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              {t('dataTransparency.excludedSources', 'Excluded Sources')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {metadata.excludedSources.map((source) => (
                <span
                  key={source}
                  className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full capitalize"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Sources tab showing detailed info for each data source
 */
const SourcesTab: React.FC<{
  metadata: SourceDataMetadata;
  expandedSources: string[];
  toggleSource: (source: string) => void;
  getSourceIcon: (source: string) => React.ReactNode;
  formatDate: (date: string | null) => string;
}> = ({ metadata, expandedSources, toggleSource, getSourceIcon, formatDate }) => {
  const { t } = useTranslation();

  const sourceOrder = ['satellite', 'weather', 'soil', 'water', 'plant'] as const;

  return (
    <div className="space-y-3">
      {sourceOrder.map((sourceName) => {
        const source = metadata.sources[sourceName];
        const isExpanded = expandedSources.includes(sourceName);

        return (
          <div
            key={sourceName}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Source Header */}
            <Button
              onClick={() => toggleSource(sourceName)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    source.available
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  )}
                >
                  {getSourceIcon(sourceName)}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {t(`dataTransparency.sources.${sourceName}`, sourceName)}
                    </span>
                    <DataFreshnessDot level={source.freshnessLevel} pulse={source.freshnessLevel === 'fresh'} />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {source.available
                      ? `${source.dataPoints} ${t('dataTransparency.dataPoints', 'data points')}`
                      : t('dataTransparency.notAvailable', 'Not available')}
                    {source.dateRange?.end && ` • ${t('dataTransparency.lastUpdated', 'Last updated')}: ${formatDate(source.lastUpdated)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {source.available && (
                  <DataFreshnessIndicator
                    level={source.freshnessLevel}
                    ageDays={source.freshnessAgeDays}
                    size="sm"
                    showLabel={true}
                  />
                )}
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </Button>

            {/* Source Details */}
            {isExpanded && (
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <SourceDetails source={source} sourceName={sourceName} formatDate={formatDate} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Detailed view for a single data source
 */
const SourceDetails: React.FC<{
  source: DataSourceInfo & { details?: SatelliteDataDetails | WeatherDataDetails | AnalysisDataDetails };
  sourceName: string;
  formatDate: (date: string | null) => string;
}> = ({ source, sourceName, formatDate }) => {
  const { t } = useTranslation();

  if (!source.available) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 dark:text-gray-400">
          {source.excludeReason || t('dataTransparency.noDataAvailable', 'No data available for this source')}
        </p>
      </div>
    );
  }

  const details = source.details;

  return (
    <div className="space-y-4">
      {/* Basic Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('dataTransparency.dataPoints', 'Data Points')}
          </span>
          <p className="font-medium text-gray-900 dark:text-white">{source.dataPoints}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('dataTransparency.dateRangeStart', 'Date Range Start')}
          </span>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatDate(source.dateRange?.start || null)}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('dataTransparency.dateRangeEnd', 'Date Range End')}
          </span>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatDate(source.dateRange?.end || null)}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('dataTransparency.lastUpdated', 'Last Updated')}
          </span>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatDate(source.lastUpdated)}
          </p>
        </div>
      </div>

      {/* Source-specific details */}
      {sourceName === 'satellite' && details && 'indices' in details && (
        <SatelliteDetails details={details as SatelliteDataDetails} />
      )}
      {sourceName === 'weather' && details && 'completeness' in details && (
        <WeatherDetails details={details as WeatherDataDetails} />
      )}
      {['soil', 'water', 'plant'].includes(sourceName) && details && 'parameters' in details && (
        <AnalysisDetails details={details as AnalysisDataDetails} />
      )}
    </div>
  );
};

const SatelliteDetails: React.FC<{ details: SatelliteDataDetails }> = ({ details }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500">{t('dataTransparency.satellite.indices', 'Indices')}:</span>
        {details.indices.map((idx) => (
          <span key={idx} className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
            {idx}
          </span>
        ))}
      </div>
      {details.avgCloudCoverage !== null && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('dataTransparency.satellite.avgCloudCoverage', 'Average Cloud Coverage')}: {details.avgCloudCoverage.toFixed(1)}%
        </p>
      )}
      {details.provider && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('dataTransparency.satellite.provider', 'Provider')}: {details.provider}
        </p>
      )}
    </div>
  );
};

const WeatherDetails: React.FC<{ details: WeatherDataDetails }> = ({ details }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('dataTransparency.weather.completeness', 'Data Completeness')}: {details.completeness.toFixed(0)}%
      </p>
      {details.temperatureRange && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('dataTransparency.weather.temperatureRange', 'Temperature Range')}: {details.temperatureRange.min}°C - {details.temperatureRange.max}°C
        </p>
      )}
      {details.precipitationTotal !== null && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('dataTransparency.weather.totalPrecipitation', 'Total Precipitation')}: {details.precipitationTotal} mm
        </p>
      )}
    </div>
  );
};

const AnalysisDetails: React.FC<{ details: AnalysisDataDetails }> = ({ details }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {details.labReference && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('dataTransparency.analysis.labReference', 'Lab Reference')}: {details.labReference}
        </p>
      )}
      {details.parameters.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                  {t('dataTransparency.analysis.parameter', 'Parameter')}
                </th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                  {t('dataTransparency.analysis.value', 'Value')}
                </th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                  {t('dataTransparency.analysis.status', 'Status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {details.parameters.slice(0, 10).map((param, idx) => (
                <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 text-gray-900 dark:text-white">{param.name}</td>
                  <td className="py-2 text-gray-900 dark:text-white">
                    {param.value} {param.unit}
                  </td>
                  <td className="py-2">
                    {param.status && (
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs rounded-full',
                          param.status === 'normal'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : param.status === 'warning'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        )}
                      >
                        {param.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {details.parameters.length > 10 && (
            <p className="text-xs text-gray-500 mt-2">
              {t('dataTransparency.analysis.andMore', 'And {{count}} more parameters...', {
                count: details.parameters.length - 10,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Raw data tab showing actual data used (read-only)
 */
const RawDataTab: React.FC<{ metadata: SourceDataMetadata }> = ({ metadata }) => {
  const { t } = useTranslation();
  const [selectedSource, setSelectedSource] = useState<string>('satellite');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const source = metadata.sources[selectedSource as keyof typeof metadata.sources];
  const details = source.details;

  let dataToShow: unknown[] = [];
  if (selectedSource === 'satellite' && details && 'timeSeries' in details) {
    dataToShow = (details as SatelliteDataDetails).timeSeries || [];
  } else if (selectedSource === 'weather' && details && 'dataPoints' in details) {
    dataToShow = (details as WeatherDataDetails).dataPoints || [];
  } else if (details && 'parameters' in details) {
    dataToShow = (details as AnalysisDataDetails).parameters || [];
  }

  const totalPages = Math.ceil(dataToShow.length / pageSize);
  const paginatedData = dataToShow.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      {/* Source selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('dataTransparency.rawData.selectSource', 'Select source')}:
        </span>
        {Object.keys(metadata.sources).map((sourceName) => {
          const src = metadata.sources[sourceName as keyof typeof metadata.sources];
          return (
            <Button
              key={sourceName}
              onClick={() => {
                setSelectedSource(sourceName);
                setPage(1);
              }}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                selectedSource === sourceName
                  ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700',
                !src.available && 'opacity-50 cursor-not-allowed'
              )}
              disabled={!src.available}
            >
              {sourceName.charAt(0).toUpperCase() + sourceName.slice(1)}
              {src.available && <span className="ml-1 text-xs">({src.dataPoints})</span>}
            </Button>
          );
        })}
      </div>

      {/* Read-only notice */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2">
        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm text-blue-700 dark:text-blue-300">
          {t('dataTransparency.rawData.readOnlyNotice', 'This data is read-only and cannot be modified.')}
        </span>
      </div>

      {/* Data table */}
      {paginatedData.length > 0 ? (
        <>
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <pre className="p-4 text-xs bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-x-auto">
              {JSON.stringify(paginatedData, null, 2)}
            </pre>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {t('dataTransparency.rawData.showing', 'Showing {{from}}-{{to}} of {{total}}', {
                  from: (page - 1) * pageSize + 1,
                  to: Math.min(page * pageSize, dataToShow.length),
                  total: dataToShow.length,
                })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t('dataTransparency.rawData.previous', 'Previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  {t('dataTransparency.rawData.next', 'Next')}
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('dataTransparency.rawData.noData', 'No raw data available for this source.')}
        </div>
      )}
    </div>
  );
};

/**
 * Audit trail tab showing processing timestamps
 */
const AuditTab: React.FC<{
  metadata: SourceDataMetadata;
  formatDateTime: (date: string | null) => string;
}> = ({ metadata, formatDateTime }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Processing Timeline */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {t('dataTransparency.audit.processingTimeline', 'Processing Timeline')}
        </h4>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t('dataTransparency.audit.dataFetched', 'Data Fetched')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDateTime(metadata.auditInfo.dataFetchedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t('dataTransparency.audit.processingStarted', 'Processing Started')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDateTime(metadata.auditInfo.processingStartedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t('dataTransparency.audit.processingCompleted', 'Processing Completed')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDateTime(metadata.auditInfo.processingCompletedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('dataTransparency.audit.processingDuration', 'Processing Duration')}
          </span>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {(metadata.auditInfo.processingDurationMs / 1000).toFixed(2)}s
          </p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('dataTransparency.audit.dataVersion', 'Data Version')}
          </span>
          <p className="text-lg font-mono text-gray-900 dark:text-white">
            {metadata.auditInfo.dataVersion}
          </p>
        </div>
      </div>

      {/* Report Metadata */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {t('dataTransparency.audit.reportMetadata', 'Report Metadata')}
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">
              {t('dataTransparency.audit.reportId', 'Report ID')}:
            </span>
            <p className="font-mono text-gray-900 dark:text-white text-xs break-all">
              {metadata.reportId}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">
              {t('dataTransparency.audit.parcelId', 'Parcel ID')}:
            </span>
            <p className="font-mono text-gray-900 dark:text-white text-xs break-all">
              {metadata.parcelId}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">
              {t('dataTransparency.audit.generatedAt', 'Generated At')}:
            </span>
            <p className="text-gray-900 dark:text-white">{formatDateTime(metadata.generatedAt)}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">
              {t('dataTransparency.audit.parcelName', 'Parcel Name')}:
            </span>
            <p className="text-gray-900 dark:text-white">{metadata.parcelName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTransparencyModal;
