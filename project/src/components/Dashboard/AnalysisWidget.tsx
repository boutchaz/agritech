import React, { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { TestTube, TrendingUp, ChevronRight, AlertCircle, CheckCircle, Leaf, Droplets } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAnalysesByFarm } from '../../hooks/useAnalysesQuery';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { fr } from 'date-fns/locale';
import { ar } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import type { Analysis, AnalysisType, SoilAnalysisData, PlantAnalysisData, WaterAnalysisData } from '../../types/analysis';

const AnalysisWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentFarm, currentOrganization } = useAuth();
  const { t, i18n } = useTranslation();
  const [activeType, setActiveType] = useState<AnalysisType>('soil');

  const { data: analyses = [], isLoading } = useAnalysesByFarm(
    currentFarm?.id,
    activeType,
    currentOrganization?.id
  );

  // Get locale for date formatting
  const getLocale = () => {
    switch (i18n.language) {
      case 'fr':
        return fr;
      case 'ar':
        return ar;
      default:
        return enUS;
    }
  };

  // Tab configuration
  const tabs = [
    { type: 'soil' as AnalysisType, icon: TestTube, color: 'teal' },
    { type: 'plant' as AnalysisType, icon: Leaf, color: 'green' },
    { type: 'water' as AnalysisType, icon: Droplets, color: 'blue' },
  ];

  // Calculate statistics based on analysis type
  const stats = useMemo(() => {
    if (!analyses || analyses.length === 0) {
      return { total: 0, recent: 0, needsAttention: 0, latestAnalysis: null };
    }

    // Sort by date
    const sorted = [...analyses].sort((a, b) =>
      new Date(b.analysis_date).getTime() - new Date(a.analysis_date).getTime()
    );

    // Recent analyses (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = sorted.filter(a =>
      new Date(a.analysis_date) > thirtyDaysAgo
    ).length;

    // Calculate needs attention based on analysis type
    let needsAttention = 0;

    if (activeType === 'soil') {
      needsAttention = analyses.filter(a => {
        const data = a.data as SoilAnalysisData;
        const ph = data.ph_level || 0;
        const nitrogen = data.nitrogen_ppm || 0;
        const phosphorus = data.phosphorus_ppm || 0;
        const potassium = data.potassium_ppm || 0;
        return ph < 6.0 || ph > 7.5 || nitrogen < 20 || phosphorus < 15 || potassium < 150;
      }).length;
    } else if (activeType === 'plant') {
      needsAttention = analyses.filter(a => {
        const data = a.data as PlantAnalysisData;
        const chlorophyll = data.chlorophyll_content || 0;
        const stressIndicators = data.stress_indicators || [];
        return chlorophyll < 30 || stressIndicators.length > 0;
      }).length;
    } else if (activeType === 'water') {
      needsAttention = analyses.filter(a => {
        const data = a.data as WaterAnalysisData;
        const ph = data.ph_level || 0;
        const ec = data.ec_ds_per_m || 0;
        const suitability = data.irrigation_suitability;
        return ph < 6.5 || ph > 8.5 || ec > 3 || suitability === 'poor' || suitability === 'unsuitable';
      }).length;
    }

    return {
      total: analyses.length,
      recent,
      needsAttention,
      latestAnalysis: sorted[0] as Analysis | null
    };
  }, [analyses, activeType]);

  // Get primary indicator for latest analysis based on type
  const getPrimaryIndicator = (analysis: Analysis) => {
    if (activeType === 'soil') {
      const data = analysis.data as SoilAnalysisData;
      return { label: 'pH', value: data.ph_level?.toFixed(1) || '-' };
    } else if (activeType === 'plant') {
      const data = analysis.data as PlantAnalysisData;
      return { label: t('dashboard.widgets.analysis.chlorophyll', 'Chlorophyll'), value: data.chlorophyll_content?.toString() || '-' };
    } else {
      const data = analysis.data as WaterAnalysisData;
      return { label: 'pH', value: data.ph_level?.toFixed(1) || '-' };
    }
  };

  // Get secondary indicators for latest analysis based on type
  const getSecondaryIndicators = (analysis: Analysis) => {
    if (activeType === 'soil') {
      const data = analysis.data as SoilAnalysisData;
      return [
        { label: 'N', value: data.nitrogen_ppm },
        { label: 'P', value: data.phosphorus_ppm },
        { label: 'K', value: data.potassium_ppm },
      ];
    } else if (activeType === 'plant') {
      const data = analysis.data as PlantAnalysisData;
      return [
        { label: 'N%', value: data.nitrogen_percentage },
        { label: 'P%', value: data.phosphorus_percentage },
        { label: 'K%', value: data.potassium_percentage },
      ];
    } else {
      const data = analysis.data as WaterAnalysisData;
      return [
        { label: 'EC', value: data.ec_ds_per_m },
        { label: 'TDS', value: data.tds_ppm },
        { label: 'SAR', value: data.sar },
      ];
    }
  };

  const handleViewAnalyses = () => {
    navigate({ to: '/analytics' });
  };

  const getActiveColor = () => {
    switch (activeType) {
      case 'soil': return 'teal';
      case 'plant': return 'green';
      case 'water': return 'blue';
      default: return 'teal';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const color = getActiveColor();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TestTube className={`h-5 w-5 text-${color}-600`} />
          {t('dashboard.widgets.analysis.title', 'Analyses')}
        </h3>
        <button
          onClick={handleViewAnalyses}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
        >
          {t('dashboard.widgets.viewAll')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
        {tabs.map(({ type, icon: Icon, color: tabColor }) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeType === type
                ? `bg-white dark:bg-gray-600 text-${tabColor}-600 dark:text-${tabColor}-400 shadow-sm`
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t(`dashboard.widgets.analysis.tabs.${type}`, type)}</span>
          </button>
        ))}
      </div>

      {stats.total > 0 ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.widgets.analysis.total', 'Total')}</span>
                <TestTube className={`h-4 w-4 text-${color}-600`} />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.widgets.analysis.analyses', 'analyses')}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.widgets.analysis.recent', 'Recent')}</span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.recent}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.widgets.analysis.last30Days', 'last 30 days')}
              </div>
            </div>
          </div>

          {/* Attention Needed */}
          {stats.needsAttention > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    {t('dashboard.widgets.analysis.needsAttention', { count: stats.needsAttention })}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {t('dashboard.widgets.analysis.outOfNorm', 'Parameters out of normal range')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Latest Analysis */}
          {stats.latestAnalysis && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('dashboard.widgets.analysis.latestAnalysis', 'Latest Analysis')}
              </h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('dashboard.widgets.analysis.parcel', 'Parcel')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(parseISO(stats.latestAnalysis.analysis_date), 'dd MMMM yyyy', { locale: getLocale() })}
                    </p>
                  </div>
                  {stats.latestAnalysis && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getPrimaryIndicator(stats.latestAnalysis).label}
                      </div>
                      <div className={`text-sm font-bold text-${color}-600 dark:text-${color}-400`}>
                        {getPrimaryIndicator(stats.latestAnalysis).value}
                      </div>
                    </div>
                  )}
                </div>

                {/* Secondary Indicators */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {stats.latestAnalysis && getSecondaryIndicators(stats.latestAnalysis).map((indicator, idx) => (
                    indicator.value !== undefined && indicator.value !== null && (
                      <div key={idx} className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">{indicator.label}</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {typeof indicator.value === 'number' ? indicator.value.toFixed(1) : indicator.value}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {stats.needsAttention === 0 && stats.total > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-4">
              <CheckCircle className="h-4 w-4" />
              <span>{t('dashboard.widgets.analysis.allInNorm', 'All analyses are within normal range')}</span>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6">
          <TestTube className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.widgets.analysis.empty', 'No analyses available')}
          </p>
          <button
            onClick={handleViewAnalyses}
            className="mt-2 text-sm text-green-600 hover:text-green-700 dark:text-green-400"
          >
            {t('dashboard.widgets.analysis.addAnalysis', 'Add an analysis')}
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalysisWidget;
