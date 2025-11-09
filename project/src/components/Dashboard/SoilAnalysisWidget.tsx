import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { TestTube, TrendingUp, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../MultiTenantAuthProvider';
import { useSoilAnalyses } from '../../hooks/useSoilAnalyses';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { fr } from 'date-fns/locale';
import { ar } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';

const SoilAnalysisWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentFarm } = useAuth();
  const { t, i18n } = useTranslation();
  const { analyses, loading } = useSoilAnalyses(currentFarm?.id || '');

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

  // Calculate statistics
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

    // Analyses needing attention (low pH or nutrient deficiency)
    const needsAttention = analyses.filter(a => {
      const ph = a.ph_level || 0;
      const nitrogen = a.nitrogen_level || 0;
      const phosphorus = a.phosphorus_level || 0;
      const potassium = a.potassium_level || 0;

      return ph < 6.0 || ph > 7.5 || nitrogen < 20 || phosphorus < 15 || potassium < 150;
    }).length;

    return {
      total: analyses.length,
      recent,
      needsAttention,
      latestAnalysis: sorted[0]
    };
  }, [analyses]);

  const handleViewAnalyses = () => {
    navigate({ to: '/soil-analysis' });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TestTube className="h-5 w-5 text-teal-600" />
          {t('dashboard.widgets.soil.title')}
        </h3>
        <button
          onClick={handleViewAnalyses}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
        >
          {t('dashboard.widgets.viewAll')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {stats.total > 0 ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.widgets.soil.total')}</span>
                <TestTube className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.widgets.soil.analyses')}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.widgets.soil.recent')}</span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.recent}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.widgets.soil.last30Days')}
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
                    {t('dashboard.widgets.soil.needsAttention', { count: stats.needsAttention })}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {t('dashboard.widgets.soil.outOfNorm')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Latest Analysis */}
          {stats.latestAnalysis && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('dashboard.widgets.soil.latestAnalysis')}
              </h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {stats.latestAnalysis.parcel_name || t('dashboard.widgets.soil.parcel')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(parseISO(stats.latestAnalysis.analysis_date), 'dd MMMM yyyy', { locale: getLocale() })}
                    </p>
                  </div>
                  {stats.latestAnalysis.ph_level && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">pH</div>
                      <div className="text-sm font-bold text-teal-600 dark:text-teal-400">
                        {stats.latestAnalysis.ph_level.toFixed(1)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Nutrient Levels */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {stats.latestAnalysis.nitrogen_level !== null && (
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400">N</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {stats.latestAnalysis.nitrogen_level}
                      </div>
                    </div>
                  )}
                  {stats.latestAnalysis.phosphorus_level !== null && (
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400">P</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {stats.latestAnalysis.phosphorus_level}
                      </div>
                    </div>
                  )}
                  {stats.latestAnalysis.potassium_level !== null && (
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400">K</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {stats.latestAnalysis.potassium_level}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {stats.needsAttention === 0 && stats.total > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>{t('dashboard.widgets.soil.allInNorm')}</span>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6">
          <TestTube className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.widgets.soil.empty')}
          </p>
          <button
            onClick={handleViewAnalyses}
            className="mt-2 text-sm text-green-600 hover:text-green-700 dark:text-green-400"
          >
            {t('dashboard.widgets.soil.addAnalysis')}
          </button>
        </div>
      )}
    </div>
  );
};

export default SoilAnalysisWidget;
