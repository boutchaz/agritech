import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Play, Square, Loader2, User } from 'lucide-react';
import { useTaskTimeLogs, useClockIn, useClockOut } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { format, formatDistance } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';

interface TaskWorklogProps {
  taskId: string;
  taskStatus: string;
  assignedWorkerId?: string;
}

export default function TaskWorklog({ taskId, taskStatus, assignedWorkerId }: TaskWorklogProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: timeLogs = [], isLoading } = useTaskTimeLogs(taskId);
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const [now, setNow] = useState(Date.now());

  const getLocale = () => {
    if (i18n.language.startsWith('fr')) return fr;
    if (i18n.language.startsWith('ar')) return ar;
    return enUS;
  };

  const activeLog = useMemo(() => {
    return timeLogs.find((log: any) => !log.end_time);
  }, [timeLogs]);

  // Tick every second when there's an active session
  useEffect(() => {
    if (!activeLog) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeLog]);

  const formatElapsed = (startTime: string) => {
    const elapsed = Math.max(0, Math.floor((now - new Date(startTime).getTime()) / 1000));
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatDuration = (hours: number | null | undefined) => {
    if (!hours) return '0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const totalStats = useMemo(() => {
    let totalHours = 0;
    let sessionCount = 0;
    for (const log of timeLogs) {
      sessionCount++;
      if ((log as any).total_hours) {
        totalHours += (log as any).total_hours;
      }
    }
    return { totalHours, sessionCount };
  }, [timeLogs]);

  const handleClockIn = () => {
    clockIn.mutate({
      task_id: taskId,
      worker_id: assignedWorkerId || user?.id || '',
    });
  };

  const handleClockOut = () => {
    if (!activeLog) return;
    clockOut.mutate({
      time_log_id: activeLog.id,
    });
  };

  const canStartTimer = taskStatus === 'in_progress' && !activeLog;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        {t('tasks.detail.worklog', 'Time Tracking')}
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Timer */}
          {activeLog && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <p className="text-3xl font-mono font-bold text-green-700 dark:text-green-300">
                {formatElapsed(activeLog.start_time)}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                {t('tasks.detail.startedAgo', 'Started {{time}} ago', {
                  time: formatDistance(new Date(activeLog.start_time), new Date(), { locale: getLocale() }),
                })}
              </p>
              <Button
                onClick={handleClockOut}
                disabled={clockOut.isPending}
                className="mt-3 bg-red-600 hover:bg-red-700"
                size="sm"
              >
                {clockOut.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                {t('tasks.detail.stopTimer', 'Stop Timer')}
              </Button>
            </div>
          )}

          {/* Start Timer Button */}
          {canStartTimer && (
            <Button
              onClick={handleClockIn}
              disabled={clockIn.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {clockIn.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {t('tasks.detail.startTimer', 'Start Timer')}
            </Button>
          )}

          {/* Summary */}
          {timeLogs.length > 0 && (
            <div className="border-t dark:border-gray-700 pt-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('tasks.detail.totalTime', 'Total: {{time}} across {{count}} sessions', {
                  time: formatDuration(totalStats.totalHours),
                  count: totalStats.sessionCount,
                })}
              </p>
            </div>
          )}

          {/* Time Log History */}
          {timeLogs.length > 0 && (
            <div className="space-y-2">
              {timeLogs.map((log: any) => {
                const isActive = !log.end_time;
                return (
                  <div
                    key={log.id}
                    className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
                      isActive
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {log.worker_name && (
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {log.worker_name}
                        </p>
                      )}
                      <p className="text-gray-500 dark:text-gray-400">
                        {format(new Date(log.start_time), 'HH:mm', { locale: getLocale() })}
                        {' → '}
                        {log.end_time
                          ? format(new Date(log.end_time), 'HH:mm', { locale: getLocale() })
                          : t('tasks.detail.ongoing', 'ongoing')}
                      </p>
                      {log.notes && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                          {log.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`font-medium ${isActive ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                        {isActive ? formatElapsed(log.start_time) : formatDuration(log.total_hours)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {timeLogs.length === 0 && !activeLog && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
              {t('tasks.detail.noTimeLogs', 'No time logs recorded yet.')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
