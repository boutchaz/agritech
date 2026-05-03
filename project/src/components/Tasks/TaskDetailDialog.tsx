import {  useState, useEffect, useMemo  } from "react";
import {
  X,
  Play,
  CheckCircle,
  Pause,
  Clock,
  Calendar,
  MapPin,
  User,
  Wheat,
  Edit,
  AlertCircle,
  PackageCheck,
  Hash,
  Banknote,
  Lock,
  MessageSquare,
  PlayCircle,
  StopCircle,
  Wallet,
  Activity,
} from 'lucide-react';
import {
  useUpdateTask,
  useTaskComments,
  useTaskTimeLogs,
  useIsTaskBlocked,
  useTaskDependencies,
} from '../../hooks/useTasks';
import { useTaskAssignments } from '../../hooks/useTaskAssignments';
import { tasksApi } from '../../lib/api/tasks';
// crops module removed — parcel.crop_type used directly for harvest context
type CropOption = { id: string; name: string; parcel_id?: string; parcel_name?: string; farm_id?: string; variety_id?: string; variety_name?: string; created_at?: string; updated_at?: string };
import { useQueryClient } from '@tanstack/react-query';
import type { Task, TaskSummary, CompleteHarvestTaskRequest } from '../../types/tasks';
import { useParcelById } from '../../hooks/useParcelsQuery';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  getTaskTypeLabel,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from '../../types/tasks';
import { Button } from '../ui/button';
import UserAvatar from '../ui/UserAvatar';
import { useTranslation } from 'react-i18next';
import { Label } from '../ui/label';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/radix-select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type HarvestUnit = CompleteHarvestTaskRequest['unit'];
type HarvestQualityGrade = NonNullable<CompleteHarvestTaskRequest['quality_grade']>;
type TaskCompletionPayload = Parameters<typeof tasksApi.complete>[2] & {
  units_completed: number;
  rate_per_unit: number;
  worker_completions?: Array<{
    worker_id: string;
    units_completed: number;
  }>;
};

interface TaskDetailDialogProps {
  task: TaskSummary | Task;
  organizationId: string;
  onClose: () => void;
  onEdit?: () => void;
}

