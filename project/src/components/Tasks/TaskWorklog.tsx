import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Play, Square, Loader2, User, Hash } from 'lucide-react';
import { useTaskTimeLogs, useClockIn, useClockOut, useTask } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import type { TaskTimeLog } from '@/types/tasks';
import { format, formatDistance } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';

interface TaskWorklogProps {
  taskId: string;
  taskStatus: string;
  assignedWorkerId?: string;
}

export default function TaskWorklog({ taskId, taskStatus, assignedWorkerId }: TaskWorklogProps) {
  const { t, i18n } = useTranslation();
  const { user, currentOrganization } = useAuth();
  const { data: timeLogs = [], isLoading } = useTaskTimeLogs(taskId);
  const { data: task } = useTask(currentOrganization?.id || null, taskId);
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const typedTimeLogs = timeLogs as TaskTimeLog[];

  const isPerUnit = task?.payment_type === 'per_unit';

  const [now, setNow] = useState(() => Date.now());
  // Inline clock-out form state — prompts for units + notes when the worker
  // stops the timer so we capture piece-work output at the same moment.
  const [showStopForm, setShowStopForm] = useState(false);
  const [unitsCompleted, setUnitsCompleted] = useState<string>('');
  const [clockOutNotes, setClockOutNotes] = useState<string>('');

  const getLocale = () => {
    if (i18n.language.startsWith('fr')) return fr;
    if (i18n.language.startsWith('ar')) return ar;
    return enUS;
  };

  const activeLog = useMemo(() => {
    return typedTimeLogs.find((log) => !log.end_time);
  }, [typedTimeLogs]);

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
    for (const log of typedTimeLogs) {
      sessionCount++;
      if (log.total_hours) {
        totalHours += log.total_hours;
      }
    }
    return { totalHours, sessionCount };
  }, [typedTimeLogs]);

  const handleClockIn = () => {
    clockIn.mutate({
      task_id: taskId,
      worker_id: assignedWorkerId || user?.id || '',
    });
  };

  const handleRequestClockOut = () => {
    if (isPerUnit) {
      setShowStopForm(true);
    } else {
      handleConfirmClockOut();
    }
  };

  const handleConfirmClockOut = () => {
    if (!activeLog) return;
    const parsedUnits = unitsCompleted.trim() === '' ? undefined : Number(unitsCompleted);
    clockOut.mutate(
      {
        time_log_id: activeLog.id,
        units_completed: parsedUnits,
        notes: clockOutNotes.trim() || undefined,
      },
      {
        onSettled: () => {
          setShowStopForm(false);
          setUnitsCompleted('');
          setClockOutNotes('');
        },
      },
    );
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
              {!showStopForm ? (
                <Button variant="red" onClick={handleRequestClockOut} disabled={clockOut.isPending} className="mt-3" size="sm" >
                  {clockOut.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Square className="w-4 h-4 mr-2" />
                  )}
                  {t('tasks.detail.stopTimer', 'Stop Timer')}
                </Button>
              ) : (
                <div className="mt-3 text-start space-y-3 bg-white dark:bg-gray-900 rounded-md p-3 border border-green-200 dark:border-green-800">
                  <p className="text-xs font-medium text-green-900 dark:text-green-200">
                    {t('tasks.worklog.beforeStop', 'Before you stop — how much did you complete?')}
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="units_completed_inline" className="flex items-center gap-1.5 text-xs">
                      <Hash className="h-3 w-3" />
                      {t('tasks.worklog.unitsCompleted', 'Units completed')}
                      {task?.units_required ? (
                        <span className="text-gray-400">/ {task.units_required}</span>
                      ) : null}
                    </Label>
                    <Input
                      id="units_completed_inline"
                      type="number"
                      min="0"
                      step="1"
                      value={unitsCompleted}
                      onChange={(e) => setUnitsCompleted(e.target.value)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="clock_out_notes" className="text-xs">
                      {t('tasks.worklog.notes', 'Notes (optional)')}
                    </Label>
                    <Textarea
                      id="clock_out_notes"
                      value={clockOutNotes}
                      onChange={(e) => setClockOutNotes(e.target.value)}
                      rows={2}
                      placeholder={t('tasks.worklog.notesPlaceholder', 'Anything to flag for the manager?')}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="red"
                      onClick={handleConfirmClockOut}
                      disabled={clockOut.isPending}
                      size="sm"
                      className="flex-1"
                    >
                      {clockOut.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Square className="w-4 h-4 mr-2" />
                      )}
                      {t('tasks.worklog.confirmStop', 'Stop and save')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowStopForm(false)}>
                      {t('common.cancel', 'Cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Start Timer Button */}
          {canStartTimer && (
            <Button variant="green" onClick={handleClockIn} disabled={clockIn.isPending} className="w-full" >
              {clockIn.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {t('tasks.detail.startTimer', 'Start Timer')}
            </Button>
          )}

          {/* Summary */}
          {typedTimeLogs.length > 0 && (
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
          {typedTimeLogs.length > 0 && (
            <div className="space-y-2">
              {typedTimeLogs.map((log) => {
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
          {typedTimeLogs.length === 0 && !activeLog && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
              {t('tasks.detail.noTimeLogs', 'No time logs recorded yet.')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
