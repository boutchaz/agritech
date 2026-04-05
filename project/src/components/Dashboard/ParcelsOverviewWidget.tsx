
import { useNavigate } from '@tanstack/react-router';
import { MapPin, TrendingUp, ChevronRight, Layers } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFarms, useParcelsByFarms } from '../../hooks/useParcelsQuery';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ParcelsOverviewWidget = () => {
  const navigate = useNavigate();
  const { currentOrganization, currentFarm } = useAuth();
  const { t } = useTranslation();

  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const farmIds = currentFarm?.id ? [currentFarm.id] : farms.map(f => f.id);
  const { data: parcels = [], isLoading } = useParcelsByFarms(farmIds);

  // Calculate statistics
  const totalArea = parcels.reduce((sum, p) => sum + (p.calculated_area || p.area || 0), 0);
  const parcelsByCrop = parcels.reduce((acc, p) => {
    // Try multiple fields in order of specificity: variety > crop_type > tree_type > crop_category
    const cropType = p.variety || p.crop_type || p.tree_type || p.crop_category || t('dashboard.widgets.parcels.unspecifiedCrop');
    acc[cropType] = (acc[cropType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCrops = Object.entries(parcelsByCrop)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const handleViewParcels = () => {
    navigate({ to: '/parcels' });
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
          {[1, 2, 3].map((_, skIdx) => (
            <Skeleton key={"sk-" + skIdx} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-50 dark:bg-green-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
            {t('dashboard.widgets.parcels.title')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewParcels}
          className="text-slate-400 hover:text-green-600 dark:hover:text-green-400 h-8 rounded-xl px-2 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 min-w-0">
        <div className="relative min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 sm:p-4 overflow-hidden group/card">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
          <div className="relative min-w-0">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide sm:tracking-wider leading-tight break-words hyphens-auto">{t('dashboard.widgets.parcels.total')}</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
              {parcels.length}
            </div>
            <div className="text-[10px] font-bold text-green-600 dark:text-green-400 mt-1 uppercase tracking-tight leading-tight break-words">
              {t('dashboard.widgets.parcels.parcels')}
            </div>
          </div>
        </div>

        <div className="relative min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 sm:p-4 overflow-hidden group/card">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
          <div className="relative min-w-0">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide sm:tracking-wider leading-tight break-words hyphens-auto">{t('dashboard.widgets.parcels.surface')}</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
              {totalArea.toFixed(1)}
            </div>
            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-tight leading-tight break-words">
              {t('dashboard.widgets.parcels.hectares')}
            </div>
          </div>
        </div>
      </div>

      {/* Top Crops */}
      {topCrops.length > 0 ? (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('dashboard.widgets.parcels.topCrops')}
            </h4>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
          </div>
          <div className="space-y-2">
            {topCrops.map(([crop, count]) => (
              <div key={crop} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm hover:shadow group/item">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                  {crop}
                </span>
                <Badge variant="secondary" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-none font-bold tabular-nums">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ) : parcels.length > 0 ? null : (
        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto">
          <MapPin className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
            {t('dashboard.widgets.parcels.empty')}
          </p>
          <Button
            size="sm"
            onClick={handleViewParcels}
            className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl px-4"
          >
            {t('dashboard.widgets.parcels.create')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ParcelsOverviewWidget;
