import {  useMemo  } from "react";
import { useNavigate } from '@tanstack/react-router';
import { ChevronRight, Package as PackageIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useHarvests } from '../../hooks/useHarvests';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { fr } from 'date-fns/locale';
import { ar } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
const HarvestSummaryWidget = () => {
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
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 h-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <Skeleton className="h-5 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between px-1 mb-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-px flex-1 mx-3 rounded" />
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-6 w-8 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 sm:p-5 hover:shadow-md transition-all duration-300 flex flex-col h-full min-h-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <PackageIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('dashboard.widgets.harvests.title')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewHarvests}
          className="text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 h-8 rounded-xl px-2 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {stats.total > 0 ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 min-w-0">
            <div className="min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.widgets.harvests.thisMonth')}</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <div className="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none">
                  {stats.thisMonth}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t('dashboard.widgets.harvests.harvests')}
                </div>
              </div>
            </div>

            <div className="min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.widgets.harvests.quantity')}</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <div className="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none">
                  {stats.thisMonthQuantity.toFixed(0)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t('dashboard.widgets.harvests.kgThisMonth')}
                </div>
              </div>
            </div>
          </div>

          {/* Latest Harvest */}
          {stats.lastHarvest && (
            <div className="mt-auto">
              <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t('dashboard.widgets.harvests.lastHarvest')}
              </h4>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {stats.lastHarvest.parcel_name || t('dashboard.widgets.harvests.parcel')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {format(parseISO(stats.lastHarvest.harvest_date), 'dd MMM yyyy', { locale: getLocale() })}
                    </p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-base font-medium text-orange-600 dark:text-orange-400 tabular-nums leading-none">
                      {stats.lastHarvest.quantity?.toFixed(0) || 0} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{stats.lastHarvest.unit || t('dashboard.widgets.harvests.kg')}</span>
                    </div>
                    {stats.lastHarvest.quality_grade && (
                      <Badge className="mt-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-none">
                        {stats.lastHarvest.quality_grade}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Total Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.widgets.harvests.totalHarvests')}</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">{stats.total}</span>
          </div>
        </>
      ) : (
        <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 mt-auto">
          <PackageIcon className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" strokeWidth={1.75} />
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {t('dashboard.widgets.harvests.empty')}
          </p>
          <Button type="button" variant="orange" size="sm" onClick={handleViewHarvests}>
            {t('dashboard.widgets.harvests.record')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default HarvestSummaryWidget;
