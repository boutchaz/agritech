
import { useNavigate } from '@tanstack/react-router';
import { MapPin, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFarms, useParcelsByFarms } from '../../hooks/useParcelsQuery';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
const ParcelsOverviewWidget = () => {
  const navigate = useNavigate();
  const { currentOrganization, currentFarm } = useAuth();
  const { t } = useTranslation();

  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const farmIds = currentFarm?.id ? [currentFarm.id] : farms.map(f => f.id);
  const { data: parcels = [], isLoading } = useParcelsByFarms(farmIds, currentOrganization?.id);

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
    <div className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 sm:p-5 hover:shadow-md transition-all duration-300 flex flex-col h-full min-h-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
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
      <div className="grid grid-cols-2 gap-3 mb-4 min-w-0">
        <div className="min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.widgets.parcels.total')}</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <div className="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none">
              {parcels.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.widgets.parcels.parcels')}
            </div>
          </div>
        </div>

        <div className="min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.widgets.parcels.surface')}</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <div className="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none">
              {totalArea.toFixed(1)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.widgets.parcels.hectares')}
            </div>
          </div>
        </div>
      </div>

      {/* Top Crops */}
      {topCrops.length > 0 ? (
        <div className="mt-auto">
          <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            {t('dashboard.widgets.parcels.topCrops')}
          </h4>
          <div className="space-y-1.5">
            {topCrops.map(([crop, count]) => (
              <div key={crop} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                  {crop}
                </span>
                <Badge variant="secondary" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-none tabular-nums">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ) : parcels.length > 0 ? null : (
        <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 mt-auto">
          <MapPin className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" strokeWidth={1.75} />
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {t('dashboard.widgets.parcels.empty')}
          </p>
          <Button size="sm" onClick={handleViewParcels}>
            {t('dashboard.widgets.parcels.create')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ParcelsOverviewWidget;
