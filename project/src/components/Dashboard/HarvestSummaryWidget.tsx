import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { TrendingUp, ChevronRight, Calendar, Package as PackageIcon } from 'lucide-react';
import { useAuth } from '../MultiTenantAuthProvider';
import { useHarvests } from '../../hooks/useHarvests';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { fr } from 'date-fns/locale';
import { ar } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';

const HarvestSummaryWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const { t, i18n } = useTranslation();
  const { data: harvests = [], isLoading } = useHarvests(currentOrganization?.id || '');

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
    if (!harvests || harvests.length === 0) {
      return { total: 0, thisMonth: 0, thisMonthQuantity: 0, lastHarvest: null };
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisMonthHarvests = harvests.filter(h => {
      const harvestDate = new Date(h.harvest_date);
      return harvestDate >= monthStart && harvestDate <= monthEnd;
    });

    const thisMonthQuantity = thisMonthHarvests.reduce((sum, h) => sum + (h.quantity || 0), 0);

    // Sort by date to get latest
    const sorted = [...harvests].sort((a, b) =>
      new Date(b.harvest_date).getTime() - new Date(a.harvest_date).getTime()
    );

    return {
      total: harvests.length,
      thisMonth: thisMonthHarvests.length,
      thisMonthQuantity,
      lastHarvest: sorted[0]
    };
  }, [harvests]);

  const handleViewHarvests = () => {
    navigate({ to: '/harvests' });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/40 dark:to-orange-900/20 rounded-xl">
            <PackageIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('dashboard.widgets.harvests.title')}
          </h3>
        </div>
        <button
          onClick={handleViewHarvests}
          className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 transition-colors"
        >
          {t('dashboard.widgets.viewAll')}
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {stats.total > 0 ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="relative bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/30 dark:to-orange-900/10 rounded-xl p-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200/20 dark:bg-orange-400/10 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider">{t('dashboard.widgets.harvests.thisMonth')}</span>
                  <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
                  {stats.thisMonth}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {t('dashboard.widgets.harvests.harvests')}
                </div>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-900/10 rounded-xl p-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/20 dark:bg-green-400/10 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">{t('dashboard.widgets.harvests.quantity')}</span>
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
                  {stats.thisMonthQuantity.toFixed(0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {t('dashboard.widgets.harvests.kgThisMonth')}
                </div>
              </div>
            </div>
          </div>

          {/* Latest Harvest */}
          {stats.lastHarvest && (
            <div>
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                {t('dashboard.widgets.harvests.lastHarvest')}
              </h4>
              <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-900/20 rounded-lg hover:from-orange-50 hover:to-orange-50/50 dark:hover:from-orange-900/20 dark:hover:to-orange-900/10 transition-all duration-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {stats.lastHarvest.parcel_name || t('dashboard.widgets.harvests.parcel')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {format(parseISO(stats.lastHarvest.harvest_date), 'dd MMMM yyyy', { locale: getLocale() })}
                    </p>
                    {stats.lastHarvest.crop_name && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1">
                        {stats.lastHarvest.crop_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {stats.lastHarvest.quantity?.toFixed(0) || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {stats.lastHarvest.unit || t('dashboard.widgets.harvests.kg')}
                    </div>
                  </div>
                </div>

                {stats.lastHarvest.quality_grade && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('dashboard.widgets.harvests.quality')}:</span>
                    <span className="text-xs font-bold px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg">
                      {stats.lastHarvest.quality_grade}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Total Stats */}
          <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.widgets.harvests.totalHarvests')}</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center">
            <PackageIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            {t('dashboard.widgets.harvests.empty')}
          </p>
          <button
            onClick={handleViewHarvests}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-lg transition-colors"
          >
            <PackageIcon className="h-4 w-4" />
            {t('dashboard.widgets.harvests.record')}
          </button>
        </div>
      )}
    </div>
  );
};

export default HarvestSummaryWidget;
