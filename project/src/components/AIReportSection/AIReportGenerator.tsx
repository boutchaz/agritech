import {  useState, useEffect  } from "react";
import {
  Bot,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Sparkles,
  Settings,
  ArrowRight,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { AIProviderSelector } from './AIProviderSelector';
import { AIReportPreview } from './AIReportPreview';
import { AIReportExport } from './AIReportExport';
import { DataAvailabilityPreview } from './DataAvailabilityPreview';
import { CalibrationStatusPanel } from './CalibrationStatusPanel';
import { useAIProviders, useGenerateAIReport, useAIReportJob, useCalibrationStatus, useCalibrate, useFetchData, usePendingAIReportJobs } from '../../hooks/useAIReports';
import { useSourceDataFromCalibration, useRefreshSourceData } from '../../hooks/useSourceDataMetadata';
import type { AIProvider, AIReportSections } from '../../lib/api/ai-reports';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status-dot';

const PendingJobsBanner = ({ onSelectJob }: { onSelectJob: (jobId: string) => void }) => {
  const { t } = useTranslation();
  const { data, isLoading } = usePendingAIReportJobs();
  
  if (isLoading || !data?.jobs?.length) return null;
  
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        <span className="font-medium text-blue-800 dark:text-blue-300">
          {t('aiReport.pendingJobs', 'Reports en cours de génération')}
        </span>
      </div>
      <div className="space-y-2">
        {data.jobs.map((job) => (
          <Button
            key={job.job_id}
            onClick={() => onSelectJob(job.job_id)}
            className="w-full flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <StatusDot color="blue" size="sm" pulse />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {job.status === 'pending' ? t('aiReport.statusPending', 'En attente...') : t('aiReport.statusProcessing', 'Analyse en cours...')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{job.progress}%</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

interface AIReportGeneratorProps {
  parcelId: string;
  parcelName: string;
  searchParams?: any;
}

export const AIReportGenerator = ({
  parcelId,
  parcelName,
  searchParams,
}: AIReportGeneratorProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const autoRecalibrate = searchParams?.autoRecalibrate === true;
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<{
    sections: AIReportSections;
    generatedAt: string;
    provider: string;
  } | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const { data: providers = [], isLoading: loadingProviders } = useAIProviders();
  const generateMutation = useGenerateAIReport();
  const { job, report, isProcessing, isFailed, isCompleted } = useAIReportJob(currentJobId);
  const { data: calibrationStatus, isLoading: isLoadingCalibration } = useCalibrationStatus(
    parcelId,
    dateRange.start,
    dateRange.end,
  );
  const calibrateMutation = useCalibrate();
  const fetchDataMutation = useFetchData();
  const refreshSourceDataMutation = useRefreshSourceData();

  // Build source data metadata from calibration status
  const sourceDataMetadata = useSourceDataFromCalibration(
    parcelId,
    parcelName,
    dateRange.start,
    dateRange.end,
    calibrationStatus || null,
    generatedReport ? undefined : undefined // Will use report ID when available
  );

  // Auto-select Platform AI (zai) as default if available
  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      const platformAI = providers.find((p) => p.provider === 'zai' && p.available);
      if (platformAI) {
        setSelectedProvider('zai');
      } else {
        // Fallback to first available provider
        const firstAvailable = providers.find((p) => p.available);
        if (firstAvailable) {
          setSelectedProvider(firstAvailable.provider);
        }
      }
    }
  }, [providers, selectedProvider]);

  useEffect(() => {
    if (isCompleted && report) {
      setGeneratedReport({
        sections: report.sections,
        generatedAt: report.generated_at,
        provider: report.provider,
      });
      setCurrentJobId(null);
    }
  }, [isCompleted, report]);

  const handleGenerate = async () => {
    if (!selectedProvider) return;

    try {
      const jobResult = await generateMutation.mutateAsync({
        parcel_id: parcelId,
        provider: selectedProvider,
        data_start_date: dateRange.start,
        data_end_date: dateRange.end,
        language: 'fr',
      });

      setCurrentJobId(jobResult.job_id);
    } catch (error) {
      console.error('Failed to start AI report generation:', error);
    }
  };

  const handleRegenerate = () => {
    setGeneratedReport(null);
    setCurrentJobId(null);
    handleGenerate();
  };

  const isGenerating = generateMutation.isPending || isProcessing;

  const handleAddAnalysis = (type: 'soil' | 'water' | 'plant') => {
    navigate({
      to: '/parcels/$parcelId/analyse',
      params: { parcelId },
      search: { type, returnTo: 'reports' },
    });
  };

  // Auto-recalibrate when returning from analysis tab
  useEffect(() => {
    if (autoRecalibrate && calibrationStatus) {
      const recalibrate = async () => {
        try {
          await calibrateMutation.mutateAsync({
            parcelId,
            request: {
              startDate: dateRange.start,
              endDate: dateRange.end,
              autoFetch: false,
            },
          });
          // Clear the autoRecalibrate flag
          navigate({
            to: '/parcels/$parcelId/reports',
            params: { parcelId },
            search: (prev) => ({ ...prev, autoRecalibrate: undefined }),
          });
        } catch (error) {
          console.error('Auto-recalibration failed:', error);
        }
      };
      recalibrate();
    }
  }, [autoRecalibrate]);

  if (loadingProviders) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {t('aiReport.loadingProviders', 'Chargement des fournisseurs IA...')}
        </span>
      </div>
    );
  }

  const availableProviders = providers.filter((p) => p.available);

  if (availableProviders.length === 0) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-800/30 rounded-full">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">
              {t('aiReport.noProvidersTitle', 'Aucun fournisseur IA configuré')}
            </h4>
            <p className="mt-2 text-yellow-700 dark:text-yellow-400">
              {t(
                'aiReport.noProvidersDescription',
                'Pour générer des rapports IA, veuillez configurer au moins un fournisseur (OpenAI ou Google Gemini) dans les paramètres de votre organisation.'
              )}
            </p>
            <div className="mt-4">
              <Link
                to="/settings/organization"
                search={{ tab: 'ai-providers' }}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                <Settings className="w-4 h-4" />
                <span>{t('aiReport.configureProviders', 'Configurer les fournisseurs IA')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="mt-3 text-xs text-yellow-600 dark:text-yellow-500">
              {t(
                'aiReport.securityNote',
                'Vos clés API sont chiffrées et stockées de manière sécurisée.'
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Jobs Banner */}
      <PendingJobsBanner onSelectJob={(jobId) => setCurrentJobId(jobId)} />

      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl shadow-lg">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('aiReport.title', 'Rapport IA Intelligent')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t(
              'aiReport.subtitle',
              'Analyse approfondie de votre parcelle par intelligence artificielle'
            )}
          </p>
        </div>
      </div>

      {/* Configuration Panel */}
      {!generatedReport && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {/* Provider Selection */}
          <AIProviderSelector
            providers={providers}
            selectedProvider={selectedProvider}
            onSelect={setSelectedProvider}
            disabled={isGenerating}
          />

          {/* Date Range */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('aiReport.dateRange', 'Période d\'analyse')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('aiReport.startDate', 'Date de début')}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, start: e.target.value }))
                    }
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isGenerating}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('aiReport.endDate', 'Date de fin')}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Calibration Status Panel */}
          {calibrationStatus && (
            <CalibrationStatusPanel
              status={calibrationStatus}
              parcelId={parcelId}
              onRecalibrate={async () => {
                try {
                  await calibrateMutation.mutateAsync({
                    parcelId,
                    request: {
                      startDate: dateRange.start,
                      endDate: dateRange.end,
                      autoFetch: true,
                    },
                  });
                } catch (error) {
                  console.error('Recalibration failed:', error);
                }
              }}
              onFetchData={async (sources) => {
                try {
                  await fetchDataMutation.mutateAsync({
                    parcelId,
                    request: { dataSources: sources as ('satellite' | 'weather')[] },
                  });
                } catch (error) {
                  console.error('Data fetch failed:', error);
                }
              }}
              onAddAnalysis={handleAddAnalysis}
              isLoading={calibrateMutation.isPending || fetchDataMutation.isPending}
            />
          )}

          {/* Legacy Data Availability Preview (can be removed or kept for reference) */}
          <DataAvailabilityPreview
            parcelId={parcelId}
            startDate={dateRange.start}
            endDate={dateRange.end}
          />

          {/* Error Display */}
          {(generateMutation.isError || isFailed) && (
            <div className="flex items-start p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-red-800 dark:text-red-300 font-medium">
                  {t('aiReport.errorTitle', 'Erreur de génération')}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {job?.error_message || (generateMutation.error as Error)?.message ||
                    t('aiReport.errorGeneric', 'Une erreur est survenue. Veuillez réessayer.')}
                </p>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={
              !selectedProvider ||
              isGenerating ||
              calibrationStatus?.status === 'blocked'
            }
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('aiReport.generating', 'Analyse en cours...')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{t('aiReport.generateButton', 'Générer le rapport IA')}</span>
              </>
            )}
          </Button>
          {calibrationStatus?.status === 'blocked' && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center mt-2">
              {t(
                'calibration.blocked',
                'Analysis blocked: Missing critical data. Please recalibrate and fetch missing data.',
              )}
            </p>
          )}

          {isGenerating && (
            <div className="text-center space-y-3">
              {job && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {job?.status === 'pending' && t('aiReport.statusPending', 'Préparation de l\'analyse...')}
                {job?.status === 'processing' && t('aiReport.statusProcessing', 'L\'IA analyse vos données...')}
                {!job && t('aiReport.generatingHint', 'L\'IA analyse vos données satellites, analyses de sol et autres informations...')}
              </p>
              <div className="flex justify-center space-x-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generated Report */}
      {generatedReport && (
        <div className="space-y-4">
          {/* Report Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Bot className="w-4 h-4" />
              <span>
                {t('aiReport.generatedWith', 'Généré avec')}{' '}
                {generatedReport.provider === 'openai' ? 'OpenAI GPT-4' : generatedReport.provider === 'zai' ? 'Platform AI (GLM-4.5)' : 'Google Gemini'}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`}
                />
                <span>{t('aiReport.regenerate', 'Régénérer')}</span>
              </Button>
              <AIReportExport
                sections={generatedReport.sections}
                parcelName={parcelName}
                generatedAt={generatedReport.generatedAt}
                provider={generatedReport.provider}
                onPreview={() => setShowFullPreview(true)}
              />
            </div>
          </div>

          {/* Report Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <AIReportPreview
              sections={generatedReport.sections}
              generatedAt={generatedReport.generatedAt}
              sourceDataMetadata={sourceDataMetadata}
              onRefreshSourceData={(sources) => {
                refreshSourceDataMutation.mutate({
                  parcelId,
                  sources: sources.filter((s): s is 'satellite' | 'weather' =>
                    ['satellite', 'weather'].includes(s)
                  ),
                });
              }}
              isRefreshingSourceData={refreshSourceDataMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {showFullPreview && generatedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="min-h-screen px-4 py-8">
            <div className="relative max-w-5xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('aiReport.fullPreview', 'Rapport IA Complet')} - {parcelName}
                </h2>
                <div className="flex items-center gap-3">
                  <AIReportExport
                    sections={generatedReport.sections}
                    parcelName={parcelName}
                    generatedAt={generatedReport.generatedAt}
                    provider={generatedReport.provider}
                  />
                  <Button
                    onClick={() => setShowFullPreview(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </Button>
                </div>
              </div>
              <div className="p-6 max-h-[80vh] overflow-y-auto">
                <AIReportPreview
                  sections={generatedReport.sections}
                  generatedAt={generatedReport.generatedAt}
                  sourceDataMetadata={sourceDataMetadata}
                  onRefreshSourceData={(sources) => {
                    refreshSourceDataMutation.mutate({
                      parcelId,
                      sources: sources.filter((s): s is 'satellite' | 'weather' =>
                        ['satellite', 'weather'].includes(s)
                      ),
                    });
                  }}
                  isRefreshingSourceData={refreshSourceDataMutation.isPending}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIReportGenerator;
