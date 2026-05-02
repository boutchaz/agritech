import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { DollarSign, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useFarms, useParcelsByFarms } from '@/hooks/useParcelsQuery';
import { profitabilityApi, type AnalysisParcelRow } from '@/lib/api/profitability';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface CostPerParcelRow {
  parcel_id: string;
  parcel_name: string;
  costs: number;
  area: number;
  costPerHa: number;
}

const CostPerParcelWidget = () => {
  const navigate = useNavigate();
  const { currentOrganization, currentFarm } = useAuth();
  const { t } = useTranslation();

  const organizationId = currentOrganization?.id;

  const { data: farms = [] } = useFarms(organizationId);
  const farmIds = currentFarm?.id ? [currentFarm.id] : farms.map(f => f.id);
  const { data: parcels = [] } = useParcelsByFarms(farmIds, organizationId);

  const parcelAreaMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of parcels) {
      map.set(p.id, p.calculated_area || p.area || 0);
    }
    return map;
  }, [parcels]);

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['profitability-analysis', organizationId, { filter_type: 'parcel' }],
    queryFn: () => profitabilityApi.getAnalysis({ filter_type: 'parcel' }, organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const rankedParcels = useMemo(() => {
    if (!analysis?.by_parcel) return [];

    const rows: CostPerParcelRow[] = analysis.by_parcel
      .map((row: AnalysisParcelRow) => {
        const area = parcelAreaMap.get(row.parcel_id) || 0;
        return {
          parcel_id: row.parcel_id,
          parcel_name: row.parcel_name,
          costs: row.costs,
          area,
          costPerHa: area > 0 ? row.costs / area : 0,
        };
      })
      .filter(r => r.costPerHa > 0);

    rows.sort((a, b) => b.costPerHa - a.costPerHa);
    return rows;
  }, [analysis, parcelAreaMap]);

  const avgCostPerHa = useMemo(() => {
    if (rankedParcels.length === 0) return 0;
    return rankedParcels.reduce((sum, r) => sum + r.costPerHa, 0) / rankedParcels.length;
  }, [rankedParcels]);

  const maxCostPerHa = useMemo(() => {
    if (rankedParcels.length === 0) return 0;
    return Math.max(...rankedParcels.map(r => r.costPerHa));
  }, [rankedParcels]);

  const handleViewAll = () => {
    navigate({ to: '/production/profitability' });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 h-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <Skeleton className="h-5 w-32 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between px-1 mb-3">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-px flex-1 mx-3 rounded" />
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={`sk-${i}`} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-500 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight uppercase">
            {t('dashboard.widgets.costParcel.title', 'Cost / Parcel')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewAll}
          className="text-slate-400 hover:text-green-600 dark:hover:text-green-400 h-8 rounded-xl px-2 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {rankedParcels.length > 0 ? (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('dashboard.widgets.costParcel.rankLabel', 'Ranked by cost/ha')}
            </h4>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3" />
          </div>
          <div className="space-y-2">
            {rankedParcels.map(row => {
              const isAboveAvg = row.costPerHa > avgCostPerHa;
              const barWidth = maxCostPerHa > 0 ? (row.costPerHa / maxCostPerHa) * 100 : 0;

              return (
                <div
                  key={row.parcel_id}
                  className="relative flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm hover:shadow group/item overflow-hidden"
                >
                  <div
                    className={`absolute inset-y-0 left-0 rounded-xl opacity-10 ${
                      isAboveAvg ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />

                  <span className="relative text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[55%]">
                    {row.parcel_name}
                  </span>
                  <span
                    className={`relative text-xs font-bold tabular-nums ${
                      isAboveAvg
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {row.costPerHa.toLocaleString()}{' '}
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      {t('dashboard.widgets.costParcel.madPerHa', 'MAD/ha')}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto">
          <DollarSign className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
            {t('dashboard.widgets.costParcel.empty', 'No cost data available')}
          </p>
          <Button
            type="button"
            variant="green"
            size="sm"
            onClick={handleViewAll}
            className="font-bold text-[10px] uppercase tracking-widest rounded-xl px-4"
          >
            {t('dashboard.widgets.costParcel.viewProfitability', 'View Profitability')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CostPerParcelWidget;