const TaskDetailDialog = ({
  task,
  organizationId,
  onClose,
  onEdit,
}: TaskDetailDialogProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionType, setCompletionType] = useState<'complete' | 'partial'>('complete');
  const [lotNumber, setLotNumber] = useState<string>('');

  // Per-unit completion form
  const isPerUnitTask = task.payment_type === 'per_unit';
  const [showPerUnitForm, setShowPerUnitForm] = useState(false);
  const [perUnitData, setPerUnitData] = useState({
    units_completed: task.units_required || 0,
    rate_per_unit: task.rate_per_unit || 0,
    notes: '',
  });

  // Load task assignments for multi-worker support
  const { data: taskAssignments = [] } = useTaskAssignments(task.id);
  const hasMultipleWorkers = taskAssignments.length > 1;

  // Collaboration + worklog data — all surfaced via existing hooks
  const { data: comments = [] } = useTaskComments(task.id);
  const { data: timeLogs = [] } = useTaskTimeLogs(task.id);
  const { data: blockedStatus } = useIsTaskBlocked(task.id);
  const { data: dependencies } = useTaskDependencies(task.id);

  // Merged activity timeline: status milestones + comments + clock events
  const timelineEvents = useMemo(() => {
    type TimelineEvent = {
      id: string;
      at: string;
      kind: 'milestone' | 'comment' | 'clock';
      icon: typeof Clock;
      tone: 'neutral' | 'success' | 'warning' | 'info';
      title: string;
      body?: string;
      author?: string;
      authorAvatarUrl?: string;
    };
    const events: TimelineEvent[] = [];

    if (task.created_at) {
      events.push({
        id: 'created',
        at: task.created_at,
        kind: 'milestone',
        icon: Calendar,
        tone: 'neutral',
        title: t('taskDetail.timeline.taskCreated', 'Task created'),
      });
    }
    if (task.actual_start) {
      events.push({
        id: 'started',
        at: task.actual_start,
        kind: 'milestone',
        icon: PlayCircle,
        tone: 'info',
        title: t('taskDetail.timeline.workStarted', 'Work started'),
      });
    }
    if (task.actual_end) {
      events.push({
        id: 'ended',
        at: task.actual_end,
        kind: 'milestone',
        icon: StopCircle,
        tone: 'info',
        title: t('taskDetail.timeline.workEnded', 'Work ended'),
      });
    }
    if (task.approved_at) {
      events.push({
        id: 'approved',
        at: task.approved_at,
        kind: 'milestone',
        icon: CheckCircle,
        tone: 'success',
        title: t('taskDetail.timeline.taskApproved', 'Task approved'),
      });
    }
    if (task.completed_date) {
      events.push({
        id: 'completed',
        at: task.completed_date,
        kind: 'milestone',
        icon: CheckCircle,
        tone: 'success',
        title: t('taskDetail.timeline.taskCompleted', 'Task completed'),
      });
    }

    for (const c of comments) {
      events.push({
        id: `comment-${c.id}`,
        at: c.created_at,
        kind: 'comment',
        icon: MessageSquare,
        tone: c.type === 'issue' ? 'warning' : 'neutral',
        title: c.type === 'issue'
          ? t('taskDetail.timeline.issueReported', 'Issue reported')
          : c.type === 'status_update'
            ? t('taskDetail.timeline.statusUpdate', 'Status update')
            : t('taskDetail.timeline.comment', 'Comment'),
        body: c.comment,
        author: c.user_name || c.worker_id || undefined,
        authorAvatarUrl: c.user_avatar_url || undefined,
      });
    }

    for (const log of timeLogs) {
      events.push({
        id: `clock-in-${log.id}`,
        at: log.start_time,
        kind: 'clock',
        icon: PlayCircle,
        tone: 'info',
        title: t('taskDetail.timeline.clockedIn', 'Clocked in'),
        body: log.notes || undefined,
        author: log.worker_id,
      });
      if (log.end_time) {
        const hours = Number(log.total_hours || 0);
        events.push({
          id: `clock-out-${log.id}`,
          at: log.end_time,
          kind: 'clock',
          icon: StopCircle,
          tone: 'info',
          title: t('taskDetail.timeline.clockedOut', 'Clocked out · {{hours}}h', { hours: hours.toFixed(2) }),
          body: log.notes || undefined,
          author: log.worker_id,
        });
      }
    }

    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [task.created_at, task.actual_start, task.actual_end, task.approved_at, task.completed_date, comments, timeLogs, t]);

  // Running cost tile — combines piece-work completion and logged hours.
  // If we had worker hourly rates we'd use them; without, we fall back to
  // actual_cost when the service computes it.
  const costSummary = useMemo(() => {
    const totalHours = timeLogs.reduce((sum, l) => sum + Number(l.total_hours || 0), 0);
    const unitsCompleted = Number(task.units_completed ?? 0);
    const ratePerUnit = Number(task.rate_per_unit ?? 0);
    const pieceWorkCost = unitsCompleted * ratePerUnit;
    const actualCost = Number(task.actual_cost ?? 0);
    const estimatedCost = Number(task.cost_estimate ?? 0);
    return {
      totalHours,
      unitsCompleted,
      ratePerUnit,
      pieceWorkCost,
      actualCost,
      estimatedCost,
      hasAny: totalHours > 0 || unitsCompleted > 0 || actualCost > 0 || estimatedCost > 0,
    };
  }, [timeLogs, task.units_completed, task.rate_per_unit, task.actual_cost, task.cost_estimate]);

  // Per-worker unit completion (for per_unit tasks with multiple workers)
  const [workerUnits, setWorkerUnits] = useState<Record<string, number>>({});

  // Generate lot number when harvest form opens
  useEffect(() => {
    if (showHarvestForm && !lotNumber) {
      // Format: {ParcelCode}{FarmCode}-{Sequence}{Year}
      // Example: P1FM1-0012025
      const year = new Date().getFullYear();
      const parcelCode = task.parcel_id ? `P${task.parcel_id.slice(-2).toUpperCase()}` : 'PX';
      const farmCode = task.farm_id ? `F${task.farm_id.slice(-2).toUpperCase()}` : 'FX';
      const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
      setLotNumber(`${parcelCode}${farmCode}-${sequence}${year}`);
    }
  }, [showHarvestForm, lotNumber, task.parcel_id, task.farm_id]);

  // Fetch parcel details to get crop_type
  const { data: parcel } = useParcelById(task.parcel_id);

  // Build crop options from parcel crop_type
  const availableCrops = useMemo(() => {
    if (parcel && parcel.crop_type && task.parcel_id) {
      return [{
        id: `parcel-${parcel.id}`,
        name: parcel.crop_type,
        parcel_id: parcel.id,
        parcel_name: parcel.name,
        farm_id: parcel.farm_id || task.farm_id || '',
        variety_id: '', // Required field but not available from parcel - backend will handle
        variety_name: parcel.variety || undefined,
        created_at: parcel.created_at || new Date().toISOString(),
        updated_at: parcel.updated_at || new Date().toISOString(),
      } as CropOption];
    }

    return [];
  }, [parcel, task.parcel_id, task.farm_id]);

  // Harvest completion form data
  // Auto-initialize crop_id with virtual crop from parcel if available and no crop_id in task
  const initialCropId = task.crop_id || (availableCrops.length > 0 ? availableCrops[0].id : '');
  const firstAvailableCropId = availableCrops[0]?.id;
  const [harvestData, setHarvestData] = useState<Partial<CompleteHarvestTaskRequest>>({
    crop_id: initialCropId,
    harvest_date: new Date().toISOString().split('T')[0],
    quantity: 0,
    unit: 'kg',
    quality_grade: 'A',
    workers: [],
  });

  // Update crop_id when availableCrops changes (e.g., when parcel loads)
  useEffect(() => {
    if (!harvestData.crop_id && firstAvailableCropId) {
      setHarvestData(prev => ({ ...prev, crop_id: firstAvailableCropId }));
    }
  }, [firstAvailableCropId, harvestData.crop_id]);

  const isHarvestingTask = task.task_type === 'harvesting';
  const canStart = task.status === 'pending' || task.status === 'assigned';
  const canPause = task.status === 'in_progress';
  const canResume = task.status === 'paused';
  const canComplete = task.status === 'in_progress' || task.status === 'paused';

  const handleStartTask = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await updateTask.mutateAsync({
        taskId: task.id,
        organizationId,
        updates: {
          status: 'in_progress',
          actual_start: new Date().toISOString(),
        },
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('taskDetail.errors.start', 'Failed to start task'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseTask = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await updateTask.mutateAsync({
        taskId: task.id,
        organizationId,
        updates: { status: 'paused' },
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('taskDetail.errors.pause', 'Failed to pause task'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeTask = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await updateTask.mutateAsync({
        taskId: task.id,
        organizationId,
        updates: { status: 'in_progress' },
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('taskDetail.errors.resume', 'Failed to resume task'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (isHarvestingTask) {
      setShowHarvestForm(true);
      return;
    }

    // Show per-unit form for per-unit payment tasks
    if (isPerUnitTask) {
      setShowPerUnitForm(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await tasksApi.complete(organizationId, task.id, {});
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['work-records'] });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('taskDetail.errors.complete', 'Failed to complete task'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompletePerUnit = async () => {
    if (!hasMultipleWorkers && perUnitData.units_completed <= 0) {
      setError(t('taskDetail.errors.unitsRequired', 'Please enter completed units'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build per-worker completions if multiple workers
      const worker_completions = hasMultipleWorkers
        ? taskAssignments.map(a => ({
            worker_id: a.worker_id,
            units_completed: workerUnits[a.worker_id] ?? 0,
          }))
        : undefined;

      const totalUnits = hasMultipleWorkers
        ? Object.values(workerUnits).reduce((s, v) => s + v, 0)
        : perUnitData.units_completed;

      const totalCost = totalUnits * perUnitData.rate_per_unit;
      const completionPayload: TaskCompletionPayload = {
        units_completed: totalUnits,
        rate_per_unit: perUnitData.rate_per_unit,
        actual_cost: totalCost,
        notes: perUnitData.notes || undefined,
        ...(worker_completions ? { worker_completions } : {}),
      };
      await tasksApi.complete(organizationId, task.id, completionPayload);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['work-records'] });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('taskDetail.errors.complete', 'Failed to complete task'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteWithHarvest = async () => {
    if (!harvestData.crop_id) {
      setError(t('taskDetail.errors.cropRequired', 'Please select a crop'));
      return;
    }
    if (!harvestData.quantity || harvestData.quantity <= 0) {
      setError(t('taskDetail.errors.quantityRequired', 'Please enter a valid quantity'));
      return;
    }
    if (!lotNumber) {
      setError(t('taskDetail.errors.lotRequired', 'Please enter a lot number'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Call the complete with harvest endpoint
      // If crop_id is a virtual ID (starts with "parcel-") or undefined, don't include it in the request
      // Backend will use parcel crop_type when crop_id is not provided
      const cropIdToSend = harvestData.crop_id && 
                           !harvestData.crop_id.startsWith('parcel-') && 
                           harvestData.crop_id.trim() !== ''
        ? harvestData.crop_id
        : undefined;
      
      // Build request payload, excluding crop_id if it's undefined
      const requestPayload: CompleteHarvestTaskRequest & { lot_number: string; is_partial: boolean } = {
        harvest_date: harvestData.harvest_date || new Date().toISOString().split('T')[0],
        quantity: harvestData.quantity || 0,
        unit: harvestData.unit || 'kg',
        workers: harvestData.workers || [],
        lot_number: lotNumber,
        is_partial: completionType === 'partial',
        quality_grade: harvestData.quality_grade,
        quality_score: harvestData.quality_score,
        quality_notes: harvestData.quality_notes,
        supervisor_id: harvestData.supervisor_id,
        storage_location: harvestData.storage_location,
        temperature: harvestData.temperature,
        humidity: harvestData.humidity,
        intended_for: harvestData.intended_for,
        expected_price_per_unit: harvestData.expected_price_per_unit,
        harvest_notes: harvestData.harvest_notes,
        notes: harvestData.notes,
        quality_rating: harvestData.quality_rating,
        actual_cost: harvestData.actual_cost,
      };
      
      // Only include crop_id if it's a valid UUID
      if (cropIdToSend) {
        requestPayload.crop_id = cropIdToSend;
      }
      
      await tasksApi.completeWithHarvest(organizationId, task.id, requestPayload);

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['harvests'] });

      // For partial completion, don't close the dialog - just reset the form for next entry
      if (completionType === 'partial') {
        setHarvestData({
          ...harvestData,
          quantity: 0,
          harvest_notes: '',
        });
        // Generate new lot number for next partial harvest
        const year = new Date().getFullYear();
        const parcelCode = task.parcel_id ? `P${task.parcel_id.slice(-2).toUpperCase()}` : 'PX';
        const farmCode = task.farm_id ? `F${task.farm_id.slice(-2).toUpperCase()}` : 'FX';
        const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        setLotNumber(`${parcelCode}${farmCode}-${sequence}${year}`);
        setError(null);
        // Show success message briefly
        setError('✓ Récolte partielle enregistrée. Vous pouvez continuer.');
        setTimeout(() => setError(null), 3000);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('taskDetail.errors.harvestComplete', 'Failed to complete harvest'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              task.task_type === 'harvesting' ? 'bg-amber-100 dark:bg-amber-900/30' :
              task.task_type === 'irrigation' ? 'bg-blue-100 dark:bg-blue-900/30' :
              'bg-green-100 dark:bg-green-900/30'
            }`}>
              {task.task_type === 'harvesting' ? (
                <Wheat className="w-5 h-5 text-amber-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {task.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TASK_PRIORITY_COLORS[task.priority]}`}>
                  {getTaskPriorityLabel(task.priority, 'fr')}
                </span>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TASK_STATUS_COLORS[task.status]}`}>
                  {getTaskStatusLabel(task.status, 'fr')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onEdit}
                aria-label={t('common.edit', 'Edit')}
              >
                <Edit className="w-5 h-5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Blocked-by banner — surfaces unresolved dependencies so workers know
              why the task can't be started yet. */}
          {blockedStatus?.blocked && blockedStatus.blockers.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {t('tasks.blocked.title', 'Task is blocked by {{count}} unresolved dependency', {
                      count: blockedStatus.blockers.length,
                      defaultValue_plural: 'Task is blocked by {{count}} unresolved dependencies',
                    })}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {blockedStatus.blockers.map((b, i) => (
                      <li key={b.id ?? i} className="text-sm text-amber-800 dark:text-amber-200">
                        • {b.title ?? 'Untitled task'}
                        {b.status ? <span className="ml-2 text-xs italic">({b.status})</span> : null}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    {t('tasks.blocked.hint', 'Complete the blockers above before starting this task.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Task Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('taskDetail.fields.taskType', 'Task type')}</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {getTaskTypeLabel(task.task_type, 'fr')}
              </p>
            </div>

            {'farm_name' in task && task.farm_name && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('taskDetail.fields.farm', 'Farm')}</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {task.farm_name}
                </p>
              </div>
            )}

            {'parcel_name' in task && task.parcel_name && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('taskDetail.fields.parcel', 'Parcel')}</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  {task.parcel_name}
                </p>
              </div>
            )}

            {'worker_name' in task && task.worker_name && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('taskDetail.fields.assignedTo', 'Assigned to')}</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {task.worker_name}
                </p>
              </div>
            )}

            {task.estimated_duration && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('taskDetail.fields.estimatedDuration', 'Estimated duration')}</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('taskDetail.fields.estimatedDurationValue', '{{hours}} hours', { hours: task.estimated_duration })}
                </p>
              </div>
            )}

            {task.scheduled_start && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('taskDetail.fields.scheduledDate', 'Scheduled date')}</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(task.scheduled_start), 'PPP', { locale: fr })}
                </p>
              </div>
            )}

            {task.due_date && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('taskDetail.fields.dueDate', 'Due date')}</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(task.due_date), 'PPP', { locale: fr })}
                </p>
              </div>
            )}
          </div>

          {task.description && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('taskDetail.fields.description', 'Description')}</p>
              <p className="text-gray-900 dark:text-white">{task.description}</p>
            </div>
          )}

          {/* Payment Info */}
          {task.payment_type && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">{t('taskDetail.payment.title', 'Payment information')}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">{t('taskDetail.payment.type', 'Payment type')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {task.payment_type === 'per_unit' ? t('taskDetail.payment.types.perUnit', 'Per unit') :
                     task.payment_type === 'daily' ? t('taskDetail.payment.types.daily', 'Daily') :
                     task.payment_type === 'monthly' ? t('taskDetail.payment.types.monthly', 'Monthly') : t('taskDetail.payment.types.metayage', 'Sharecropping')}
                  </p>
                </div>
                {task.units_required && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">{t('taskDetail.payment.estimatedUnits', 'Estimated units')}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{task.units_required}</p>
                  </div>
                )}
                {task.rate_per_unit && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">{t('taskDetail.payment.ratePerUnit', 'Rate per unit')}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{task.rate_per_unit} MAD</p>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Per-Unit Completion Form */}
          {showPerUnitForm && (
            <div className="border-t dark:border-gray-700 pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-600" />
                {t('taskDetail.perUnitForm.title', 'Per-unit payment')}
              </h3>

              {/* Tarif par unité (always shown) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_per_unit_completion">{t('taskDetail.perUnitForm.ratePerUnit', 'Rate per unit (MAD) *')}</Label>
                  <Input
                    id="rate_per_unit_completion"
                    type="number"
                    min="0"
                    step="0.01"
                    value={perUnitData.rate_per_unit || ''}
                    onChange={(e) => setPerUnitData({ ...perUnitData, rate_per_unit: parseFloat(e.target.value) || 0 })}
                    placeholder={t('taskDetail.perUnitForm.ratePlaceholder', 'E.g. 5.00')}
                  />
                </div>
              </div>

              {/* Per-worker units if multiple workers */}
              {hasMultipleWorkers ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('taskDetail.perUnitForm.unitsPerWorker', 'Units per worker')}</p>
                  {taskAssignments.map(assignment => (
                    <div key={assignment.worker_id} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300 w-40 truncate">
                        {assignment.worker?.first_name} {assignment.worker?.last_name}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={workerUnits[assignment.worker_id] ?? ''}
                        onChange={(e) => setWorkerUnits(prev => ({
                          ...prev,
                          [assignment.worker_id]: parseFloat(e.target.value) || 0,
                        }))}
                        placeholder="0"
                        className="w-32"
                      />
                      {workerUnits[assignment.worker_id] > 0 && perUnitData.rate_per_unit > 0 && (
                        <span className="text-sm text-green-600 font-medium">
                          = {(workerUnits[assignment.worker_id] * perUnitData.rate_per_unit).toFixed(2)} MAD
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="units_completed">{t('taskDetail.perUnitForm.unitsCompleted', 'Units completed *')}</Label>
                  <Input
                    id="units_completed"
                    type="number"
                    min="0"
                    step="0.01"
                    value={perUnitData.units_completed || ''}
                    onChange={(e) => setPerUnitData({ ...perUnitData, units_completed: parseFloat(e.target.value) || 0 })}
                    placeholder={t('taskDetail.perUnitForm.unitsPlaceholder', 'E.g. 100')}
                  />
                  {task.units_required && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('taskDetail.payment.estimatedUnitsValue', 'Estimated units: {{count}}', { count: task.units_required })}
                    </p>
                  )}
                </div>
              )}

              {/* Total summary */}
              {perUnitData.rate_per_unit > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      {t('taskDetail.perUnitForm.totalPayment', 'Total payment')}
                    </span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {hasMultipleWorkers
                        ? (Object.values(workerUnits).reduce((s, v) => s + v, 0) * perUnitData.rate_per_unit).toFixed(2)
                        : (perUnitData.units_completed * perUnitData.rate_per_unit).toFixed(2)} MAD
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="per_unit_notes">{t('taskDetail.fields.notes', 'Notes')}</Label>
                <Textarea
                  id="per_unit_notes"
                  value={perUnitData.notes}
                  onChange={(e) => setPerUnitData({ ...perUnitData, notes: e.target.value })}
                  rows={2}
                  placeholder={t('taskDetail.perUnitForm.notesPlaceholder', 'Notes about the work completed...')}
                />
              </div>
            </div>
          )}
          {/* Harvest Completion Form */}
          {showHarvestForm && (
            <div className="border-t dark:border-gray-700 pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-600" />
                {t('taskDetail.harvestForm.title', 'Record harvest')}
              </h3>

              {/* Completion Type Selector */}
              <div className="space-y-2">
                <Label>{t('taskDetail.harvestForm.completionType', 'Completion type')}</Label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    completionType === 'complete'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="completionType"
                      value="complete"
                      checked={completionType === 'complete'}
                      onChange={() => setCompletionType('complete')}
                      className="sr-only"
                    />
                    <CheckCircle className={`w-5 h-5 ${completionType === 'complete' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium text-sm">{t('taskDetail.harvestForm.completeFull', 'Complete fully')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('taskDetail.harvestForm.completeFullDesc', 'Mark the task as completed')}</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    completionType === 'partial'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="completionType"
                      value="partial"
                      checked={completionType === 'partial'}
                      onChange={() => setCompletionType('partial')}
                      className="sr-only"
                    />
                    <PackageCheck className={`w-5 h-5 ${completionType === 'partial' ? 'text-amber-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium text-sm">{t('taskDetail.harvestForm.partial', 'Partial harvest')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('taskDetail.harvestForm.partialDesc', 'Continue the task after')}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Lot Number */}
              <div className="space-y-2">
                <Label htmlFor="lot_number" className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  {t('taskDetail.harvestForm.lotNumber', 'Lot number *')}
                </Label>
                <Input
                  id="lot_number"
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder={t('taskDetail.harvestForm.lotPlaceholder', 'E.g. P1FM1-0012025')}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format automatique: {'{'}ParcelCode{'}'}{'{'}FarmCode{'}'}-{'{'}Sequence{'}'}{'{'}Year{'}'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Crop Selector */}
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="crop_id">{t('taskDetail.harvestForm.cropHarvested', 'Harvested crop *')}</Label>
                  <Select
                    value={harvestData.crop_id || '__none__'}
                    onValueChange={(value) => setHarvestData({ ...harvestData, crop_id: value === '__none__' ? '' : value })}
                  >
                    <SelectTrigger id="crop_id">
                        <SelectValue placeholder={t('taskDetail.harvestForm.selectCrop', 'Select a crop')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__none__">{t('taskDetail.harvestForm.selectCropPlaceholder', 'Select a crop...')}</SelectItem>
                      {availableCrops.map((crop: CropOption) => (
                        <SelectItem key={crop.id} value={crop.id}>
                          {crop.name} {crop.parcel_name ? `(${crop.parcel_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableCrops.length === 0 && (
                    <p className="text-sm text-amber-600">
                      {task.parcel_id
                        ? parcel && !parcel.crop_type
                          ? t('taskDetail.noCropType', "This parcel has no crop type defined. Please edit the parcel to add a crop type.")
                          : t('taskDetail.noCropFound', "No crop found for this parcel. Please create a crop in Agriculture > Crops first.")
                        : t('taskDetail.noParcel', "No parcel assigned to this task. Edit the task to add a parcel, or create a crop in Agriculture > Crops.")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harvest_date">{t('taskDetail.harvestForm.harvestDate', 'Harvest date *')}</Label>
                  <Input
                    id="harvest_date"
                    type="date"
                    value={harvestData.harvest_date}
                    onChange={(e) => setHarvestData({ ...harvestData, harvest_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">{t('taskDetail.harvestForm.quantityHarvested', 'Quantity harvested *')}</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="0.1"
                    value={harvestData.quantity || ''}
                    onChange={(e) => setHarvestData({ ...harvestData, quantity: parseFloat(e.target.value) || 0 })}
                    placeholder={t('taskDetail.harvestForm.quantityPlaceholder', 'E.g. 500')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">{t('taskDetail.harvestForm.unit', 'Unit')}</Label>
                  <Select
                    value={harvestData.unit}
                    onValueChange={(value) => setHarvestData({ ...harvestData, unit: value as HarvestUnit })}
                  >
                    <SelectTrigger id="unit">
                        <SelectValue placeholder={t('taskDetail.harvestForm.select', 'Select')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="kg">{t('taskDetail.harvestForm.units.kg', 'Kilograms (kg)')}</SelectItem>
                        <SelectItem value="tons">{t('taskDetail.harvestForm.units.tons', 'Tons')}</SelectItem>
                        <SelectItem value="units">{t('taskDetail.harvestForm.units.units', 'Units')}</SelectItem>
                        <SelectItem value="boxes">{t('taskDetail.harvestForm.units.boxes', 'Boxes')}</SelectItem>
                        <SelectItem value="crates">{t('taskDetail.harvestForm.units.crates', 'Crates')}</SelectItem>
                        <SelectItem value="liters">{t('taskDetail.harvestForm.units.liters', 'Liters')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quality_grade">{t('taskDetail.harvestForm.qualityGrade', 'Quality grade')}</Label>
                  <Select
                    value={harvestData.quality_grade}
                    onValueChange={(value) => setHarvestData({ ...harvestData, quality_grade: value as HarvestQualityGrade })}
                  >
                    <SelectTrigger id="quality_grade">
                        <SelectValue placeholder={t('taskDetail.harvestForm.select', 'Select')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Extra">{t('taskDetail.harvestForm.grades.extra', 'Extra')}</SelectItem>
                        <SelectItem value="A">{t('taskDetail.harvestForm.grades.a', 'Grade A')}</SelectItem>
                        <SelectItem value="First">{t('taskDetail.harvestForm.grades.first', 'First quality')}</SelectItem>
                        <SelectItem value="B">{t('taskDetail.harvestForm.grades.b', 'Grade B')}</SelectItem>
                        <SelectItem value="Second">{t('taskDetail.harvestForm.grades.second', 'Second quality')}</SelectItem>
                        <SelectItem value="C">{t('taskDetail.harvestForm.grades.c', 'Grade C')}</SelectItem>
                        <SelectItem value="Third">{t('taskDetail.harvestForm.grades.third', 'Third quality')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="harvest_notes">{t('taskDetail.fields.notes', 'Notes')}</Label>
                <Textarea
                  id="harvest_notes"
                  value={harvestData.harvest_notes || ''}
                  onChange={(e) => setHarvestData({ ...harvestData, harvest_notes: e.target.value })}
                  rows={2}
                  placeholder={t('taskDetail.harvestForm.notesPlaceholder', 'Harvest notes...')}
                />
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {task.completion_percentage > 0 && task.status !== 'completed' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('taskDetail.fields.progress', 'Progress')}</span>
                <span className="font-medium text-gray-900 dark:text-white">{task.completion_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${task.completion_percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Running Cost tile — live summary of hours logged and piece-work earned */}
          {costSummary.hasAny && (
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  {t('tasks.cost.title', 'Running cost')}
                </h4>
                {costSummary.estimatedCost > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('tasks.cost.vs', 'vs {{est}} MAD estimated', { est: costSummary.estimatedCost.toLocaleString('fr-FR') })}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {t('tasks.cost.hoursLogged', 'Hours logged')}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {costSummary.totalHours.toFixed(2)}h
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {t('tasks.cost.unitsDone', 'Units done')}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {costSummary.unitsCompleted}
                    {task.units_required ? (
                      <span className="text-gray-400"> / {task.units_required}</span>
                    ) : null}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {t('tasks.cost.pieceWork', 'Piece-work')}
                  </p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {costSummary.pieceWorkCost.toLocaleString('fr-FR')} MAD
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {t('tasks.cost.actual', 'Actual cost')}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {costSummary.actualCost.toLocaleString('fr-FR')} MAD
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dependencies section — shows what this task depends on AND what depends on it */}
          {dependencies && (dependencies.depends_on.length > 0 || dependencies.required_by.length > 0) && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-500" />
                {t('tasks.dependencies.title', 'Dependencies')}
              </h4>
              {dependencies.depends_on.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('tasks.dependencies.dependsOn', 'Depends on')}
                  </p>
                  <ul className="space-y-1">
                    {dependencies.depends_on.map((d) => (
                      <li key={d.id} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${d.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {d.title}
                        {d.status ? <span className="text-xs text-gray-400">({d.status})</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {dependencies.required_by.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('tasks.dependencies.requiredBy', 'Required by')}
                  </p>
                  <ul className="space-y-1">
                    {dependencies.required_by.map((d) => (
                      <li key={d.id} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                        {d.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Activity timeline — merged feed of milestones, comments, and clock events */}
          {timelineEvents.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500" />
                {t('tasks.activity.title', 'Activity')}
                <span className="text-xs text-gray-400 font-normal">({timelineEvents.length})</span>
              </h4>
              <ol className="relative border-s border-gray-200 dark:border-gray-700 ps-6 space-y-4">
                {timelineEvents.map((evt) => {
                  const Icon = evt.icon;
                  const toneClasses =
                    evt.tone === 'success'
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : evt.tone === 'warning'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                      : evt.tone === 'info'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
                  return (
                    <li key={evt.id} className="relative">
                      {evt.kind === 'comment' && evt.author ? (
                        <span className="absolute -start-9 flex items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-800 overflow-hidden">
                          <UserAvatar
                            src={evt.authorAvatarUrl}
                            firstName={evt.author.split(' ')[0]}
                            lastName={evt.author.split(' ').slice(1).join(' ')}
                            size="xs"
                          />
                        </span>
                      ) : (
                        <span className={`absolute -start-9 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-800 ${toneClasses}`}>
                          <Icon className="h-3 w-3" />
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{evt.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(evt.at), 'PPp', { locale: fr })}
                          {evt.author ? <span className="ml-2">· {evt.author}</span> : null}
                        </p>
                        {evt.body && (
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {evt.body}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              {t('taskDetail.actions.close', 'Close')}
            </Button>

            {canStart && (
              <Button variant="blue" onClick={handleStartTask} disabled={isLoading} >
                <Play className="w-4 h-4 mr-2" />
                {t('taskDetail.actions.start', 'Start')}
              </Button>
            )}

            {canPause && (
              <Button
                onClick={handlePauseTask}
                disabled={isLoading}
                variant="outline"
              >
                <Pause className="w-4 h-4 mr-2" />
                {t('taskDetail.actions.pause', 'Pause')}
              </Button>
            )}

            {canResume && (
              <Button variant="blue" onClick={handleResumeTask} disabled={isLoading} >
                <Play className="w-4 h-4 mr-2" />
                {t('taskDetail.actions.resume', 'Resume')}
              </Button>
            )}

            {canComplete && !showHarvestForm && !showPerUnitForm && (
              <Button variant="green" onClick={handleCompleteTask} disabled={isLoading} >
                {isHarvestingTask ? (
                  <>
                    <Wheat className="w-4 h-4 mr-2" />
                    {t('taskDetail.actions.completeWithHarvest', 'Complete with harvest')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('taskDetail.actions.complete', 'Complete')}
                  </>
                )}
              </Button>
            )}


            {showPerUnitForm && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowPerUnitForm(false)}
                >
                  {t('taskDetail.actions.cancel', 'Cancel')}
                </Button>
                <Button variant="green" onClick={handleCompletePerUnit} disabled={isLoading || perUnitData.units_completed <= 0} >
                  {isLoading ? (
                    t('taskDetail.actions.saving', 'Saving...')
                  ) : (
                    <>
                      <Banknote className="w-4 h-4 mr-2" />
                      {t('taskDetail.actions.completeAndPay', 'Complete and pay')}
                    </>
                  )}
                </Button>
              </>
            )}
            {showHarvestForm && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHarvestForm(false);
                    setCompletionType('complete');
                    setLotNumber('');
                  }}
                >
                  {t('taskDetail.actions.cancel', 'Cancel')}
                </Button>
                <Button
                  variant={completionType === 'partial' ? 'amber' : 'green'}
                  onClick={handleCompleteWithHarvest}
                  disabled={isLoading}
                >
                  {completionType === 'partial' ? (
                    <PackageCheck className="w-4 h-4 mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {isLoading
                    ? t('taskDetail.actions.saving', 'Saving...')
                    : completionType === 'partial'
                    ? t('taskDetail.actions.savePartialHarvest', 'Save partial harvest')
                    : t('taskDetail.actions.completeAndSave', 'Complete and save')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailDialog;
