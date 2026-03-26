import React, { useState, useEffect, useMemo } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
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
  MessageSquare,
  Loader2,
  Timer,
  Banknote,
} from 'lucide-react';
import { useTask, useUpdateTask, useTaskComments } from '@/hooks/useTasks';
import { useTaskAssignments } from '@/hooks/useTaskAssignments';
import TaskAttachments from '@/components/Tasks/TaskAttachments';
import TaskChecklist from '@/components/Tasks/TaskChecklist';
import TaskDependencies from '@/components/Tasks/TaskDependencies';
import TaskWorklog from '@/components/Tasks/TaskWorklog';
import TaskAssignee from '@/components/Tasks/TaskAssignee';
import TaskCommentInput from '@/components/Tasks/TaskCommentInput';
import CommentDisplay from '@/components/Tasks/CommentDisplay';
import { tasksApi } from '@/lib/api/tasks';
import { useCropsForTask, type Crop } from '@/hooks/useCrops';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { CompleteHarvestTaskRequest } from '@/types/tasks';
import { useParcelById } from '@/hooks/useParcelsQuery';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  getTaskTypeLabel,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from '@/types/tasks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { format, formatDistance } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';

function TaskDetailPage() {
  const { t, i18n } = useTranslation();
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();

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

  // Task assignments (multi-worker)
  const { data: taskAssignments = [] } = useTaskAssignments(task?.id);
  // Include primary worker if not already in assignments (legacy tasks)
  const allWorkers = React.useMemo(() => {
    if (!task) return taskAssignments;
    const primaryInAssignments = task.worker_id && taskAssignments.some(a => a.worker_id === task.worker_id);
    if (task.worker_id && !primaryInAssignments) {
      const primaryWorker = {
        worker_id: task.worker_id,
        worker: { id: task.worker_id, first_name: task.worker_name?.split(' ')[0] || '', last_name: task.worker_name?.split(' ').slice(1).join(' ') || '' },
      } as any;
      return [primaryWorker, ...taskAssignments];
    }
    return taskAssignments;
  }, [taskAssignments, task?.worker_id, task?.worker_name, task]);
  const hasMultipleWorkers = allWorkers.length > 1;

  // Comments
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(taskId);

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
  }, [showHarvestForm, lotNumber, task?.parcel_id, task?.farm_id]);

  const { data: crops = [] } = useCropsForTask({
    farmId: task?.farm_id,
    parcelId: task?.parcel_id,
    enabled: !!task?.farm_id,
  });

  const { data: parcel } = useParcelById(task?.parcel_id);

  const availableCrops: Crop[] = useMemo(() => {
    if (crops.length > 0) return crops;
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
      } as Crop];
    }
    return crops;
  }, [crops, parcel, task?.parcel_id, task?.farm_id]);

  const initialCropId = task?.crop_id || (availableCrops.length > 0 ? availableCrops[0].id : '');
  const [harvestData, setHarvestData] = useState<Partial<CompleteHarvestTaskRequest>>({
    crop_id: initialCropId,
    harvest_date: new Date().toISOString().split('T')[0],
    quantity: 0,
    unit: 'kg',
    quality_grade: 'A',
    workers: [],
  });

  useEffect(() => {
    if (!harvestData.crop_id && availableCrops.length > 0) {
      setHarvestData(prev => ({ ...prev, crop_id: availableCrops[0].id }));
    }
  }, [availableCrops.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
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
          <Link to="/tasks" search={{ editTaskId: undefined }}>{t('tasks.detail.backToList', 'Back to tasks')}</Link>
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
  const getTaskOrganizationId = () => task.organization_id || currentOrganization?.id || '';

  const handleStartTask = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) {
      setError(t('tasks.detail.errors.noOrganization', 'Organization context is missing'));
      return;
    }

    try {
      setIsActionLoading(true);
      setError(null);
      await updateTask.mutateAsync({
        taskId: task.id,
        organizationId: taskOrganizationId,
        updates: { status: 'in_progress', actual_start: new Date().toISOString() },
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: any) {
      setError(err.message || t('tasks.detail.errors.start', 'Failed to start task'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseTask = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) {
      setError(t('tasks.detail.errors.noOrganization', 'Organization context is missing'));
      return;
    }

    try {
      setIsActionLoading(true);
      setError(null);
      await updateTask.mutateAsync({
        taskId: task.id,
        organizationId: taskOrganizationId,
        updates: { status: 'paused' },
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: any) {
      setError(err.message || t('tasks.detail.errors.pause', 'Failed to pause task'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResumeTask = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) {
      setError(t('tasks.detail.errors.noOrganization', 'Organization context is missing'));
      return;
    }

    try {
      setIsActionLoading(true);
      setError(null);
      await updateTask.mutateAsync({
        taskId: task.id,
        organizationId: taskOrganizationId,
        updates: { status: 'in_progress' },
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: any) {
      setError(err.message || t('tasks.detail.errors.resume', 'Failed to resume task'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) {
      setError(t('tasks.detail.errors.noOrganization', 'Organization context is missing'));
      return;
    }

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
    } catch (err: any) {
      setError(err.message || t('tasks.detail.errors.complete', 'Failed to complete task'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompletePerUnit = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (perUnitData.rate_per_unit <= 0) {
      setError('Veuillez entrer le tarif par unité');
      return;
    }
    if (!hasMultipleWorkers && perUnitData.units_completed <= 0) {
      setError('Veuillez entrer le nombre d\'unités complétées');
      return;
    }
    if (hasMultipleWorkers && Object.values(workerUnits).every(v => v <= 0)) {
      setError('Veuillez entrer le nombre d\'unités pour au moins un travailleur');
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

      await tasksApi.complete(taskOrganizationId, task.id, {
        units_completed: totalUnits,
        rate_per_unit: perUnitData.rate_per_unit,
        actual_cost: totalUnits * perUnitData.rate_per_unit,
        notes: perUnitData.notes || undefined,
        ...(worker_completions ? { worker_completions } : {}),
      } as any);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskOrganizationId, task.id] });
      queryClient.invalidateQueries({ queryKey: ['work-records'] });
      navigate({ to: '/tasks', search: { editTaskId: undefined } });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la complétion de la tâche');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteWithHarvest = async () => {
    const taskOrganizationId = getTaskOrganizationId();
    if (!taskOrganizationId) {
      setError(t('tasks.detail.errors.noOrganization', 'Organization context is missing'));
      return;
    }

    if (!harvestData.crop_id) {
      setError('Veuillez sélectionner une culture');
      return;
    }
    if (!harvestData.quantity || harvestData.quantity <= 0) {
      setError('Veuillez entrer une quantité valide');
      return;
    }
    if (!lotNumber) {
      setError('Veuillez entrer un numéro de lot');
      return;
    }

    // Validate per-worker units for per-unit harvest tasks with multiple workers
    if (isPerUnitTask && hasMultipleWorkers) {
      const totalUnits = Object.values(harvestWorkerUnits).reduce((s, v) => s + v, 0);
      if (totalUnits <= 0) {
        setError('Veuillez entrer le nombre d\'unités pour au moins un travailleur');
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

      // Build workers array: for per-unit tasks, include quantity_picked per worker
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

      if (cropIdToSend) {
        requestPayload.crop_id = cropIdToSend;
      }

      await tasksApi.completeWithHarvest(taskOrganizationId, task.id, requestPayload);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskOrganizationId, task.id] });
      queryClient.invalidateQueries({ queryKey: ['harvests'] });

      if (completionType === 'partial') {
        setHarvestData({ ...harvestData, quantity: 0, harvest_notes: '' });
        setHarvestWorkerUnits({}); // reset per-worker units for next day's entry
        const year = new Date().getFullYear();
        const parcelCode = task.parcel_id ? `P${task.parcel_id.slice(-2).toUpperCase()}` : 'PX';
        const farmCode = task.farm_id ? `F${task.farm_id.slice(-2).toUpperCase()}` : 'FX';
        const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        setLotNumber(`${parcelCode}${farmCode}-${sequence}${year}`);
        setError(null);
      } else {
        navigate({ to: '/tasks', search: { editTaskId: undefined } });
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la complétion de la récolte');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditTask = () => {
    navigate({ to: '/tasks', search: { editTaskId: task.id } });
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1 flex-shrink-0">
          <Link to="/tasks" search={{ editTaskId: undefined }}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`p-2 rounded-lg flex-shrink-0 ${
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
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {task.title}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TASK_PRIORITY_COLORS[task.priority]}`}>
                  {getTaskPriorityLabel(task.priority, i18n.language as 'en' | 'fr')}
                </span>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TASK_STATUS_COLORS[task.status]}`}>
                  {getTaskStatusLabel(task.status, i18n.language as 'en' | 'fr')}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {getTaskTypeLabel(task.task_type, i18n.language as 'en' | 'fr')}
                </span>
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleEditTask} className="flex-shrink-0">
          <Edit className="w-4 h-4 mr-2" />
          {t('common.edit', 'Edit')}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('tasks.detail.information', 'Task Information')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {task.farm_name && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('tasks.detail.farm', 'Farm')}</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {task.farm_name}
                  </p>
                </div>
              )}

              {'parcel_name' in task && task.parcel_name && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('tasks.detail.parcel', 'Parcel')}</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    {task.parcel_name}
                  </p>
                </div>
              )}

              {(taskAssignments.length > 0 || task.worker_name) && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('tasks.detail.assignedTo', 'Assigned to')}</p>
                  {taskAssignments.length > 0 ? (
                    <div className="space-y-1">
                      {/* Show all assignment workers */}
                      {taskAssignments.map(a => (
                        <p key={a.worker_id} className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {a.worker?.first_name} {a.worker?.last_name}
                        </p>
                      ))}
                      {/* Also show primary worker if not already in assignments */}
                      {task.worker_name && task.worker_id && !taskAssignments.some(a => a.worker_id === task.worker_id) && (
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {task.worker_name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {task.worker_name}
                    </p>
                  )}
                </div>
              )}

              {task.estimated_duration && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('tasks.detail.estimatedDuration', 'Estimated duration')}</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    {task.estimated_duration}h
                  </p>
                </div>
              )}

              {task.scheduled_start && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('tasks.detail.scheduledStart', 'Scheduled start')}</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(task.scheduled_start), 'PPP', { locale: getLocale() })}
                  </p>
                </div>
              )}

              {task.due_date && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('tasks.detail.dueDate', 'Due date')}</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(task.due_date), 'PPP', { locale: getLocale() })}
                  </p>
                </div>
              )}

              {task.actual_start && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('tasks.detail.actualStart', 'Started at')}</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    {format(new Date(task.actual_start), 'PPP p', { locale: getLocale() })}
                  </p>
                </div>
              )}

              {task.completed_date && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('tasks.detail.completedAt', 'Completed at')}</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {format(new Date(task.completed_date), 'PPP', { locale: getLocale() })}
                  </p>
                </div>
              )}
            </div>

            {task.description && (
              <div className="mt-6 pt-4 border-t dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('tasks.detail.description', 'Description')}</p>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Progress Bar */}
            {task.completion_percentage > 0 && task.status !== 'completed' && (
              <div className="mt-6 pt-4 border-t dark:border-gray-700">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500 dark:text-gray-400">{t('tasks.detail.progress', 'Progress')}</span>
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
          </div>

          {/* Payment Info */}
          {task.payment_type && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('tasks.detail.paymentInfo', 'Payment Information')}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">{t('tasks.detail.paymentType', 'Payment type')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {task.payment_type === 'per_unit' ? "A l'unité" :
                     task.payment_type === 'daily' ? 'Journalier' :
                     task.payment_type === 'monthly' ? 'Mensuel' : 'Métayage'}
                  </p>
                </div>
                {task.units_required && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">{t('tasks.detail.unitsRequired', 'Units estimated')}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{task.units_required}</p>
                  </div>
                )}
                {task.rate_per_unit && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">{t('tasks.detail.ratePerUnit', 'Rate per unit')}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{task.rate_per_unit} MAD</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Harvest Completion Form */}
          {showHarvestForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-600" />
                Enregistrer la récolte
              </h3>

              {/* Completion Type Selector */}
              <div className="space-y-2">
                <Label>Type de complétion</Label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    completionType === 'complete'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                    <input type="radio" name="completionType" value="complete" checked={completionType === 'complete'} onChange={() => setCompletionType('complete')} className="sr-only" />
                    <CheckCircle className={`w-5 h-5 ${completionType === 'complete' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium text-sm">Terminer complètement</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Marquer la tâche comme terminée</p>
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
                      <p className="font-medium text-sm">Récolte partielle</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Continuer la tâche après</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Lot Number */}
              <div className="space-y-2">
                <Label htmlFor="lot_number" className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Numéro de lot *
                </Label>
                <Input
                  id="lot_number"
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="Ex: P1FM1-0012025"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="crop_id">Culture récoltée *</Label>
                  <Select
                    value={harvestData.crop_id || '__none__'}
                    onValueChange={(value) => setHarvestData({ ...harvestData, crop_id: value === '__none__' ? '' : value })}
                  >
                    <SelectTrigger id="crop_id">
                      <SelectValue placeholder="Sélectionner une culture" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sélectionner une culture...</SelectItem>
                      {availableCrops.map((crop: Crop) => (
                        <SelectItem key={crop.id} value={crop.id}>
                          {crop.name} {crop.parcel_name ? `(${crop.parcel_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harvest_date">Date de récolte *</Label>
                  <Input
                    id="harvest_date"
                    type="date"
                    value={harvestData.harvest_date}
                    onChange={(e) => setHarvestData({ ...harvestData, harvest_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantité récoltée *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="0.1"
                    value={harvestData.quantity || ''}
                    onChange={(e) => setHarvestData({ ...harvestData, quantity: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unité</Label>
                  <Select value={harvestData.unit} onValueChange={(value) => setHarvestData({ ...harvestData, unit: value as any })}>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilogrammes (kg)</SelectItem>
                      <SelectItem value="tons">Tonnes</SelectItem>
                      <SelectItem value="units">Unités</SelectItem>
                      <SelectItem value="boxes">Caisses</SelectItem>
                      <SelectItem value="crates">Cagettes</SelectItem>
                      <SelectItem value="liters">Litres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quality_grade">Grade de qualité</Label>
                  <Select value={harvestData.quality_grade} onValueChange={(value) => setHarvestData({ ...harvestData, quality_grade: value as any })}>
                    <SelectTrigger id="quality_grade">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Extra">Extra</SelectItem>
                      <SelectItem value="A">Grade A</SelectItem>
                      <SelectItem value="First">Première qualité</SelectItem>
                      <SelectItem value="B">Grade B</SelectItem>
                      <SelectItem value="Second">Deuxième qualité</SelectItem>
                      <SelectItem value="C">Grade C</SelectItem>
                      <SelectItem value="Third">Troisième qualité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Per-worker unit inputs for per-unit payment harvest tasks */}
              {isPerUnitTask && hasMultipleWorkers && (
                <div className="space-y-3 border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Paiement à l'unité ({harvestData.unit || 'unités'})
                  </p>

                  {/* Rate per unit input */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-blue-800 dark:text-blue-200 whitespace-nowrap">Tarif par unité (MAD) :</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={harvestRatePerUnit || ''}
                      onChange={(e) => setHarvestRatePerUnit(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 30"
                      className="w-28 bg-white dark:bg-gray-800"
                    />
                  </div>

                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Indiquez le nombre d'unités accomplies par chaque travailleur.
                  </p>
                  {allWorkers.map(a => {
                    const units = harvestWorkerUnits[a.worker_id] ?? 0;
                    const rate = harvestRatePerUnit;
                    return (
                      <div key={a.worker_id} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300 w-36 truncate">
                          {a.worker?.first_name} {a.worker?.last_name}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={units || ''}
                          onChange={(e) => setHarvestWorkerUnits(prev => ({
                            ...prev,
                            [a.worker_id]: parseFloat(e.target.value) || 0,
                          }))}
                          placeholder="0"
                          className="w-28"
                        />
                        {units > 0 && rate > 0 && (
                          <span className="text-xs text-green-600 font-medium">
                            = {(units * rate).toFixed(2)} MAD
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {harvestRatePerUnit > 0 && Object.values(harvestWorkerUnits).some(v => v > 0) && (
                    <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-700">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Total paiements :</span>
                      <span className="font-bold text-green-600">
                        {(Object.values(harvestWorkerUnits).reduce((s, v) => s + v, 0) * harvestRatePerUnit).toFixed(2)} MAD
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="harvest_notes">Notes</Label>
                <Textarea
                  id="harvest_notes"
                  value={harvestData.harvest_notes || ''}
                  onChange={(e) => setHarvestData({ ...harvestData, harvest_notes: e.target.value })}
                  rows={2}
                  placeholder="Notes sur la récolte..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <Button variant="outline" onClick={() => { setShowHarvestForm(false); setCompletionType('complete'); setLotNumber(''); setHarvestWorkerUnits({}); setHarvestRatePerUnit(0); }}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCompleteWithHarvest}
                  disabled={isActionLoading}
                  className={completionType === 'partial' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
                >
                  {completionType === 'partial' ? <PackageCheck className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {isActionLoading ? 'Enregistrement...' : completionType === 'partial' ? 'Enregistrer récolte partielle' : 'Terminer et enregistrer'}
                </Button>
              </div>
            </div>
          )}

          {/* Worklog / Time Tracking */}
          <TaskWorklog
            taskId={taskId}
            taskStatus={task.status}
            assignedWorkerId={task.worker_id}
          />

          {/* Attachments Section */}
          <TaskAttachments
            taskId={taskId}
            organizationId={currentOrganization?.id || ''}
            disabled={task.status === 'cancelled'}
          />

          {/* Checklist Section */}
          <TaskChecklist taskId={taskId} disabled={task.status === 'cancelled'} />

          {/* Dependencies Section */}
          <TaskDependencies
            taskId={taskId}
            organizationId={currentOrganization?.id || ''}
            disabled={task.status === 'cancelled'}
          />

          {/* Comments Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t('tasks.detail.comments', 'Comments')}
              {comments.length > 0 && (
                <span className="text-sm font-normal text-gray-500">({comments.length})</span>
              )}
            </h2>

            {/* Add Comment */}
            <div className="mb-6">
              <TaskCommentInput taskId={taskId} />
            </div>

            {/* Comments List */}
            {commentsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {t('tasks.detail.noComments', 'No comments yet. Be the first to comment.')}
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {comment.user_name || comment.worker_name || t('tasks.detail.anonymous', 'User')}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistance(new Date(comment.created_at), new Date(), {
                            addSuffix: true,
                            locale: getLocale(),
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <CommentDisplay comment={comment.comment} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          {/* Assignee */}
          <TaskAssignee
            taskId={taskId}
            organizationId={organizationId}
            currentAssignee={task.worker_id && task.worker_name ? { id: task.worker_id, name: task.worker_name } : undefined}
            taskStatus={task.status}
            farmId={task.farm_id}
          />

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('tasks.detail.actions', 'Actions')}
            </h2>
            <div className="space-y-3">
              {canStart && (
                <Button onClick={handleStartTask} disabled={isActionLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Play className="w-4 h-4 mr-2" />
                  {t('tasks.start', 'Start')}
                </Button>
              )}

              {canPause && (
                <Button onClick={handlePauseTask} disabled={isActionLoading} variant="outline" className="w-full">
                  <Pause className="w-4 h-4 mr-2" />
                  {t('tasks.pause', 'Pause')}
                </Button>
              )}

              {canResume && (
                <Button onClick={handleResumeTask} disabled={isActionLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Play className="w-4 h-4 mr-2" />
                  {t('tasks.resume', 'Resume')}
                </Button>
              )}

              {canComplete && !showHarvestForm && !showPerUnitForm && (
                <Button onClick={handleCompleteTask} disabled={isActionLoading} className="w-full bg-green-600 hover:bg-green-700">
                  {isHarvestingTask ? (
                    <>
                      <Wheat className="w-4 h-4 mr-2" />
                      {t('tasks.completeHarvest', 'Complete with harvest')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('tasks.complete', 'Complete')}
                    </>
                  )}
                </Button>
              )}

              {/* Per-unit completion form */}
              {showPerUnitForm && (
                <div className="border-t dark:border-gray-700 pt-4 space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-green-600" />
                    Paiement à l'unité
                  </h3>
                  <div className="space-y-2">
                    <Label>Tarif par unité (MAD) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={perUnitData.rate_per_unit || ''}
                      onChange={(e) => setPerUnitData({ ...perUnitData, rate_per_unit: parseFloat(e.target.value) || 0 })}
                      placeholder="Ex: 5.00"
                    />
                  </div>
                  {hasMultipleWorkers ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Unités par travailleur</p>
                      {allWorkers.map(a => (
                        <div key={a.worker_id} className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300 w-32 truncate">
                            {a.worker?.first_name} {a.worker?.last_name}
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={workerUnits[a.worker_id] ?? ''}
                            onChange={(e) => setWorkerUnits(prev => ({
                              ...prev,
                              [a.worker_id]: parseFloat(e.target.value) || 0,
                            }))}
                            placeholder="0"
                            className="w-28"
                          />
                          {(workerUnits[a.worker_id] ?? 0) > 0 && perUnitData.rate_per_unit > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              = {((workerUnits[a.worker_id] ?? 0) * perUnitData.rate_per_unit).toFixed(2)} MAD
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Unités complétées *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={perUnitData.units_completed || ''}
                        onChange={(e) => setPerUnitData({ ...perUnitData, units_completed: parseFloat(e.target.value) || 0 })}
                        placeholder="Ex: 100"
                      />
                    </div>
                  )}
                  {perUnitData.rate_per_unit > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">Total</span>
                        <span className="font-bold text-green-600">
                          {hasMultipleWorkers
                            ? (Object.values(workerUnits).reduce((s, v) => s + v, 0) * perUnitData.rate_per_unit).toFixed(2)
                            : (perUnitData.units_completed * perUnitData.rate_per_unit).toFixed(2)} MAD
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={perUnitData.notes}
                      onChange={(e) => setPerUnitData({ ...perUnitData, notes: e.target.value })}
                      rows={2}
                      placeholder="Notes sur le travail effectué..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPerUnitForm(false)} className="flex-1">
                      Annuler
                    </Button>
                    <Button onClick={handleCompletePerUnit} disabled={isActionLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isActionLoading ? 'En cours...' : 'Confirmer'}
                    </Button>
                  </div>
                </div>
              )}

              {task.status === 'completed' && (
                <div className="text-center py-3">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    {t('tasks.detail.taskCompleted', 'Task completed')}
                  </p>
                </div>
              )}

              {task.status === 'cancelled' && (
                <div className="text-center py-3">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {t('tasks.detail.taskCancelled', 'Task cancelled')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Task Meta */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              {t('tasks.detail.details', 'Details')}
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">{t('tasks.detail.taskId', 'Task ID')}</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-xs">{task.id.slice(0, 8)}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">{t('tasks.detail.created', 'Created')}</dt>
                <dd className="text-gray-900 dark:text-white">
                  {format(new Date(task.created_at), 'PP', { locale: getLocale() })}
                </dd>
              </div>
              {task.updated_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t('tasks.detail.updated', 'Updated')}</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {formatDistance(new Date(task.updated_at), new Date(), {
                      addSuffix: true,
                      locale: getLocale(),
                    })}
                  </dd>
                </div>
              )}
              {task.cost_estimate && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t('tasks.detail.costEstimate', 'Cost estimate')}</dt>
                  <dd className="text-gray-900 dark:text-white">{task.cost_estimate} MAD</dd>
                </div>
              )}
              {task.actual_cost && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{t('tasks.detail.actualCost', 'Actual cost')}</dt>
                  <dd className="text-gray-900 dark:text-white">{task.actual_cost} MAD</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/tasks/$taskId')({
  component: TaskDetailPage,
});
