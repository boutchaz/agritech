import React from 'react';
import { TrendingUp, Package, DollarSign, Calendar } from 'lucide-react';
import type { HarvestStatistics as HarvestStats } from '../../types/harvests';

interface Props {
  statistics: HarvestStats;
}

const HarvestStatistics: React.FC<Props> = ({ statistics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total Récoltes</span>
          <Package className="h-5 w-5 text-green-600" />
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {statistics?.total_harvests || 0}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Quantité Totale</span>
          <TrendingUp className="h-5 w-5 text-blue-600" />
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {statistics?.total_quantity?.toFixed(0) || 0} kg
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Revenu Estimé</span>
          <DollarSign className="h-5 w-5 text-purple-600" />
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {statistics?.total_revenue?.toFixed(0) || 0} MAD
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Moy. par récolte</span>
          <Calendar className="h-5 w-5 text-orange-600" />
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {statistics?.avg_quantity_per_harvest?.toFixed(1) || 0} kg
        </div>
      </div>
    </div>
  );
};

export default HarvestStatistics;
