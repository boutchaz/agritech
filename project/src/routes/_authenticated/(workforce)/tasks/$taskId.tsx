import React, { useState, useEffect, useMemo } from 'react';
import { subscribeQueue, isOnline as isDeviceOnline } from '@/lib/offlineTaskQueue';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Play,
  CheckCircle,
  CheckCircle2,
  Pause,
  MapPin,
  User,
  Wheat,
  AlertCircle,
  PackageCheck,
  Hash,
  MessageSquare,
  Loader2,
  Lock,
  Eye,
  Pencil,
  Trash2,
  Briefcase,
  Calendar,
  Clock,
  CheckSquare,
  Box,
  Workflow,
  Banknote,
  X as XIcon,
  Check,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { DetailPageSkeleton } from '@/components/ui/page-skeletons';
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useTaskComments,
  useTaskTimeLogs,
  useIsTaskBlocked,
  useTaskWatchers,
  useFollowTask,
  useUnfollowTask,
  useUpdateTaskComment,
  useDeleteTaskComment,
  useResolveTaskComment,
  useTaskChecklist,
} from '@/hooks/useTasks';
import { useTaskAssignments } from '@/hooks/useTaskAssignments';
import { useFarms, useParcelsByOrganization, useParcelById } from '@/hooks/useParcelsQuery';
import { useActiveWorkers } from '@/hooks/useWorkers';
import TaskAttachments, { useTaskAttachmentsQuery } from '@/components/Tasks/TaskAttachments';
import TaskChecklist from '@/components/Tasks/TaskChecklist';
import TaskDependencies from '@/components/Tasks/TaskDependencies';
import TaskWorklog from '@/components/Tasks/TaskWorklog';
import TaskCommentInput from '@/components/Tasks/TaskCommentInput';
import CommentDisplay from '@/components/Tasks/CommentDisplay';
import UserAvatar from '@/components/ui/UserAvatar';
import { tasksApi } from '@/lib/api/tasks';
import { cn } from '@/lib/utils';
import type { TaskAssignment } from '@/lib/api/task-assignments';
type CropOption = { id: string; name: string; parcel_id?: string; parcel_name?: string; farm_id?: string; variety_id?: string; variety_name?: string; created_at?: string; updated_at?: string };
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { CompleteHarvestTaskRequest } from '@/types/tasks';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
} from '@/types/tasks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { format, formatDistance } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';
import type { TaskComment } from '@/types/tasks';

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

// In-page edit form schema (subset of TaskForm for the inline edit experience)
const createEditSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(1, t('tasks.form.validation.titleRequired')),
  description: z.string(),
  priority: z.string().min(1),
  status: z.string().min(1),
  farm_id: z.string(),
  parcel_id: z.string(),
  assigned_to: z.string(),
  scheduled_start: z.string(),
  due_date: z.string(),
  estimated_duration: z.number(),
  notes: z.string(),
});
type EditFormData = z.infer<ReturnType<typeof createEditSchema>>;

const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  return '';
};

// Hero status pill labels (translated minimally inline)
const STATUS_HERO_LABEL: Record<string, string> = {
  pending: 'En attente',
  assigned: 'Assignée',
  in_progress: 'En cours',
  paused: 'En pause',
  completed: 'Terminée',
  cancelled: 'Annulée',
  overdue: 'En retard',
};
const PRIORITY_HERO_LABEL: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

