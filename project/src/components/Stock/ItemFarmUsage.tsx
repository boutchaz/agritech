import { useNavigate } from '@tanstack/react-router';
import { Building2, MapPin, Calendar, ExternalLink, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useItemFarmUsage } from '@/hooks/useItemFarmUsage';
import { useTranslation } from 'react-i18next';

interface ItemFarmUsageProps {
  item_id: string;
  showDetails?: boolean;
}

export default function ItemFarmUsage({ item_id, showDetails = true }: ItemFarmUsageProps) {
  const { t } = useTranslation('stock');
  const navigate = useNavigate();

  const { data: usageData, isLoading } = useItemFarmUsage(item_id);

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!usageData || usageData.by_farm.length === 0) {
    return (
      <div className="p-6 border rounded-lg text-center">
        <Activity className="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('stock.itemFarmUsage.noUsage', 'No usage data found for this item')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              {t('stock.itemFarmUsage.totalUsage', 'Total Usage')}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {usageData.total_usage_count}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              {t('stock.itemFarmUsage.totalQuantity', 'Total Quantity Used')}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {usageData.total_quantity_used.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              {t('stock.itemFarmUsage.lastUsed', 'Last Used')}
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {usageData.last_used_date
                ? new Date(usageData.last_used_date).toLocaleDateString()
                : t('stock.itemFarmUsage.never', 'Never')}
            </p>
          </div>
        </div>
      </div>

      {/* By Farm */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('stock.itemFarmUsage.byFarm', 'Usage by Farm')}
        </h4>
        {usageData.by_farm.map((farmUsage) => (
          <div key={farmUsage.farm_id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Building2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white">
                    {farmUsage.farm_name}
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {farmUsage.usage_count} {t('stock.itemFarmUsage.usageEvents', 'usage event(s)')}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Navigate to farms page - adjust route as needed
                  window.location.href = `/farms?farmId=${farmUsage.farm_id}`;
                }}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                {t('stock.itemFarmUsage.viewFarm', 'View Farm')}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {t('stock.itemFarmUsage.quantityUsed', 'Quantity Used')}:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {farmUsage.total_quantity_used.toFixed(3)}
                </span>
              </div>
              {farmUsage.last_used_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stock.itemFarmUsage.lastUsed', 'Last Used')}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(farmUsage.last_used_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {showDetails && farmUsage.parcel_id && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stock.itemFarmUsage.parcel', 'Parcel')}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {farmUsage.parcel_name}
                  </span>
                </div>
              </div>
            )}

            {showDetails && farmUsage.task_ids.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('stock.itemFarmUsage.relatedTasks', 'Related Tasks')} ({farmUsage.task_ids.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {farmUsage.task_ids.slice(0, 5).map((taskId) => (
                    <Button
                      key={taskId}
                      size="sm"
                      variant="outline"
                      onClick={() => navigate({ to: '/tasks', search: { taskId } })}
                    >
                      {t('stock.itemFarmUsage.viewTask', 'View Task')} {taskId.slice(0, 8)}
                    </Button>
                  ))}
                  {farmUsage.task_ids.length > 5 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                      +{farmUsage.task_ids.length - 5} {t('stock.itemFarmUsage.more', 'more')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

