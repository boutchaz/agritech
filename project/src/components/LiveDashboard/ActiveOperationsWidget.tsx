
import { cn } from '@/lib/utils';
import { Activity, Tractor, Package, Droplets, Wrench, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WidgetSkeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ActiveOperation } from '../../services/liveDashboardService';

interface ActiveOperationsWidgetProps {
  operations: ActiveOperation[];
  total: number;
  byType: Record<string, number>;
  isLoading?: boolean;
}

const ActiveOperationsWidget = ({
  operations,
  total,
  byType,
  isLoading = false,
}: ActiveOperationsWidgetProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <WidgetSkeleton lines={4} />;
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
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
            {t('liveDashboard.operations.title')}
          </h3>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/30 px-3 py-1 rounded-full border border-orange-100 dark:border-orange-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
            {total} {t('liveDashboard.operations.active')}
          </span>
        </div>
      </div>

      {/* Operation Types Summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {(['task', 'harvest', 'inventory', 'irrigation', 'maintenance'] as const).map((type) => {
          const Icon = getOperationIcon(type);
          const colors = getOperationColor(type);
          const count = byType[type] || 0;
          return (
            <div
              key={type}
              className={cn("relative rounded-xl p-2 text-center border transition-all duration-300 hover:scale-105 shadow-sm", count > 0 ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700" : "bg-slate-50 dark:bg-slate-900/30 border-transparent opacity-50")}
            >
              <Icon className={cn("h-4 w-4 mx-auto mb-1", count > 0 ? colors.text : "text-slate-400")} />
              <div className={cn("text-base font-black tabular-nums", count > 0 ? "text-slate-900 dark:text-white" : "text-slate-400")}>{count}</div>
              <div className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                {operationTypeLabels[type]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Operations List */}
      {operations.length > 0 ? (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('liveDashboard.operations.currentOperations')}
            </h4>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {operations.slice(0, 6).map((operation) => {
              const Icon = getOperationIcon(operation.type);
              const colors = getOperationColor(operation.type);
              return (
                <div
                  key={operation.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm hover:shadow group/item"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("p-2 rounded-lg flex-shrink-0 border", colors.text.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-').replace('600', '100').replace('400', '900/30'), colors.text.replace('text-', 'border-').replace('600', '200').replace('400', '800'))}>
                      <Icon className={cn("h-3.5 w-3.5", colors.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                        {operation.name}
                      </p>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                        {operation.farmName && (
                          <span className="truncate">{operation.farmName}</span>
                        )}
                        {operation.assignee && (
                          <>
                            <span className="opacity-30">•</span>
                            <span className="truncate">{operation.assignee}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-3">
                    <Badge className={cn("border-none font-black text-[8px] tracking-widest px-1.5 py-0 h-4", getStatusBadge(operation.status))}>
                      {t(`liveDashboard.operations.status.${operation.status}`)}
                    </Badge>
                    {operation.progress !== undefined && (
                      <div className="w-12 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${operation.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto">
          <Activity className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {t('liveDashboard.operations.noOperations')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ActiveOperationsWidget;