function TaskDetailPage() {
  const { t, i18n } = useTranslation();
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const { currentOrganization, profile } = useAuth();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const organizationId = currentOrganization?.id || '';

  const { data: task, isLoading, error: fetchError } = useTask(organizationId || null, taskId);

  // State for actions
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [completionType, setCompletionType] = useState<'complete' | 'partial'>('complete');
  const [lotNumber, setLotNumber] = useState<string>('');

  // Per-unit form
  const [showPerUnitForm, setShowPerUnitForm] = useState(false);
  const [perUnitData, setPerUnitData] = useState({ units_completed: 0, rate_per_unit: 0, notes: '' });
  const [workerUnits, setWorkerUnits] = useState<Record<string, number>>({});

  // Per-worker units for harvest tasks with per-unit payment
  const [harvestWorkerUnits, setHarvestWorkerUnits] = useState<Record<string, number>>({});
  const [harvestRatePerUnit, setHarvestRatePerUnit] = useState<number>(0);

  // Edit mode toggle (in-page edit)
  const [isEditing, setIsEditing] = useState(false);
  const [showReassign, setShowReassign] = useState(false);

  // Task assignments (multi-worker)
  const { data: taskAssignments = [] } = useTaskAssignments(task?.id);
  const allWorkers = React.useMemo(() => {
    if (!task) return taskAssignments;
    const primaryInAssignments = task.worker_id && taskAssignments.some(a => a.worker_id === task.worker_id);
    if (task.worker_id && !primaryInAssignments) {
      const timestamp = task.updated_at || task.created_at || new Date().toISOString();
      const primaryWorker: TaskAssignment = {
        id: `primary-${task.worker_id}`,
        task_id: task.id,
        organization_id: task.organization_id || organizationId,
        worker_id: task.worker_id,
        role: 'worker',
        assigned_at: timestamp,
        status: 'assigned',
        created_at: timestamp,
        updated_at: timestamp,
        worker: { id: task.worker_id, first_name: task.worker_name?.split(' ')[0] || '', last_name: task.worker_name?.split(' ').slice(1).join(' ') || '' },
      };
      return [primaryWorker, ...taskAssignments];
    }
    return taskAssignments;
  }, [organizationId, taskAssignments, task]);
  const hasMultipleWorkers = allWorkers.length > 1;

  // Comments
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(taskId);

  // Collaboration data
  const { data: timeLogs = [] } = useTaskTimeLogs(taskId);
  const { data: blockedStatus } = useIsTaskBlocked(taskId);
  const { data: watchers = [] } = useTaskWatchers(taskId);
  const followTask = useFollowTask();
  const unfollowTask = useUnfollowTask();
  const updateComment = useUpdateTaskComment();
  const deleteComment = useDeleteTaskComment();
  const resolveComment = useResolveTaskComment();

  const currentUserId = profile?.id;
  const isWatching = !!watchers.find((w) => w.user_id === currentUserId);

  const { data: checklistForHeader } = useTaskChecklist(taskId);
  const { data: attachmentList = [] } = useTaskAttachmentsQuery(taskId, organizationId);

  // Comment editing state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  // Offline queue status
  const [isOnline, setIsOnline] = useState(isDeviceOnline());
  const [queuedCount, setQueuedCount] = useState(0);
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const unsub = subscribeQueue((items) => setQueuedCount(items.length));
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      unsub();
    };
  }, []);

  const totalHoursLogged = useMemo(() => {
    return timeLogs.reduce((sum, l) => {
      const recorded = Number(l.total_hours || 0);
      if (recorded > 0) return sum + recorded;
      if (!l.end_time) return sum;
      const startMs = new Date(l.start_time).getTime();
      const endMs = new Date(l.end_time).getTime();
      const breakMs = (l.break_duration || 0) * 60 * 1000;
      return sum + Math.max(0, (endMs - startMs - breakMs) / (1000 * 60 * 60));
    }, 0);
  }, [timeLogs]);

  const getLocale = () => {
    if (i18n.language.startsWith('fr')) return fr;
    if (i18n.language.startsWith('ar')) return ar;
    return enUS;
  };

  // Generate lot number when harvest form opens
  useEffect(() => {
    if (showHarvestForm && !lotNumber && task) {
      const year = new Date().getFullYear();
      const parcelCode = task.parcel_id ? `P${task.parcel_id.slice(-2).toUpperCase()}` : 'PX';
      const farmCode = task.farm_id ? `F${task.farm_id.slice(-2).toUpperCase()}` : 'FX';
      const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
      setLotNumber(`${parcelCode}${farmCode}-${sequence}${year}`);
    }
  }, [showHarvestForm, lotNumber, task]);

  const { data: parcel } = useParcelById(task?.parcel_id);
  const { data: farms = [] } = useFarms(organizationId);
  const { data: parcels = [] } = useParcelsByOrganization(organizationId);
  const { data: workers = [] } = useActiveWorkers(organizationId);

  const availableCrops: CropOption[] = useMemo(() => {
    if (parcel && parcel.crop_type && task?.parcel_id) {
      return [{
        id: `parcel-${parcel.id}`,
        name: parcel.crop_type,
        parcel_id: parcel.id,
        parcel_name: parcel.name,
        farm_id: parcel.farm_id || task?.farm_id || '',
        variety_id: '',
        variety_name: parcel.variety || undefined,
        created_at: parcel.created_at || new Date().toISOString(),
        updated_at: parcel.updated_at || new Date().toISOString(),
      }];
    }
    return [];
  }, [parcel, task?.parcel_id, task?.farm_id]);

  const initialCropId = task?.crop_id || (availableCrops.length > 0 ? availableCrops[0].id : '');
  const firstAvailableCropId = availableCrops[0]?.id;
  const [harvestData, setHarvestData] = useState<Partial<CompleteHarvestTaskRequest>>({
    crop_id: initialCropId,
    harvest_date: new Date().toISOString().split('T')[0],
    quantity: 0,
    unit: 'kg',
    quality_grade: 'A',
    workers: [],
  });

  useEffect(() => {
    if (!harvestData.crop_id && firstAvailableCropId) {
      setHarvestData(prev => ({ ...prev, crop_id: firstAvailableCropId }));
    }
  }, [firstAvailableCropId, harvestData.crop_id]);

  // Edit form (react-hook-form)
  const editSchema = useMemo(() => createEditSchema(t), [t]);
  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      farm_id: '',
      parcel_id: '',
      assigned_to: '',
      scheduled_start: '',
      due_date: '',
      estimated_duration: 0,
      notes: '',
    },
  });

  // Reset form whenever we enter edit mode or task data changes
  useEffect(() => {
    if (task && isEditing) {
      editForm.reset({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        farm_id: task.farm_id || '',
        parcel_id: task.parcel_id || '',
        assigned_to: task.worker_id || '',
        scheduled_start: formatDateForInput(task.scheduled_start),
        due_date: formatDateForInput(task.due_date),
        estimated_duration: Number(task.estimated_duration ?? 0),
        notes: (task as { notes?: string }).notes || '',
      });
    }
  }, [task, isEditing, editForm]);

  const watchedFarmId = editForm.watch('farm_id');
  const filteredParcels = useMemo(
    () => parcels.filter((p) => !watchedFarmId || p.farm_id === watchedFarmId),
    [parcels, watchedFarmId],
  );

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!task || fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('tasks.detail.notFound', 'Task not found')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('tasks.detail.notFoundDesc', 'The task may have been deleted or you may not have access.')}
        </p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/tasks">{t('tasks.detail.backToList', 'Back to tasks')}</Link>
        </Button>
      </div>
    );
  }

  const isHarvestingTask = task.task_type === 'harvesting';
  const isPerUnitTask = task.payment_type === 'per_unit';
  const canStart = task.status === 'pending' || task.status === 'assigned';
  const canPause = task.status === 'in_progress';
  const canResume = task.status === 'paused';
  const canComplete = task.status === 'in_progress' || task.status === 'paused';
  const isClosed = task.status === 'completed' || task.status === 'cancelled';
  const getTaskOrganizationId = () => task.organization_id || currentOrganization?.id || '';

  // Computed completion percentage (prefer task.completion_percentage, fallback to logged hours / estimated)
  const computedPercent = (() => {
    if (task.status === 'completed') return 100;
    const cp = Number(task.completion_percentage ?? 0);
    if (cp > 0) return Math.min(100, cp);
    const est = Number(task.estimated_duration ?? 0);
    if (est > 0 && totalHoursLogged > 0) return Math.min(100, Math.round((totalHoursLogged / est) * 100));
    return 0;
  })();

  const handleStartTask = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) {
      setError(t('tasks.detail.errors.noOrganization', 'Organization context is missing'));
      return;
    }
    try {
      setIsActionLoading(true);
      setError(null);
      await tasksApi.start(taskOrganizationId, task.id);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskOrganizationId, task.id] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('tasks.detail.errors.start', 'Failed to start task'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseTask = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) return;
    try {
      setIsActionLoading(true);
      setError(null);
      await updateTask.mutateAsync({
        taskId: task.id,
        organizationId: taskOrganizationId,
        updates: { status: 'paused' },
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('tasks.detail.errors.pause', 'Failed to pause task'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResumeTask = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) return;
    try {
      setIsActionLoading(true);
      setError(null);
      await updateTask.mutateAsync({
        taskId: task.id,
        organizationId: taskOrganizationId,
        updates: { status: 'in_progress' },
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('tasks.detail.errors.resume', 'Failed to resume task'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) return;

    if (isHarvestingTask) {
      setHarvestRatePerUnit(task.rate_per_unit || 0);
      setShowHarvestForm(true);
      return;
    }
    if (isPerUnitTask) {
      setPerUnitData({ units_completed: task.units_required || 0, rate_per_unit: task.rate_per_unit || 0, notes: '' });
      setShowPerUnitForm(true);
      return;
    }

    try {
      setIsActionLoading(true);
      setError(null);
      await tasksApi.complete(taskOrganizationId, task.id, {});
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskOrganizationId, task.id] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('tasks.detail.errors.complete', 'Failed to complete task'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompletePerUnit = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (perUnitData.rate_per_unit <= 0) {
      setError(t('tasks.detail.errors.rateRequired', 'Please enter the rate per unit'));
      return;
    }
    if (!hasMultipleWorkers && perUnitData.units_completed <= 0) {
      setError(t('tasks.detail.errors.unitsRequired', 'Please enter the number of completed units'));
      return;
    }
    if (hasMultipleWorkers && Object.values(workerUnits).every(v => v <= 0)) {
      setError(t('tasks.detail.errors.workerUnitsRequired', 'Please enter units for at least one worker'));
      return;
    }
    try {
      setIsActionLoading(true);
      setError(null);

      const worker_completions = hasMultipleWorkers
        ? allWorkers.map(a => ({
            worker_id: a.worker_id,
            units_completed: workerUnits[a.worker_id] ?? 0,
          }))
        : undefined;

      const totalUnits = hasMultipleWorkers
        ? Object.values(workerUnits).reduce((s, v) => s + v, 0)
        : perUnitData.units_completed;

      const completionPayload: TaskCompletionPayload = {
        units_completed: totalUnits,
        rate_per_unit: perUnitData.rate_per_unit,
        actual_cost: totalUnits * perUnitData.rate_per_unit,
        notes: perUnitData.notes || undefined,
        ...(worker_completions ? { worker_completions } : {}),
      };
      await tasksApi.complete(taskOrganizationId, task.id, completionPayload);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskOrganizationId, task.id] });
      queryClient.invalidateQueries({ queryKey: ['work-records'] });
      navigate({ to: '/tasks' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('tasks.detail.errors.completeFailed', 'Failed to complete task'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteWithHarvest = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) return;

    if (!harvestData.crop_id) {
      setError(t('tasks.detail.errors.cropRequired', 'Please select a crop'));
      return;
    }
    if (!harvestData.quantity || harvestData.quantity <= 0) {
      setError(t('tasks.detail.errors.quantityRequired', 'Please enter a valid quantity'));
      return;
    }
    if (!lotNumber) {
      setError(t('tasks.detail.errors.lotNumberRequired', 'Please enter a lot number'));
      return;
    }
    if (isPerUnitTask && hasMultipleWorkers) {
      const totalUnits = Object.values(harvestWorkerUnits).reduce((s, v) => s + v, 0);
      if (totalUnits <= 0) {
        setError(t('tasks.detail.errors.workerUnitsRequired', 'Please enter units for at least one worker'));
        return;
      }
    }

    try {
      setIsActionLoading(true);
      setError(null);

      const cropIdToSend = harvestData.crop_id &&
        !harvestData.crop_id.startsWith('parcel-') &&
        harvestData.crop_id.trim() !== ''
        ? harvestData.crop_id
        : undefined;

      const workersPayload = (isPerUnitTask && hasMultipleWorkers)
        ? allWorkers.map(a => ({
            worker_id: a.worker_id,
            hours_worked: 0,
            quantity_picked: harvestWorkerUnits[a.worker_id] ?? 0,
          }))
        : (harvestData.workers || []);

      const requestPayload: CompleteHarvestTaskRequest & { lot_number: string; is_partial: boolean; rate_per_unit?: number } = {
        harvest_date: harvestData.harvest_date || new Date().toISOString().split('T')[0],
        quantity: harvestData.quantity || 0,
        unit: harvestData.unit || 'kg',
        workers: workersPayload,
        lot_number: lotNumber,
        is_partial: completionType === 'partial',
        ...(isPerUnitTask && harvestRatePerUnit > 0 ? { rate_per_unit: harvestRatePerUnit } : {}),
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
      if (cropIdToSend) requestPayload.crop_id = cropIdToSend;

      await tasksApi.completeWithHarvest(taskOrganizationId, task.id, requestPayload);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskOrganizationId, task.id] });
      queryClient.invalidateQueries({ queryKey: ['harvests'] });

      if (completionType === 'partial') {
        setHarvestData({ ...harvestData, quantity: 0, harvest_notes: '' });
        setHarvestWorkerUnits({});
        const year = new Date().getFullYear();
        const parcelCode = task.parcel_id ? `P${task.parcel_id.slice(-2).toUpperCase()}` : 'PX';
        const farmCode = task.farm_id ? `F${task.farm_id.slice(-2).toUpperCase()}` : 'FX';
        const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        setLotNumber(`${parcelCode}${farmCode}-${sequence}${year}`);
        setError(null);
      } else {
        navigate({ to: '/tasks' });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('tasks.detail.errors.harvestCompleteFailed', 'Failed to complete harvest'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) return;
    if (!confirm(t('tasks.detail.deleteConfirm', 'Supprimer cette tâche ? Cette action est irréversible.'))) return;
    try {
      setIsActionLoading(true);
      await deleteTask.mutateAsync({ taskId: task.id, organizationId: taskOrganizationId });
      toast.success(t('tasks.detail.deleted', 'Tâche supprimée'));
      navigate({ to: '/tasks' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('tasks.detail.errors.deleteFailed', 'Échec de la suppression'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveEdit = editForm.handleSubmit(async (values) => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) return;
    try {
      setIsActionLoading(true);
      await updateTask.mutateAsync({
        taskId: task.id,
        organizationId: taskOrganizationId,
        updates: {
          title: values.title,
          description: values.description || undefined,
          priority: values.priority as 'low' | 'medium' | 'high' | 'urgent',
          status: values.status as 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'cancelled',
          farm_id: values.farm_id || undefined,
          parcel_id: values.parcel_id || undefined,
          assigned_to: values.assigned_to || undefined,
          scheduled_start: values.scheduled_start || undefined,
          due_date: values.due_date || undefined,
          estimated_duration: values.estimated_duration || undefined,
          notes: values.notes || undefined,
        },
      });
      toast.success(t('tasks.detail.saved', 'Modifications enregistrées'));
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('tasks.detail.errors.saveFailed', 'Échec de la sauvegarde'));
    } finally {
      setIsActionLoading(false);
    }
  });

  const handleToggleWatch = async () => {
    if (!taskId) return;
    try {
      if (isWatching) {
        await unfollowTask.mutateAsync(taskId);
        toast.success(t('tasks.watch.unfollowed', 'You are no longer watching this task'));
      } else {
        await followTask.mutateAsync(taskId);
        toast.success(t('tasks.watch.followed', "You'll be notified of activity on this task"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('tasks.watch.failed', 'Failed to update watch status'));
    }
  };

  const handleStartEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditDraft(currentText);
  };
  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditDraft('');
  };
  const handleSaveEditComment = async (commentId: string) => {
    if (!taskId || !editDraft.trim()) return;
    try {
      await updateComment.mutateAsync({ taskId, commentId, comment: editDraft });
      toast.success(t('tasks.comments.updated', 'Comment updated'));
      handleCancelEditComment();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('tasks.comments.updateFailed', 'Failed to update comment'));
    }
  };
  const handleDeleteComment = async (commentId: string) => {
    if (!taskId) return;
    if (!confirm(t('tasks.comments.deleteConfirm', 'Delete this comment?'))) return;
    try {
      await deleteComment.mutateAsync({ taskId, commentId });
      toast.success(t('tasks.comments.deleted', 'Comment deleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('tasks.comments.deleteFailed', 'Failed to delete comment'));
    }
  };
  const handleToggleResolve = async (commentId: string, currentlyResolved: boolean) => {
    if (!taskId) return;
    try {
      await resolveComment.mutateAsync({ taskId, commentId, resolved: !currentlyResolved });
      toast.success(currentlyResolved
        ? t('tasks.comments.reopened', 'Comment reopened')
        : t('tasks.comments.resolved', 'Comment resolved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('tasks.comments.resolveFailed', 'Failed to update comment'));
    }
  };

  const handleReassign = async (workerId: string) => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) return;
    try {
      setIsActionLoading(true);
      await updateTask.mutateAsync({
        taskId: task.id,
        organizationId: taskOrganizationId,
        updates: { assigned_to: workerId },
      });
      toast.success(t('tasks.detail.reassigned', 'Tâche réassignée'));
      setShowReassign(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('tasks.detail.errors.reassignFailed', 'Échec de la réassignation'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const idShort = task.id.slice(0, 4).toUpperCase();
  const statusLabel = STATUS_HERO_LABEL[task.status] || getTaskStatusLabel(task.status, i18n.language as 'en' | 'fr');
  const priorityLabel = PRIORITY_HERO_LABEL[task.priority] || getTaskPriorityLabel(task.priority, i18n.language as 'en' | 'fr');
  const statusShowsPulseDot =
    task.status === 'in_progress' || task.status === 'assigned' || task.status === 'pending';

  const checklistItemsHeader = Array.isArray(checklistForHeader) ? checklistForHeader : [];
  const checklistDoneCount = checklistItemsHeader.filter((i: { completed?: boolean }) => i.completed).length;
  const checklistTotalCount = checklistItemsHeader.length;

  const cardShell =
    'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950';

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="-ms-2 h-9 gap-1.5 text-gray-600 dark:text-gray-400" asChild>
          <Link to="/tasks">
            <ArrowLeft className="h-4 w-4" />
            {t('tasks.detail.backToList', 'Back to tasks')}
          </Link>
        </Button>
      </div>

      {/* Green hero banner */}
      <div className="relative overflow-hidden rounded-2xl rounded-br-[2rem] bg-emerald-800 p-6 text-white shadow-md dark:bg-emerald-900">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/75">
              {t('tasks.detail.taskKicker', 'Tâche')}
              {task.parcel_name ? <> · {task.parcel_name}</> : null}
            </p>
            <h1 className="mt-1 truncate text-3xl font-bold tracking-tight lg:text-4xl">
              {task.title}
            </h1>
            {/* Pills */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-white/30">
                {statusShowsPulseDot ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-200" />
                  </span>
                ) : null}
                {statusLabel}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-white/30">
                {t('tasks.detail.priorityPrefix', 'Priorité')} {priorityLabel}
              </span>
              {task.estimated_duration ? (
                <span className="inline-flex items-center rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-white/30">
                  {task.estimated_duration}h
                </span>
              ) : null}
            </div>
            {/* Progress bar */}
            <div className="mt-6 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${computedPercent}%` }}
                  />
                </div>
                <span className="text-base font-bold tabular-nums text-white">{computedPercent}%</span>
              </div>
            </div>
          </div>

          {/* Hero actions */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  <XIcon className="me-2 h-4 w-4" />
                  {t('common.cancel', 'Annuler')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isActionLoading}
                  className="bg-white text-emerald-700 hover:bg-white/90 font-medium"
                >
                  <Save className="me-2 h-4 w-4" />
                  {t('common.save', 'Enregistrer')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleWatch}
                  disabled={followTask.isPending || unfollowTask.isPending}
                  className={cn(
                    "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white",
                    isWatching && "bg-white/25 ring-1 ring-white/40"
                  )}
                >
                  {followTask.isPending || unfollowTask.isPending ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="me-2 h-4 w-4" />
                  )}
                  {isWatching
                    ? t('tasks.watch.watching', 'Suivi ✓')
                    : t('tasks.watch.follow', 'Suivre')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="bg-white text-emerald-700 hover:bg-white/90 font-medium"
                >
                  <Pencil className="me-2 h-4 w-4" />
                  {t('common.edit', 'Modifier')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Offline / queue status banner */}
      {(!isOnline || queuedCount > 0) && (
        <div className={`rounded-lg p-3 border flex items-center gap-3 ${
          !isOnline
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        }`}>
          <span className={`inline-block w-2 h-2 rounded-full ${!isOnline ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`} />
          <div className="flex-1 text-sm">
            {!isOnline ? (
              <span className="text-amber-800 dark:text-amber-200">
                {t('tasks.offline.title', "You're offline")}
                {queuedCount > 0 && (
                  <span className="ml-1">
                    · {t('tasks.offline.queued', '{{count}} action waiting to sync', { count: queuedCount })}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-blue-800 dark:text-blue-200">
                {t('tasks.offline.syncing', 'Syncing {{count}} pending action...', { count: queuedCount })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Blocked-by banner */}
      {blockedStatus?.blocked && blockedStatus.blockers.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {t('tasks.blocked.title', 'Blocked by {{count}} unresolved dependency', { count: blockedStatus.blockers.length })}
              </p>
              <ul className="mt-2 space-y-1">
                {blockedStatus.blockers.map((b, i) => (
                  <li key={b.id ?? i} className="text-sm text-amber-800 dark:text-amber-200">
                    • {b.title ?? 'Untitled task'}
                    {b.status ? <span className="ml-2 text-xs italic">({b.status})</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Two-column grid — ~2/3 main, ~1/3 sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Informations card */}
          <Card className={cardShell}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <Briefcase className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base font-semibold">{t('tasks.detail.information', 'Informations')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isEditing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="edit-title">{t('tasks.form.title', 'Titre')}</Label>
                    <Input id="edit-title" {...editForm.register('title')} />
                    {editForm.formState.errors.title && (
                      <p className="text-xs text-red-600">{editForm.formState.errors.title.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="edit-description">{t('tasks.form.description', 'Description')}</Label>
                    <Textarea id="edit-description" rows={3} {...editForm.register('description')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('tasks.form.priority', 'Priorité')}</Label>
                    <Select
                      value={editForm.watch('priority')}
                      onValueChange={(v) => editForm.setValue('priority', v, { shouldDirty: true })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('tasks.priority.low', 'Basse')}</SelectItem>
                        <SelectItem value="medium">{t('tasks.priority.medium', 'Moyenne')}</SelectItem>
                        <SelectItem value="high">{t('tasks.priority.high', 'Haute')}</SelectItem>
                        <SelectItem value="urgent">{t('tasks.priority.urgent', 'Urgente')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('tasks.form.status', 'Statut')}</Label>
                    <Select
                      value={editForm.watch('status')}
                      onValueChange={(v) => editForm.setValue('status', v, { shouldDirty: true })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t('tasks.status.pending', 'En attente')}</SelectItem>
                        <SelectItem value="assigned">{t('tasks.status.assigned', 'Assignée')}</SelectItem>
                        <SelectItem value="in_progress">{t('tasks.status.in_progress', 'En cours')}</SelectItem>
                        <SelectItem value="paused">{t('tasks.status.paused', 'En pause')}</SelectItem>
                        <SelectItem value="completed">{t('tasks.status.completed', 'Terminée')}</SelectItem>
                        <SelectItem value="cancelled">{t('tasks.status.cancelled', 'Annulée')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('tasks.form.farm', 'Ferme')}</Label>
                    <Select
                      value={editForm.watch('farm_id') || '__none__'}
                      onValueChange={(v) => {
                        editForm.setValue('farm_id', v === '__none__' ? '' : v, { shouldDirty: true });
                        editForm.setValue('parcel_id', '', { shouldDirty: true });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder={t('tasks.form.selectFarm', 'Choisir...')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {farms.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('tasks.form.parcel', 'Parcelle')}</Label>
                    <Select
                      value={editForm.watch('parcel_id') || '__none__'}
                      onValueChange={(v) => editForm.setValue('parcel_id', v === '__none__' ? '' : v, { shouldDirty: true })}
                    >
                      <SelectTrigger><SelectValue placeholder={t('tasks.form.selectParcel', 'Choisir...')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {filteredParcels.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-scheduled-start">{t('tasks.detail.startPlanned', 'Début prévu')}</Label>
                    <Input id="edit-scheduled-start" type="date" {...editForm.register('scheduled_start')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-due-date">{t('tasks.detail.endPlanned', 'Fin prévue')}</Label>
                    <Input id="edit-due-date" type="date" {...editForm.register('due_date')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-duration">{t('tasks.detail.estimatedDuration', 'Durée estimée (h)')}</Label>
                    <Input
                      id="edit-duration"
                      type="number"
                      step="0.5"
                      {...editForm.register('estimated_duration', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('tasks.detail.assignedTo', 'Assignée à')}</Label>
                    <Select
                      value={editForm.watch('assigned_to') || '__none__'}
                      onValueChange={(v) => editForm.setValue('assigned_to', v === '__none__' ? '' : v, { shouldDirty: true })}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {workers.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {[w.first_name, w.last_name].filter(Boolean).join(' ') || w.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="edit-notes">{t('tasks.form.notes', 'Notes')}</Label>
                    <Textarea id="edit-notes" rows={2} {...editForm.register('notes')} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      label={t('tasks.detail.farmParcel', 'Ferme · Parcelle')}
                      value={[task.farm_name, task.parcel_name].filter(Boolean).join(' · ') || '—'}
                    />
                    <InfoField
                      icon={<Clock className="h-3.5 w-3.5" />}
                      label={t('tasks.detail.estimatedDuration', 'Durée estimée')}
                      value={task.estimated_duration ? `${task.estimated_duration}h` : '—'}
                    />
                    <InfoField
                      icon={<Calendar className="h-3.5 w-3.5" />}
                      label={t('tasks.detail.startPlanned', 'Début prévu')}
                      value={task.scheduled_start ? format(new Date(task.scheduled_start), 'dd MMM yyyy', { locale: getLocale() }) : '—'}
                    />
                    <InfoField
                      icon={<Calendar className="h-3.5 w-3.5" />}
                      label={t('tasks.detail.endPlanned', 'Fin prévue')}
                      value={task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy', { locale: getLocale() }) : '—'}
                    />
                  </div>
                  {task.description && (
                    <div className="mt-6 pt-4 border-t dark:border-gray-700">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                        {t('tasks.detail.description', 'Description')}
                      </p>
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{task.description}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Suivi du temps */}
          <Card className={cardShell}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base font-semibold">{t('tasks.detail.timeTracking', 'Suivi du temps')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <TaskWorklog
                taskId={taskId}
                taskStatus={task.status}
                assignedWorkerId={task.worker_id}
                embedded
              />
            </CardContent>
          </Card>

          {/* Liste de contrôle */}
          <Card className={cardShell}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold">{t('tasks.detail.checklist', 'Liste de contrôle')}</CardTitle>
              </div>
              {checklistTotalCount > 0 ? (
                <span className="text-sm font-medium tabular-nums text-gray-500 dark:text-gray-400">
                  {checklistDoneCount} / {checklistTotalCount}
                </span>
              ) : null}
            </CardHeader>
            <CardContent className="pt-0">
              <TaskChecklist taskId={taskId} disabled={task.status === 'cancelled'} embedded />
            </CardContent>
          </Card>

          {/* Pièces jointes */}
          <Card className={cardShell}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Box className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold">{t('tasks.detail.attachments', 'Pièces jointes')}</CardTitle>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('tasks.detail.fileCount', '{{count}} file(s)', { count: attachmentList.length })}
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              <TaskAttachments
                taskId={taskId}
                organizationId={currentOrganization?.id || ''}
                disabled={task.status === 'cancelled'}
                embedded
              />
            </CardContent>
          </Card>

          {/* Dépendances */}
          <Card className={cardShell}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <Workflow className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base font-semibold">{t('tasks.detail.dependenciesTitle', 'Dépendances')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <TaskDependencies
                taskId={taskId}
                organizationId={currentOrganization?.id || ''}
                disabled={task.status === 'cancelled'}
                embedded
              />
            </CardContent>
          </Card>

          {/* Harvest / Per-unit forms (kept inline, only when triggered) */}
          {showHarvestForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-600" />
                {t('tasks.harvestForm.title', 'Record harvest')}
              </h3>
              <div className="space-y-2">
                <Label>{t('tasks.harvestForm.completionType', 'Completion type')}</Label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    completionType === 'complete'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                    <input type="radio" name="completionType" value="complete" checked={completionType === 'complete'} onChange={() => setCompletionType('complete')} className="sr-only" />
                    <CheckCircle className={`w-5 h-5 ${completionType === 'complete' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium text-sm">{t('tasks.harvestForm.completeFull', 'Complete fully')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('tasks.harvestForm.completeFullDesc', 'Mark the task as completed')}</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    completionType === 'partial'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                    <input type="radio" name="completionType" value="partial" checked={completionType === 'partial'} onChange={() => setCompletionType('partial')} className="sr-only" />
                    <PackageCheck className={`w-5 h-5 ${completionType === 'partial' ? 'text-amber-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium text-sm">{t('tasks.harvestForm.partial', 'Partial harvest')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('tasks.harvestForm.partialDesc', 'Continue the task after')}</p>
                    </div>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot_number" className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  {t('tasks.harvestForm.lotNumber', 'Lot number *')}
                </Label>
                <Input
                  id="lot_number"
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="crop_id">{t('tasks.harvestForm.cropHarvested', 'Harvested crop *')}</Label>
                  <Select
                    value={harvestData.crop_id || '__none__'}
                    onValueChange={(value) => setHarvestData({ ...harvestData, crop_id: value === '__none__' ? '' : value })}
                  >
                    <SelectTrigger id="crop_id"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('tasks.harvestForm.selectCropPlaceholder', 'Select a crop...')}</SelectItem>
                      {availableCrops.map((crop: CropOption) => (
                        <SelectItem key={crop.id} value={crop.id}>
                          {crop.name} {crop.parcel_name ? `(${crop.parcel_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="harvest_date">{t('tasks.harvestForm.harvestDate', 'Harvest date *')}</Label>
                  <Input
                    id="harvest_date"
                    type="date"
                    value={harvestData.harvest_date}
                    onChange={(e) => setHarvestData({ ...harvestData, harvest_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">{t('tasks.harvestForm.quantityHarvested', 'Quantity *')}</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="0.1"
                    value={harvestData.quantity || ''}
                    onChange={(e) => setHarvestData({ ...harvestData, quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">{t('tasks.harvestForm.unit', 'Unit')}</Label>
                  <Select value={harvestData.unit} onValueChange={(value) => setHarvestData({ ...harvestData, unit: value as HarvestUnit })}>
                    <SelectTrigger id="unit"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="tons">t</SelectItem>
                      <SelectItem value="units">units</SelectItem>
                      <SelectItem value="boxes">boxes</SelectItem>
                      <SelectItem value="crates">crates</SelectItem>
                      <SelectItem value="liters">L</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quality_grade">{t('tasks.harvestForm.qualityGrade', 'Quality grade')}</Label>
                  <Select value={harvestData.quality_grade} onValueChange={(value) => setHarvestData({ ...harvestData, quality_grade: value as HarvestQualityGrade })}>
                    <SelectTrigger id="quality_grade"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Extra">Extra</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="First">First</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="Second">Second</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="Third">Third</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {isPerUnitTask && hasMultipleWorkers && (
                <div className="space-y-3 border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="harvest-rate-per-unit" className="text-sm whitespace-nowrap">{t('tasks.harvestForm.ratePerUnit', 'Rate per unit (MAD):')}</Label>
                    <Input
                      id="harvest-rate-per-unit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={harvestRatePerUnit || ''}
                      onChange={(e) => setHarvestRatePerUnit(parseFloat(e.target.value) || 0)}
                      className="w-28"
                    />
                  </div>
                  {allWorkers.map(a => {
                    const units = harvestWorkerUnits[a.worker_id] ?? 0;
                    return (
                      <div key={a.worker_id} className="flex items-center gap-3">
                        <span className="text-sm w-36 truncate">
                          {a.worker?.first_name} {a.worker?.last_name}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          value={units || ''}
                          onChange={(e) => setHarvestWorkerUnits(prev => ({
                            ...prev,
                            [a.worker_id]: parseFloat(e.target.value) || 0,
                          }))}
                          className="w-28"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="harvest_notes">{t('tasks.harvestForm.notes', 'Notes')}</Label>
                <Textarea
                  id="harvest_notes"
                  value={harvestData.harvest_notes || ''}
                  onChange={(e) => setHarvestData({ ...harvestData, harvest_notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <Button variant="outline" onClick={() => { setShowHarvestForm(false); setCompletionType('complete'); setLotNumber(''); setHarvestWorkerUnits({}); setHarvestRatePerUnit(0); }}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={handleCompleteWithHarvest}
                  disabled={isActionLoading}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {completionType === 'partial' ? <PackageCheck className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {isActionLoading ? t('common.saving', 'Saving...') : completionType === 'partial' ? t('tasks.harvestForm.savePartial', 'Save partial') : t('tasks.harvestForm.completeAndSave', 'Complete')}
                </Button>
              </div>
            </div>
          )}

          {showPerUnitForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                {t('tasks.harvestForm.perUnitPayment', 'Per-unit payment')}
              </h3>
              <div className="space-y-2">
                <Label>{t('tasks.perUnitForm.ratePerUnit', 'Rate per unit (MAD) *')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={perUnitData.rate_per_unit || ''}
                  onChange={(e) => setPerUnitData({ ...perUnitData, rate_per_unit: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {hasMultipleWorkers ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('tasks.perUnitForm.unitsPerWorker', 'Units per worker')}</p>
                  {allWorkers.map(a => (
                    <div key={a.worker_id} className="flex items-center gap-2">
                      <span className="text-sm w-32 truncate">
                        {a.worker?.first_name} {a.worker?.last_name}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        value={workerUnits[a.worker_id] ?? ''}
                        onChange={(e) => setWorkerUnits(prev => ({
                          ...prev,
                          [a.worker_id]: parseFloat(e.target.value) || 0,
                        }))}
                        className="w-28"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t('tasks.perUnitForm.unitsCompleted', 'Units completed *')}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={perUnitData.units_completed || ''}
                    onChange={(e) => setPerUnitData({ ...perUnitData, units_completed: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>{t('tasks.perUnitForm.notes', 'Notes')}</Label>
                <Textarea
                  value={perUnitData.notes}
                  onChange={(e) => setPerUnitData({ ...perUnitData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPerUnitForm(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={handleCompletePerUnit}
                  disabled={isActionLoading}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isActionLoading ? t('common.processing', 'Processing...') : t('common.confirm', 'Confirm')}
                </Button>
              </div>
            </div>
          )}

          {/* Commentaires */}
          <Card className={cardShell}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base font-semibold">
                {t('tasks.detail.comments', 'Commentaires')}
                {comments.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">({comments.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {commentsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  {t('tasks.detail.noComments', 'Aucun commentaire pour le moment.')}
                </p>
              ) : (
                <div className="space-y-4 mb-6">
                  {comments.map((comment) => {
                    const anyComment = comment as TaskComment & {
                      edited_at?: string | null;
                      resolved_at?: string | null;
                      resolved_by?: string | null;
                    };
                    const isOwn = anyComment.user_id === currentUserId;
                    const isEditingThis = editingCommentId === comment.id;
                    const isIssue = comment.type === 'issue';
                    const isResolved = !!anyComment.resolved_at;
                    const authorName = comment.user_name || comment.worker_name || '';
                    const nameParts = authorName.split(/\s+/);
                    return (
                      <div key={comment.id} className={`flex gap-3 rounded-lg p-2 ${isResolved ? 'opacity-60 bg-gray-50 dark:bg-gray-900/40' : ''} ${isIssue && !isResolved ? 'border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10' : ''}`}>
                        {isIssue ? (
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                          </div>
                        ) : (
                          <UserAvatar
                            src={comment.user_avatar_url}
                            firstName={nameParts[0] || null}
                            lastName={nameParts.slice(1).join(' ') || null}
                            size="sm"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {comment.user_name || comment.worker_name || t('tasks.detail.anonymous', 'User')}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistance(new Date(comment.created_at), new Date(), {
                                addSuffix: true,
                                locale: getLocale(),
                              })}
                            </span>
                            {anyComment.edited_at && (
                              <span className="text-xs italic text-gray-400">· {t('tasks.comments.edited', 'edited')}</span>
                            )}
                          </div>
                          {isEditingThis ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                rows={3}
                                className="text-sm"
                              />
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => handleSaveEditComment(comment.id)} disabled={updateComment.isPending || !editDraft.trim()}>
                                  <Check className="w-3 h-3 mr-1" />
                                  {t('common.save', 'Save')}
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEditComment}>
                                  <XIcon className="w-3 h-3 mr-1" />
                                  {t('common.cancel', 'Cancel')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <CommentDisplay comment={comment.comment} />
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                {isIssue && (
                                  <Button size="sm" variant="ghost" onClick={() => handleToggleResolve(comment.id, isResolved)} className="h-7 px-2 text-xs">
                                    <Check className="w-3 h-3 mr-1" />
                                    {isResolved ? t('tasks.comments.reopen', 'Reopen') : t('tasks.comments.resolve', 'Resolve')}
                                  </Button>
                                )}
                                {isOwn && (
                                  <>
                                    <Button size="sm" variant="ghost" onClick={() => handleStartEditComment(comment.id, comment.comment)} className="h-7 px-2 text-xs">
                                      <Pencil className="w-3 h-3 mr-1" />
                                      {t('common.edit', 'Edit')}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteComment(comment.id)} className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      {t('common.delete', 'Delete')}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <TaskCommentInput taskId={taskId} />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-4">
          {/* Assignée à */}
          <Card className={cardShell}>
            <CardContent className="space-y-4 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tasks.detail.assigneeLabel', 'Assignée à')}
              </p>
              {task.worker_name || profile ? (
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {(() => {
                      const name = task.worker_name || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`;
                      return name
                        .split(/\s+/)
                        .map((p) => p[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || '?';
                    })()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {task.worker_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(task as { worker_type?: string }).worker_type?.trim()
                        || (task.worker_name ? t('tasks.detail.worker', 'Ouvrier') : t('tasks.detail.manager', 'Responsable'))}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">—</p>
              )}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-200 dark:border-gray-700"
                  onClick={() => setShowReassign((v) => !v)}
                  disabled={isClosed}
                >
                  <User className="me-2 h-4 w-4" />
                  {t('tasks.detail.reassign', 'Réassigner')}
                </Button>
                {showReassign && (
                  <Select onValueChange={handleReassign}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tasks.detail.selectWorker', 'Choisir un ouvrier...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {[w.first_name, w.last_name].filter(Boolean).join(' ') || w.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className={cardShell}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t('tasks.detail.actions', 'Actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {canStart && (
                <Button
                  className="h-11 w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={handleStartTask}
                  disabled={isActionLoading || blockedStatus?.blocked}
                >
                  <Play className="me-2 h-4 w-4" />
                  {t('tasks.detail.startTask', 'Démarrer la tâche')}
                </Button>
              )}
              {canResume && (
                <Button
                  className="h-11 w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={handleResumeTask}
                  disabled={isActionLoading}
                >
                  <Play className="me-2 h-4 w-4" />
                  {t('tasks.resume', 'Reprendre')}
                </Button>
              )}
              {canComplete && !showHarvestForm && !showPerUnitForm && (
                <Button
                  variant="outline"
                  className="h-11 w-full justify-center border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:hover:bg-gray-900"
                  onClick={handleCompleteTask}
                  disabled={isActionLoading}
                >
                  <CheckCircle2 className="me-2 h-4 w-4 text-emerald-600" />
                  {t('tasks.detail.markComplete', 'Marquer terminée')}
                </Button>
              )}
              {canPause && (
                <Button
                  variant="outline"
                  className="h-11 w-full justify-center border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:hover:bg-gray-900"
                  onClick={handlePauseTask}
                  disabled={isActionLoading}
                >
                  <Pause className="me-2 h-4 w-4" />
                  {t('tasks.detail.pauseTask', 'Mettre en pause')}
                </Button>
              )}
              <Button
                variant="outline"
                className="h-11 w-full justify-center border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={handleDeleteTask}
                disabled={isActionLoading}
              >
                <Trash2 className="me-2 h-4 w-4" />
                {t('common.delete', 'Supprimer')}
              </Button>

              {task.status === 'completed' && (
                <div className="flex items-center justify-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 p-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {t('tasks.detail.taskCompleted', 'Tâche terminée')}
                  </p>
                </div>
              )}
              {task.status === 'cancelled' && (
                <div className="flex items-center justify-center gap-2 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    {t('tasks.detail.taskCancelled', 'Tâche annulée')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Détails */}
          <Card className={cardShell}>
            <CardContent className="space-y-1 pt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
                {t('tasks.detail.details', 'Détails')}
              </p>
              <dl className="text-sm">
                <DetailRow
                  label={t('tasks.detail.taskId', 'ID tâche')}
                  value={<span className="font-mono">#{idShort}</span>}
                />
                <DetailRow
                  label={t('tasks.detail.created', 'Créée')}
                  value={format(new Date(task.created_at), 'dd MMM yyyy', { locale: getLocale() })}
                />
                {task.updated_at && (
                  <DetailRow
                    label={t('tasks.detail.updated', 'Mise à jour')}
                    value={formatDistance(new Date(task.updated_at), new Date(), { addSuffix: true, locale: getLocale() })}
                  />
                )}
                <DetailRow
                  label={t('tasks.detail.source', 'Source')}
                  value={(task as { source?: string }).source || t('tasks.detail.sourceManual', 'Manuelle')}
                />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky mobile action bar */}
      {!showHarvestForm && !showPerUnitForm && !isEditing && (canStart || canPause || canResume || canComplete) && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <div className="flex items-center gap-2">
            {canStart && (
              <Button onClick={handleStartTask} disabled={isActionLoading || blockedStatus?.blocked} className="flex-1 h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white">
                <Play className="w-5 h-5 mr-2" />
                {t('tasks.start', 'Démarrer')}
              </Button>
            )}
            {canPause && (
              <Button onClick={handlePauseTask} disabled={isActionLoading} variant="outline" className="flex-1 h-12 text-base">
                <Pause className="w-5 h-5 mr-2" />
                {t('tasks.pause', 'Pause')}
              </Button>
            )}
            {canResume && (
              <Button onClick={handleResumeTask} disabled={isActionLoading} className="flex-1 h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white">
                <Play className="w-5 h-5 mr-2" />
                {t('tasks.resume', 'Reprendre')}
              </Button>
            )}
            {canComplete && (
              <Button onClick={handleCompleteTask} disabled={isActionLoading} className="flex-1 h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle className="w-5 h-5 mr-2" />
                {t('tasks.completeShort', 'Terminer')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2.5 last:border-b-0 dark:border-gray-800">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-end text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/tasks/$taskId')({
  component: TaskDetailPage,
});
