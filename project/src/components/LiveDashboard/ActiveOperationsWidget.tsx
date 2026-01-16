import React from 'react';
import { Activity, Tractor, Package, Droplets, Wrench, Leaf, ChevronRight, Clock, CheckCircle, PauseCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import type { ActiveOperation } from '../../services/liveDashboardService';

interface ActiveOperationsWidgetProps {
  operations: ActiveOperation[];
  total: number;
  byType: Record<string, number>;
  isLoading?: boolean;
}

const ActiveOperationsWidget: React.FC<ActiveOperationsWidgetProps> = ({
  operations,
  total,
  byType,
  isLoading = false,
}) => {
  const { t } = useTranslation();

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

  const getOperationIcon = (type: ActiveOperation['type']) => {
    const icons = {
      task: Leaf,
      harvest: Tractor,
      inventory: Package,
      irrigation: Droplets,
      maintenance: Wrench,
    };
    return icons[type] || Activity;
  };

  const getOperationColor = (type: ActiveOperation['type']) => {
    const colors = {
      task: { bg: 'from-green-100 to-green-50', dark: 'from-green-900/40 to-green-900/20', text: 'text-green-600 dark:text-green-400' },
      harvest: { bg: 'from-orange-100 to-orange-50', dark: 'from-orange-900/40 to-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
      inventory: { bg: 'from-blue-100 to-blue-50', dark: 'from-blue-900/40 to-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
      irrigation: { bg: 'from-cyan-100 to-cyan-50', dark: 'from-cyan-900/40 to-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400' },
      maintenance: { bg: 'from-purple-100 to-purple-50', dark: 'from-purple-900/40 to-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
    };
    return colors[type] || colors.task;
  };

  const getStatusIcon = (status: ActiveOperation['status']) => {
    const icons = {
      in_progress: <Activity className="h-4 w-4 text-green-500 animate-pulse" />,
      pending: <Clock className="h-4 w-4 text-yellow-500" />,
      paused: <PauseCircle className="h-4 w-4 text-gray-500" />,
    };
    return icons[status] || icons.pending;
  };

  const getStatusBadge = (status: ActiveOperation['status']) => {
    const badges = {
      in_progress: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      paused: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    };
    return badges[status] || badges.pending;
  };

  const operationTypeLabels: Record<string, string> = {
    task: t('liveDashboard.operations.types.task'),
    harvest: t('liveDashboard.operations.types.harvest'),
    inventory: t('liveDashboard.operations.types.inventory'),
    irrigation: t('liveDashboard.operations.types.irrigation'),
    maintenance: t('liveDashboard.operations.types.maintenance'),
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/40 dark:to-orange-900/20 rounded-xl">
            <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('liveDashboard.operations.title')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
            {total} {t('liveDashboard.operations.active')}
          </span>
        </div>
      </div>

      {/* Operation Types Summary */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {(['task', 'harvest', 'inventory', 'irrigation', 'maintenance'] as const).map((type) => {
          const Icon = getOperationIcon(type);
          const colors = getOperationColor(type);
          const count = byType[type] || 0;
          return (
            <div
              key={type}
              className={`relative bg-gradient-to-br ${colors.bg} dark:${colors.dark} rounded-xl p-3 text-center overflow-hidden`}
            >
              <Icon className={`h-5 w-5 mx-auto mb-1 ${colors.text}`} />
              <div className={`text-lg font-bold ${colors.text}`}>{count}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate">
                {operationTypeLabels[type]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Operations List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t('liveDashboard.operations.currentOperations')}
        </h4>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {operations.slice(0, 6).map((operation) => {
            const Icon = getOperationIcon(operation.type);
            const colors = getOperationColor(operation.type);
            return (
              <div
                key={operation.id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-900/20 rounded-lg hover:from-orange-50 hover:to-orange-50/50 dark:hover:from-orange-900/20 dark:hover:to-orange-900/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 bg-gradient-to-br ${colors.bg} dark:${colors.dark} rounded-lg flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {operation.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {operation.farmName && (
                        <span className="truncate font-medium">{operation.farmName}</span>
                      )}
                      {operation.assignee && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span className="truncate">{operation.assignee}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {operation.progress !== undefined && (
                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-300"
                        style={{ width: `${operation.progress}%` }}
                      />
                    </div>
                  )}
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${getStatusBadge(operation.status)}`}>
                    {t(`liveDashboard.operations.status.${operation.status}`)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {operations.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center">
            <Activity className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('liveDashboard.operations.noOperations')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ActiveOperationsWidget;
