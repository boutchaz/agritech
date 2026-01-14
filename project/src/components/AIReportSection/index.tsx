import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Loader, AlertCircle, Calendar } from 'lucide-react';
import { useAIProviders, useGenerateAIReport } from '../../hooks/useAIReports';
import type { AIProvider, AIReportResponse } from '../../lib/api/ai-reports';
import { AIProviderSelector } from './AIProviderSelector';
import { AIReportPreview } from './AIReportPreview';
import { AIReportExport } from './AIReportExport';

interface AIReportSectionProps {
  parcelId: string;
  parcelName: string;
}

export const AIReportSection: React.FC<AIReportSectionProps> = ({
  parcelId,
  parcelName,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [generatedReport, setGeneratedReport] = useState<AIReportResponse | null>(null);

  const { data: providers, isLoading: loadingProviders, error: providersError } = useAIProviders();
  const generateMutation = useGenerateAIReport();

  // Auto-select Platform AI (zai) as default if available
  useEffect(() => {
    if (providers && !selectedProvider) {
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

  const handleGenerate = async () => {
    if (!selectedProvider) return;

    try {
      const report = await generateMutation.mutateAsync({
        parcel_id: parcelId,
        provider: selectedProvider,
        data_start_date: dateRange.start,
        data_end_date: dateRange.end,
        language: 'fr',
      });
      setGeneratedReport(report);
    } catch (error) {
      console.error('Error generating AI report:', error);
    }
  };

  const availableProviders = providers?.filter(p => p.available) || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Rapport IA
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Générez une analyse intelligente basée sur toutes les données de la parcelle
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Loading Providers */}
        {loadingProviders && (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-purple-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Chargement des fournisseurs IA...
            </span>
          </div>
        )}

        {/* Providers Error */}
        {providersError && (
          <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" />
            <p className="text-red-600 dark:text-red-400">
              Erreur lors du chargement des fournisseurs IA
            </p>
          </div>
        )}

        {/* No Providers Available */}
        {!loadingProviders && availableProviders.length === 0 && !providersError && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aucun fournisseur IA disponible
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Veuillez configurer les clés API OpenAI ou Gemini dans les paramètres du serveur.
            </p>
          </div>
        )}

        {/* Configuration Section */}
        {!loadingProviders && providers && providers.length > 0 && !generatedReport && (
          <div className="space-y-6">
            {/* Provider Selector */}
            <AIProviderSelector
              providers={providers}
              selectedProvider={selectedProvider}
              onSelect={setSelectedProvider}
              disabled={generateMutation.isPending}
            />

            {/* Date Range */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Période d'analyse
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Date de début
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange((prev) => ({ ...prev, start: e.target.value }))
                      }
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Date de fin
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange((prev) => ({ ...prev, end: e.target.value }))
                      }
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedProvider || generateMutation.isPending}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Générer le Rapport IA</span>
                </>
              )}
            </button>

            {/* Generation Error */}
            {generateMutation.isError && (
              <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" />
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {(generateMutation.error as Error)?.message ||
                    'Erreur lors de la génération du rapport'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generated Report Preview */}
        {generatedReport && (
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setGeneratedReport(null)}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                ← Générer un nouveau rapport
              </button>
              <AIReportExport
                sections={generatedReport.sections}
                parcelName={parcelName}
                generatedAt={generatedReport.generated_at}
                provider={generatedReport.provider}
              />
            </div>

            {/* Preview */}
            <AIReportPreview
              sections={generatedReport.sections}
              generatedAt={generatedReport.generated_at}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AIReportSection;
