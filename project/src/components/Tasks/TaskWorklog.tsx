import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Play, Square, Loader2, Hash } from 'lucide-react';
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
  /** When true, no outer card chrome — for use inside a parent Card on task detail. */
  embedded?: boolean;
}

function initialsFromName(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** e.g. 7.5 → "7h30" */
function formatHoursHM(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh}h${String(mm).padStart(2, '0')}`;
}

export default function TaskWorklog({ taskId, taskStatus, assignedWorkerId, embedded = false }: TaskWorklogProps) {
  const { t, i18n } = useTranslation();
  const { user, currentOrganization } = useAuth();
  const { data: timeLogs = [], isLoading } = useTaskTimeLogs(taskId);
  const { data: task } = useTask(currentOrganization?.id || null, taskId);
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const typedTimeLogs = timeLogs as TaskTimeLog[];

  const isPerUnit = task?.payment_type === 'per_unit';
  const isClosed = taskStatus === 'completed' || taskStatus === 'cancelled';

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

  const computeLogHours = (log: TaskTimeLog): number => {
    if (log.total_hours && log.total_hours > 0) return log.total_hours;
    if (!log.end_time) return 0;
    const startMs = new Date(log.start_time).getTime();
    const endMs = new Date(log.end_time).getTime();
    const breakMs = (log.break_duration || 0) * 60 * 1000;
    return Math.max(0, (endMs - startMs - breakMs) / (1000 * 60 * 60));
  };

  const totalStats = useMemo(() => {
    let totalHours = 0;
    let sessionCount = 0;
    for (const log of typedTimeLogs) {
      sessionCount++;
      totalHours += computeLogHours(log);
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

  // Allow clock-in for pending/assigned/in_progress tasks (backend auto-sets status to in_progress)
  const canStartTimer = !activeLog && !isClosed;

  const inner = (
    <>
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

          {/* Summary (standalone card only) */}
          {!embedded && typedTimeLogs.length > 0 && (
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
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      {initialsFromName(log.worker_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {log.worker_name && (
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {log.worker_name}
                        </p>
                      )}
                      <p className="text-gray-500 dark:text-gray-400">
                        <span className="capitalize">
                          {format(new Date(log.start_time), 'd MMM', { locale: getLocale() })}
                        </span>
                        {' · '}
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
                      <span className={`font-medium tabular-nums ${isActive ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                        {isActive ? formatElapsed(log.start_time) : formatHoursHM(computeLogHours(log))}
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

      {/* Embedded total bar — matches task detail mockup */}
      {embedded && (typedTimeLogs.length > 0 || (task?.estimated_duration != null && Number(task.estimated_duration) > 0)) && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
          <span>{t('tasks.detail.totalLabel', 'Total')}</span>
          <span className="tabular-nums">
            {formatHoursHM(totalStats.totalHours)}
            {task?.estimated_duration ? (
              <span className="text-emerald-700/90 dark:text-emerald-300/90">
                {' '}/ {task.estimated_duration}h
              </span>
            ) : null}
          </span>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{inner}</div>;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <Clock className="h-5 w-5" />
        {t('tasks.detail.worklog', 'Time Tracking')}
      </h2>
      {inner}
    </div>
  );
}
