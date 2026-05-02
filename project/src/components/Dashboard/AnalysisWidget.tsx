import {  useMemo, useState  } from "react";
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { TestTube, ChevronRight, AlertCircle, CheckCircle, Leaf, Droplets } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAnalysesByFarm } from '../../hooks/useAnalysesQuery';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { fr } from 'date-fns/locale';
import { ar } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import type { Analysis, AnalysisType, SoilAnalysisData, PlantAnalysisData, WaterAnalysisData } from '../../types/analysis';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const AnalysisWidget = () => {
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

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 h-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <Skeleton className="h-5 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
          {[1, 2, 3].map((_, skIdx) => (
            <Skeleton key={"sk-" + skIdx} className="flex-1 h-9 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between px-1 mb-3">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-px flex-1 mx-3 rounded" />
          </div>
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
            <TestTube className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight uppercase">
            {t('dashboard.widgets.analysis.title', 'Analyses')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewAnalyses}
          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 h-8 rounded-xl px-2 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
        {tabs.map(({ type, icon: Icon }) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all",
              activeType === type
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-700"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t(`dashboard.widgets.analysis.tabs.${type}`, type)}</span>
          </button>
        ))}
      </div>

      {stats.total > 0 ? (
        <div className="space-y-6 flex-1 flex flex-col">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 overflow-hidden group/card border border-slate-100 dark:border-slate-700/50">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
              <div className="relative">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.widgets.analysis.total', 'Total')}</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{stats.total}</div>
                <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-tighter">{t('dashboard.widgets.analysis.analyses', 'analyses')}</div>
              </div>
            </div>

            <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 overflow-hidden group/card border border-slate-100 dark:border-slate-700/50">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
              <div className="relative">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.widgets.analysis.recent', 'Recent')}</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{stats.recent}</div>
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-tighter">Last 30 days</div>
              </div>
            </div>
          </div>

          {/* Attention Needed */}
          {stats.needsAttention > 0 && (
            <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-center gap-4 animate-pulse">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300 uppercase tracking-widest">
                  {t('dashboard.widgets.analysis.needsAttention', { count: stats.needsAttention })}
                </p>
                <p className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-tight mt-0.5">
                  {t('dashboard.widgets.analysis.outOfNorm')}
                </p>
              </div>
            </div>
          )}

          {/* Latest Analysis */}
          {stats.latestAnalysis && (
            <div className="mt-auto">
              <div className="flex items-center justify-between mb-3 px-1">
                <h4 className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {t('dashboard.widgets.analysis.latestAnalysis', 'Latest Analysis')}
                </h4>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate uppercase tracking-tight">
                      {t('dashboard.widgets.analysis.parcel', 'Parcel')}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                      {format(parseISO(stats.latestAnalysis.analysis_date), 'dd MMM yyyy', { locale: getLocale() })}
                    </p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {getPrimaryIndicator(stats.latestAnalysis).label}
                    </div>
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 tabular-nums leading-none mt-1">
                      {getPrimaryIndicator(stats.latestAnalysis).value}
                    </div>
                  </div>
                </div>

                {/* Secondary Indicators */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                  {getSecondaryIndicators(stats.latestAnalysis).map((indicator) => (
                    indicator.value !== undefined && indicator.value !== null && (
                      <div key={indicator.label} className="text-center bg-slate-50 dark:bg-slate-900/50 py-2 rounded-xl border border-slate-100 dark:border-slate-700/30">
                        <div className="text-[8px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">{indicator.label}</div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums mt-0.5">
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
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full mt-auto">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">{t('dashboard.widgets.analysis.allInNorm')}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto flex-1 flex flex-col justify-center">
          <TestTube className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
            {t('dashboard.widgets.analysis.empty', 'No analyses available')}
          </p>
          <Button
            type="button"
            variant="blue"
            size="sm"
            onClick={handleViewAnalyses}
            className="w-fit mx-auto font-bold text-[10px] uppercase tracking-widest rounded-xl px-4"
          >
            {t('dashboard.widgets.analysis.addAnalysis', 'Add New')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnalysisWidget;
