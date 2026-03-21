import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle, Search, X, Loader2, Check } from 'lucide-react';
import { useActiveWorkers } from '@/hooks/useWorkers';
import { useAssignTask } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';

interface TaskAssigneeProps {
  taskId: string;
  organizationId: string;
  currentAssignee?: { id: string; name: string };
  taskStatus: string;
  farmId?: string;
}

export default function TaskAssignee({
  taskId,
  organizationId,
  currentAssignee,
  taskStatus,
}: TaskAssigneeProps) {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const { data: workers = [], isLoading: workersLoading } = useActiveWorkers(organizationId);
  const assignTask = useAssignTask();

  const isDisabled = taskStatus === 'completed' || taskStatus === 'cancelled';

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker]);

  const filteredWorkers = workers.filter((w: any) => {
    const name = (w.first_name || '') + ' ' + (w.last_name || '') + ' ' + (w.name || '');
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getWorkerName = (w: any) => {
    if (w.first_name || w.last_name) {
      return `${w.first_name || ''} ${w.last_name || ''}`.trim();
    }
    return w.name || 'Worker';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleAssign = (workerId: string) => {
    assignTask.mutate(
      { taskId, organizationId, workerId },
      {
        onSuccess: () => {
          setShowPicker(false);
          setSearch('');
        },
      },
    );
  };

  const handleUnassign = () => {
    // Assign to empty string to unassign
    assignTask.mutate(
      { taskId, organizationId, workerId: '' },
      {
        onSuccess: () => {
          setShowPicker(false);
          setSearch('');
        },
      },
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <UserCircle className="w-5 h-5" />
        {t('tasks.detail.assignee', 'Assignee')}
      </h2>

      <div className="relative" ref={pickerRef}>
        {/* Current Assignee Display */}
        <div className="flex items-center justify-between">
          {currentAssignee ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {getInitials(currentAssignee.name)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {currentAssignee.name}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('tasks.detail.unassigned', 'Unassigned')}
              </p>
            </div>
          )}

          {!isDisabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPicker(!showPicker);
                setSearch('');
              }}
            >
              {t('tasks.detail.change', 'Change')}
            </Button>
          )}
        </div>

        {/* Worker Picker Dropdown */}
        {showPicker && (
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
            {/* Search */}
            <div className="p-2 border-b dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('tasks.detail.searchWorkers', 'Search workers...')}
                  className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Worker List */}
            <div className="max-h-60 overflow-y-auto p-1">
              {workersLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : filteredWorkers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  {t('tasks.detail.noWorkersFound', 'No workers found')}
                </p>
              ) : (
                <>
                  {/* Unassign option */}
                  {currentAssignee && (
                    <button
                      onClick={handleUnassign}
                      disabled={assignTask.isPending}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <X className="w-4 h-4" />
                      {t('tasks.detail.unassign', 'Unassign')}
                    </button>
                  )}

                  {filteredWorkers.map((worker: any) => {
                    const name = getWorkerName(worker);
                    const isCurrentAssignee = currentAssignee?.id === worker.id;
                    return (
                      <button
                        key={worker.id}
                        onClick={() => handleAssign(worker.id)}
                        disabled={assignTask.isPending || isCurrentAssignee}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                          isCurrentAssignee
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            {getInitials(name)}
                          </span>
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {name}
                          </p>
                          {worker.worker_type && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                              {worker.worker_type}
                            </span>
                          )}
                        </div>
                        {isCurrentAssignee && (
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {assignTask.isPending && (
              <div className="border-t dark:border-gray-700 p-2 text-center">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 inline-block" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
