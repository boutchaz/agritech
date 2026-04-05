import {  useMemo  } from "react";
import { useNavigate } from '@tanstack/react-router';
import { TrendingUp, ChevronRight, Calendar, Package as PackageIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <PackageIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 min-w-0">
            <div className="relative min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 sm:p-4 overflow-hidden group/card">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
              <div className="relative min-w-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide sm:tracking-wider leading-tight break-words hyphens-auto">{t('dashboard.widgets.harvests.thisMonth')}</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
                  {stats.thisMonth}
                </div>
                <div className="text-[10px] font-bold text-orange-600 dark:text-orange-400 mt-1 uppercase tracking-tight leading-tight break-words">
                  {t('dashboard.widgets.harvests.harvests')}
                </div>
              </div>
            </div>

            <div className="relative min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 sm:p-4 overflow-hidden group/card">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
              <div className="relative min-w-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide sm:tracking-wider leading-tight break-words hyphens-auto">{t('dashboard.widgets.harvests.quantity')}</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
                  {stats.thisMonthQuantity.toFixed(0)}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-tight leading-tight break-words">
                  {t('dashboard.widgets.harvests.kgThisMonth')}
                </div>
              </div>
            </div>
          </div>

          {/* Latest Harvest */}
          {stats.lastHarvest && (
            <div className="mt-auto">
              <div className="flex items-center justify-between mb-3 px-1">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {t('dashboard.widgets.harvests.lastHarvest')}
                </h4>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm hover:shadow group/item">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                      {stats.lastHarvest.parcel_name || t('dashboard.widgets.harvests.parcel')}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                      {format(parseISO(stats.lastHarvest.harvest_date), 'dd MMM yyyy', { locale: getLocale() })}
                    </p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-lg font-black text-orange-600 dark:text-orange-400 tabular-nums leading-none">
                      {stats.lastHarvest.quantity?.toFixed(0) || 0}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {stats.lastHarvest.unit || t('dashboard.widgets.harvests.kg')}
                    </div>
                  </div>
                </div>

                {stats.lastHarvest.quality_grade && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.widgets.harvests.quality')}</span>
                    <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-none font-black text-[9px] tracking-widest px-2 py-0.5">
                      {stats.lastHarvest.quality_grade}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Total Footer */}
          <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.widgets.harvests.totalHarvests')}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg">{stats.total}</span>
          </div>
        </>
      ) : (
        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto">
          <PackageIcon className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
            {t('dashboard.widgets.harvests.empty')}
          </p>
          <Button
            size="sm"
            onClick={handleViewHarvests}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl px-4"
          >
            {t('dashboard.widgets.harvests.record')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default HarvestSummaryWidget;
