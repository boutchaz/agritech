import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { TrendingUp, ChevronRight, Calendar, Package as PackageIcon } from 'lucide-react';
import { useAuth } from '../MultiTenantAuthProvider';
import { useHarvests } from '../../hooks/useHarvests';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

const HarvestSummaryWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const { data: harvests = [], isLoading } = useHarvests(currentOrganization?.id || '');

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
          <PackageIcon className="h-5 w-5 text-orange-600" />
          Récoltes
        </h3>
        <button
          onClick={handleViewHarvests}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
        >
          Voir tout
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {stats.total > 0 ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Ce mois</span>
                <Calendar className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.thisMonth}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                récoltes
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Quantité</span>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.thisMonthQuantity.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                kg ce mois
              </div>
            </div>
          </div>

          {/* Latest Harvest */}
          {stats.lastHarvest && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dernière récolte
              </h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {stats.lastHarvest.parcel_name || 'Parcelle'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(parseISO(stats.lastHarvest.harvest_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    {stats.lastHarvest.crop_name && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {stats.lastHarvest.crop_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {stats.lastHarvest.quantity?.toFixed(0) || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.lastHarvest.unit || 'kg'}
                    </div>
                  </div>
                </div>

                {stats.lastHarvest.quality_grade && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Qualité:</span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                      {stats.lastHarvest.quality_grade}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Total Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Total récoltes:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{stats.total}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-6">
          <PackageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aucune récolte enregistrée
          </p>
          <button
            onClick={handleViewHarvests}
            className="mt-2 text-sm text-green-600 hover:text-green-700 dark:text-green-400"
          >
            Enregistrer une récolte
          </button>
        </div>
      )}
    </div>
  );
};

export default HarvestSummaryWidget;
