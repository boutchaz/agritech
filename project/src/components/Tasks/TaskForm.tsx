import React, { useState, useMemo, useEffect } from 'react';
import { X, MapPin, Users, Package, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import { useWorkers } from '../../hooks/useWorkers';
import { useBulkCreateTaskAssignments, useSyncTaskAssignments } from '../../hooks/useTaskAssignments';
import { useFormErrors } from '../../hooks/useFormErrors';
import { workUnitsApi } from '../../lib/api/work-units';
import { parcelsApi } from '../../lib/api/parcels';
import { inventoryApi, type InventoryProduct } from '../../lib/api/inventory';
import type { Task, CreateTaskRequest, TaskType } from '../../types/tasks';
import { TASK_TYPE_LABELS, STOCK_CONSUMING_TASK_TYPES } from '../../types/tasks';
import type { WorkUnit } from '../../types/work-units';
import type { Parcel } from '../../lib/api/parcels';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/radix-select';

interface TaskFormProps {
  task?: Task | null;
  organizationId: string;
  farms: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

const createTaskFormSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(1, t('tasks.form.validation.titleRequired')),
  description: z.string(),
  task_type: z.string().min(1, t('tasks.form.validation.taskTypeRequired')),
  priority: z.string().min(1, t('tasks.form.validation.priorityRequired')),
  farm_id: z.string().min(1, t('tasks.form.validation.farmRequired')),
  parcel_id: z.string(),
  assigned_to: z.string(),
  scheduled_start: z.string().min(1, t('tasks.form.validation.startDateRequired')),
  due_date: z.string().min(1, t('tasks.form.validation.dueDateRequired')),
  estimated_duration: z.number(),
  notes: z.string(),
  payment_type: z.string(),
  work_unit_id: z.string(),
  units_required: z.number().optional(),
  rate_per_unit: z.number().optional(),
  forfait_amount: z.number().optional(),
  crop_id: z.string(),
});

type TaskFormData = z.infer<ReturnType<typeof createTaskFormSchema>>;

// Helper to format date for input (YYYY-MM-DD)
const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // If ISO format with time, extract date part
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  // Try to parse as date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return '';
};

const TaskForm: React.FC<TaskFormProps> = ({
  task,
  organizationId,
  farms,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const taskFormSchema = useMemo(() => createTaskFormSchema(t), [t]);
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>(
    task?.assigned_to ? [task.assigned_to] : []
  );

  // payment_included_in_salary per fixed_salary worker
  const [workerPaymentIncluded, setWorkerPaymentIncluded] = useState<Record<string, boolean>>({});

  // State for planned inventory items (products to consume when task completes)
  const [plannedItems, setPlannedItems] = useState<Array<{ product_id: string; variant_id?: string; quantity: number }>>([]);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const bulkCreateAssignments = useBulkCreateTaskAssignments();
  const syncAssignments = useSyncTaskAssignments();
  const { handleFormError } = useFormErrors<TaskFormData>();

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      task_type: task?.task_type || 'general',
      priority: task?.priority || 'medium',
      farm_id: task?.farm_id || '',
      parcel_id: task?.parcel_id || '',
      assigned_to: task?.assigned_to || '',
      scheduled_start: task ? formatDateForInput(task.scheduled_start) : today,
      due_date: task ? formatDateForInput(task.due_date) : nextWeek,
      estimated_duration: task?.estimated_duration || 8,
      notes: task?.notes || '',
      payment_type: task?.payment_type || 'daily',
      work_unit_id: task?.work_unit_id || '',
      units_required: task?.units_required,
      rate_per_unit: task?.rate_per_unit,
      forfait_amount: task?.forfait_amount,
      crop_id: '',
    },
  });

  const formData = watch();

  useEffect(() => {
    if (task) {
      reset({
        title: task.title || '',
        description: task.description || '',
        task_type: task.task_type || 'general',
        priority: task.priority || 'medium',
        farm_id: task.farm_id || '',
        parcel_id: task.parcel_id || '',
        assigned_to: task.assigned_to || '',
        scheduled_start: formatDateForInput(task.scheduled_start),
        due_date: formatDateForInput(task.due_date),
        estimated_duration: task.estimated_duration || 8,
        notes: task.notes || '',
        payment_type: task.payment_type || 'daily',
        work_unit_id: task.work_unit_id || '',
        units_required: task.units_required,
        rate_per_unit: task.rate_per_unit,
        forfait_amount: task.forfait_amount,
        crop_id: '',
      });
      setSelectedWorkerIds(task.assigned_to ? [task.assigned_to] : []);
    }
  }, [task, reset]);

  // Fetch workers - include all workers if no farm is selected, or filter by farm
  // Pass undefined (not null) when no farm is selected to get all workers
  const { data: workers = [] } = useWorkers(organizationId, formData.farm_id || undefined);

  // Fetch work units for piece-work selection - now uses NestJS API
  const { data: workUnitsData } = useQuery({
    queryKey: ['work-units', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const units = await workUnitsApi.getAll({ is_active: true }, organizationId);
      return Array.isArray(units) ? units : [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
  const workUnits = Array.isArray(workUnitsData) ? workUnitsData : [];

  // Task types that can consume inventory products
  const showProductSection = (STOCK_CONSUMING_TASK_TYPES as readonly string[]).includes(formData.task_type);

  // Fetch available products from inventory
  const { data: availableProducts = [] } = useQuery({
    queryKey: ['available-products', organizationId],
    queryFn: () => inventoryApi.getAvailableProducts(organizationId),
    enabled: !!organizationId && showProductSection,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch parcels for the selected farm
  const { data: parcels = [] } = useQuery({
    queryKey: ['parcels', organizationId, formData.farm_id],
    queryFn: async () => {
      if (!organizationId || !formData.farm_id) return [];
      const data = await parcelsApi.getAll({ farm_id: formData.farm_id }, organizationId);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!organizationId && !!formData.farm_id,
    staleTime: 5 * 60 * 1000,
  });

  const selectedParcel = useMemo(() => {
    return parcels.find((p: Parcel) => p.id === formData.parcel_id);
  }, [parcels, formData.parcel_id]);

  useEffect(() => {
    if (!task && selectedParcel && formData.parcel_id) {
      if (selectedParcel.crop_type && formData.task_type) {
        const cropType = selectedParcel.crop_type;
        const taskTypeLabel = TASK_TYPE_LABELS[formData.task_type as TaskType]?.fr || 'tâche';
        const newTitle = `${taskTypeLabel} - ${cropType} (${selectedParcel.name})`;
        const isAutoGenerated = !formData.title || formData.title.includes(cropType) || formData.title.includes(selectedParcel.name);
        if (isAutoGenerated && formData.title !== newTitle) {
          reset({ ...formData, title: newTitle });
        }
      }
    }
  }, [formData.parcel_id, formData.task_type, selectedParcel, task, formData, reset]);

  const onSubmit = async (data: TaskFormData) => {
    if (data.due_date < data.scheduled_start) {
      setError('due_date', {
        type: 'manual',
        message: t('tasks.form.validation.dueDateAfterStart'),
      });
      return;
    }

    if (data.task_type === 'harvesting' && !data.parcel_id) {
      setError('parcel_id', {
        type: 'manual',
        message: t('tasks.form.validation.parcelRequiredForHarvest'),
      });
      return;
    }

    try {
      const cleanedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => {
          if ((key === 'scheduled_start' || key === 'due_date') && value && typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              return [key, `${value}T00:00:00.000Z`];
            }
            return [key, value];
          }
          if (value === '' && ['assigned_to', 'parcel_id', 'farm_id', 'notes', 'description', 'work_unit_id', 'crop_id', 'category_id'].includes(key)) {
            return [key, undefined];
          }
          return [key, value];
        })
      ) as Partial<CreateTaskRequest>;

      if (selectedWorkerIds.length > 0) {
        cleanedData.assigned_to = selectedWorkerIds[0];
      } else {
        cleanedData.assigned_to = undefined;
      }


      // Add planned items for stock-consuming task types
      if (plannedItems.length > 0 && (STOCK_CONSUMING_TASK_TYPES as readonly string[]).includes(data.task_type)) {
        cleanedData.planned_items = plannedItems.filter(item => item.product_id && item.quantity > 0);
      }
      if (task) {
        await updateTask.mutateAsync({
          taskId: task.id,
          organizationId,
          updates: cleanedData,
        });
        // In edit mode: sync (creates new + removes deselected workers)
        await syncAssignments.mutateAsync({
          taskId: task.id,
          data: {
            assignments: selectedWorkerIds.map(workerId => ({
              worker_id: workerId,
              role: 'worker' as const,
              payment_included_in_salary: workerPaymentIncluded[workerId] ?? false,
            })),
          },
        });
      } else {
        const newTask = await createTask.mutateAsync({
          ...cleanedData as CreateTaskRequest,
          organization_id: organizationId,
        });
        if (selectedWorkerIds.length > 0 && newTask?.id) {
          await bulkCreateAssignments.mutateAsync({
            taskId: newTask.id,
            data: {
              assignments: selectedWorkerIds.map(workerId => ({
                worker_id: workerId,
                role: 'worker' as const,
                payment_included_in_salary: workerPaymentIncluded[workerId] ?? false,
              })),
            },
          });
        }
      }
      onSuccess();
    } catch (error) {
      handleFormError(error, setError);
    }
  };

  // Helper to toggle worker selection - use callback to prevent infinite loops
  const toggleWorkerSelection = React.useCallback((workerId: string) => {
    setSelectedWorkerIds(prev => {
      // Only update if the state would actually change
      const isCurrentlySelected = prev.includes(workerId);
      if (isCurrentlySelected) {
        const newIds = prev.filter(id => id !== workerId);
        // Only update if the array actually changed
        return newIds.length !== prev.length ? newIds : prev;
      } else {
        // Only update if the worker is not already in the array
        return prev.includes(workerId) ? prev : [...prev, workerId];
      }
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {task ? t('tasks.form.editTitle') : t('tasks.form.createTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={rhfHandleSubmit(onSubmit, (errs) => console.error('Form validation errors:', errs))} className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('tasks.form.titleLabel')}</Label>
            <Input
              id="title"
              type="text"
              {...register('title')}
              invalid={!!errors.title}
              placeholder={t('tasks.form.titlePlaceholder')}
            />
            {errors.title && (
              <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Task Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task_type">{t('tasks.form.taskTypeLabel')}</Label>
              <Select
                value={formData.task_type}
                onValueChange={(value) => {
                  const event = { target: { name: 'task_type', value } } as any;
                  register('task_type').onChange(event);
                }}
              >
                <SelectTrigger id="task_type">
                  <SelectValue placeholder={t('tasks.form.taskTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPE_LABELS).map(([value, labels]) => (
                    <SelectItem key={value} value={value}>
                      {labels.fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.task_type && (
                <p className="text-red-600 text-sm mt-1">{errors.task_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t('tasks.form.priorityLabel')}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => {
                  const event = { target: { name: 'priority', value } } as any;
                  register('priority').onChange(event);
                }}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder={t('tasks.form.priorityPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('tasks.form.priorities.low')}</SelectItem>
                  <SelectItem value="medium">{t('tasks.form.priorities.medium')}</SelectItem>
                  <SelectItem value="high">{t('tasks.form.priorities.high')}</SelectItem>
                  <SelectItem value="urgent">{t('tasks.form.priorities.urgent')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-red-600 text-sm mt-1">{errors.priority.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('tasks.form.descriptionLabel')}</Label>
            <Textarea
              id="description"
              {...register('description')}
              rows={3}
              placeholder={t('tasks.form.descriptionPlaceholder')}
            />
            {errors.description && (
              <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Farm & Parcel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="farm_id">{t('tasks.form.farmLabel')}</Label>
              <Select
                value={formData.farm_id}
                onValueChange={(value) => {
                  const event = { target: { name: 'farm_id', value } } as any;
                  register('farm_id').onChange(event);
                }}
              >
                <SelectTrigger id="farm_id">
                  <SelectValue placeholder={t('tasks.form.farmPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {farms.map(farm => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.farm_id && (
                <p className="text-red-600 text-sm mt-1">{errors.farm_id.message}</p>
              )}
            </div>

            {/* Parcel - especially important for harvesting tasks */}
            <div className="space-y-2">
              <Label htmlFor="parcel_id" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('tasks.form.parcelLabel')} {formData.task_type === 'harvesting' && '*'}
              </Label>
              <Select
                value={formData.parcel_id || '__none__'}
                onValueChange={(value) => {
                  const newValue = value === '__none__' ? '' : value;
                  const event = { target: { name: 'parcel_id', value: newValue } } as any;
                  register('parcel_id').onChange(event);
                }}
                disabled={!formData.farm_id}
              >
                <SelectTrigger id="parcel_id">
                  <SelectValue placeholder={formData.farm_id ? t('tasks.form.parcelPlaceholder') : t('tasks.form.parcelPlaceholderNoFarm')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('tasks.form.parcelNone')}</SelectItem>
                  {parcels.map((parcel: Parcel) => (
                    <SelectItem key={parcel.id} value={parcel.id}>
                      <div className="flex items-center gap-2">
                        <span>{parcel.name}</span>
                        {parcel.crop_type && (
                          <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                            {parcel.crop_type}
                          </span>
                        )}
                        {parcel.variety && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                            {parcel.variety}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedParcel && (
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                  🌱 {t('tasks.form.parcelCropInfo', { crop: selectedParcel.crop_type || t('tasks.form.parcelCropUndefined') })}
                  {selectedParcel.variety && ` | ${t('tasks.form.parcelVarietyInfo', { variety: selectedParcel.variety })}`}
                  {selectedParcel.tree_count && ` | ${t('tasks.form.parcelTreeCount', { count: selectedParcel.tree_count })}`}
                </div>
              )}
              {formData.task_type === 'harvesting' && !formData.parcel_id && (
                <p className="text-xs text-amber-600">
                  {t('tasks.form.parcelRequiredForHarvest')}
                </p>
              )}
              {errors.parcel_id && (
                <p className="text-red-600 text-sm mt-1">{errors.parcel_id.message}</p>
              )}
            </div>
          </div>

          {/* Assigned To - Multiple Workers */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('tasks.form.assignedToLabel')}
              {selectedWorkerIds.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs rounded-full">
                  {t('tasks.form.selectedCount', { count: selectedWorkerIds.length })}
                </span>
              )}
            </Label>
            {workers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {!formData.farm_id
                  ? t('tasks.form.noWorkersNoFarm')
                  : t('tasks.form.noWorkersForFarm')}
              </p>
            ) : (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {workers.map(worker => {
                  const isFixedSalary = worker.worker_type === 'fixed_salary';
                  const workerTypeLabel = worker.worker_type === 'fixed_salary' ? t('tasks.form.workerTypes.fixedSalary') :
                                         worker.worker_type === 'daily_worker' ? t('tasks.form.workerTypes.dailyWorker') :
                                         worker.worker_type === 'metayage' ? t('tasks.form.workerTypes.metayage') : '';
                  const isSelected = selectedWorkerIds.includes(worker.id);
                  return (
                  <div
                    key={worker.id}
                    className={`flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-b-0 ${
                      isSelected ? 'bg-green-50 dark:bg-green-900/20' : ''
                    }`}
                  >
                    <Checkbox
                      id={`worker-${worker.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        // Only toggle if the checked state is different from current
                        if (checked !== isSelected) {
                          toggleWorkerSelection(worker.id);
                        }
                      }}
                    />
                    <label
                      htmlFor={`worker-${worker.id}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {worker.first_name} {worker.last_name}
                        {worker.position && (
                          <span className="text-muted-foreground">- {worker.position}</span>
                        )}
                        {isFixedSalary && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                            {workerTypeLabel}
                          </span>
                        )}
                      </span>
                    </label>
                    {isFixedSalary && isSelected && (
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={workerPaymentIncluded[worker.id] ?? true}
                          onChange={(e) =>
                            setWorkerPaymentIncluded(prev => ({
                              ...prev,
                              [worker.id]: e.target.checked,
                            }))
                          }
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span className="text-xs text-muted-foreground">Inclus dans le salaire</span>
                      </label>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('tasks.form.multiWorkerHint')}
            </p>
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_start">{t('tasks.form.startDateLabel')}</Label>
              <Input
                id="scheduled_start"
                type="date"
                {...register('scheduled_start')}
                invalid={!!errors.scheduled_start}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.scheduled_start && (
                <p className="text-red-600 text-sm mt-1">{errors.scheduled_start.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">{t('tasks.form.dueDateLabel')}</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
                invalid={!!errors.due_date}
                min={formData.scheduled_start || new Date().toISOString().split('T')[0]}
              />
              {errors.due_date && (
                <p className="text-red-600 text-sm mt-1">{errors.due_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_duration">{t('tasks.form.durationLabel')}</Label>
              <Input
                id="estimated_duration"
                type="number"
                {...register('estimated_duration', { valueAsNumber: true })}
                invalid={!!errors.estimated_duration}
                min="1"
              />
              {errors.estimated_duration && (
                <p className="text-red-600 text-sm mt-1">{errors.estimated_duration.message}</p>
              )}
            </div>
          </div>

          {/* Payment Type & Work Unit Fields */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {t('tasks.form.paymentSection')}
              </h3>
              {/* Check if any selected workers are fixed salary */}
              {selectedWorkerIds.length > 0 &&
                workers.filter(w => selectedWorkerIds.includes(w.id) && w.worker_type === 'fixed_salary').length > 0 && (
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                  {t('tasks.form.fixedSalarySelected')}
                </span>
              )}
            </div>

            {/* Note for fixed salary workers */}
            {selectedWorkerIds.length > 0 &&
              workers.filter(w => selectedWorkerIds.includes(w.id) && w.worker_type === 'fixed_salary').length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300" dangerouslySetInnerHTML={{ __html: t('tasks.form.fixedSalaryNote') }} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Payment Type */}
              <div className="space-y-2">
                <Label htmlFor="payment_type">
                  {t('tasks.form.paymentTypeLabel')}
                  {selectedWorkerIds.length > 0 &&
                    workers.filter(w => selectedWorkerIds.includes(w.id) && w.worker_type === 'fixed_salary').length === selectedWorkerIds.length && (
                    <span className="text-xs text-muted-foreground ml-2">{t('tasks.form.paymentTypeOptional')}</span>
                  )}
                </Label>
                <Select
                  value={formData.payment_type || 'daily'}
                  onValueChange={(value) => setValue('payment_type', value, { shouldValidate: true })}
                >
                  <SelectTrigger id="payment_type">
                    <SelectValue placeholder={t('tasks.form.paymentTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedWorkerIds.length > 0 &&
                      workers.filter(w => selectedWorkerIds.includes(w.id) && w.worker_type === 'fixed_salary').length > 0 && (
                      <SelectItem value="none">{t('tasks.form.paymentTypes.none')}</SelectItem>
                    )}
                    <SelectItem value="daily">{t('tasks.form.paymentTypes.daily')}</SelectItem>
                    <SelectItem value="per_unit">{t('tasks.form.paymentTypes.perUnit')}</SelectItem>
                    <SelectItem value="forfait">{t('tasks.form.paymentTypes.forfait', 'Forfait (montant fixe)')}</SelectItem>
                    <SelectItem value="monthly">{t('tasks.form.paymentTypes.monthly')}</SelectItem>
                    <SelectItem value="metayage">{t('tasks.form.paymentTypes.metayage')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.payment_type && (
                  <p className="text-red-600 text-sm mt-1">{errors.payment_type.message}</p>
                )}
              </div>

              {/* Work Unit (only if payment type is per_unit) */}
              {formData.payment_type === 'per_unit' && (
                <div className="space-y-2">
                  <Label htmlFor="work_unit_id">{t('tasks.form.workUnitLabel')}</Label>
                  <Select
                    value={formData.work_unit_id || '__none__'}
                    onValueChange={(value) => {
                      const newValue = value === '__none__' ? '' : value;
                      const event = { target: { name: 'work_unit_id', value: newValue } } as any;
                      register('work_unit_id').onChange(event);
                    }}
                  >
                    <SelectTrigger id="work_unit_id">
                      <SelectValue placeholder={t('tasks.form.workUnitPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('tasks.form.workUnitNone')}</SelectItem>
                      {workUnits.map((unit: WorkUnit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.work_unit_id && (
                    <p className="text-red-600 text-sm mt-1">{errors.work_unit_id.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Forfait amount (only if payment type is forfait) */}
            {formData.payment_type === 'forfait' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="forfait_amount">Montant forfaitaire (MAD) *</Label>
                  <Input
                    id="forfait_amount"
                    type="number"
                    {...register('forfait_amount', { valueAsNumber: true })}
                    invalid={!!errors.forfait_amount}
                    min="0"
                    step="0.01"
                    placeholder="Ex: 500.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Montant fixe payé pour cette tâche, indépendamment des unités réalisées
                  </p>
                  {errors.forfait_amount && (
                    <p className="text-red-600 text-sm mt-1">{errors.forfait_amount.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Units Required & Rate (only if payment type is per_unit) */}
            {formData.payment_type === 'per_unit' && formData.work_unit_id && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="units_required">{t('tasks.form.unitsEstimatedLabel')}</Label>
                  <Input
                    id="units_required"
                    type="number"
                    {...register('units_required', { valueAsNumber: true })}
                    invalid={!!errors.units_required}
                    min="0"
                    step="0.01"
                    placeholder={t('tasks.form.unitsEstimatedPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('tasks.form.unitsEstimatedHint')}
                  </p>
                  {errors.units_required && (
                    <p className="text-red-600 text-sm mt-1">{errors.units_required.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_per_unit">{t('tasks.form.ratePerUnitLabel')}</Label>
                  <Input
                    id="rate_per_unit"
                    type="number"
                    {...register('rate_per_unit', { valueAsNumber: true })}
                    invalid={!!errors.rate_per_unit}
                    min="0"
                    step="0.01"
                    placeholder={t('tasks.form.ratePerUnitPlaceholder')}
                  />
                  {formData.units_required && formData.rate_per_unit && (
                    <p className="text-xs text-muted-foreground">
                      {t('tasks.form.estimatedTotal', { amount: (formData.units_required * formData.rate_per_unit).toFixed(2) })}
                    </p>
                  )}
                  {errors.rate_per_unit && (
                    <p className="text-red-600 text-sm mt-1">{errors.rate_per_unit.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>


          {/* Product / Stock Selection (for applicable task types) */}
          {showProductSection && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t('tasks.form.productsSection')}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPlannedItems([...plannedItems, { product_id: '', quantity: 0 }])}
                  disabled={availableProducts.length === 0}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {t('tasks.form.addProduct')}
                </Button>
              </div>

              {availableProducts.length === 0 ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {t('tasks.form.noProductsAvailable')}
                </p>
              ) : plannedItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t('tasks.form.productsHint')}
                </p>
              ) : (
                <div className="space-y-3">
                  {plannedItems.map((item, index) => {
                    const selectedProd = availableProducts.find((p: InventoryProduct) => p.id === item.product_id);
                    const hasVariants = (selectedProd?.variants?.length ?? 0) > 0;
                    const selectedVariant = hasVariants
                      ? selectedProd!.variants.find((v) => v.id === item.variant_id)
                      : undefined;
                    const unitLabel = selectedVariant?.unit ?? selectedProd?.unit ?? '';
                    const availableStock = selectedVariant?.quantity ?? selectedProd?.quantity ?? 0;
                    return (
                      <div key={index} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-end gap-3">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">{t('tasks.form.productLabel')}</Label>
                            <Select
                              value={item.product_id || '__none__'}
                              onValueChange={(value) => {
                                const newItems = [...plannedItems];
                                newItems[index] = { product_id: value === '__none__' ? '' : value, variant_id: undefined, quantity: 0 };
                                setPlannedItems(newItems);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('tasks.form.productPlaceholder')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">{t('tasks.form.productSelectDefault')}</SelectItem>
                                {availableProducts.map((product: InventoryProduct) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.quantity} {product.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-32 space-y-1">
                            <Label className="text-xs">
                              {t('tasks.form.quantityLabel')} {unitLabel ? `(${unitLabel})` : ''}
                            </Label>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity || ''}
                              onChange={(e) => {
                                const newItems = [...plannedItems];
                                newItems[index] = { ...newItems[index], quantity: parseFloat(e.target.value) || 0 };
                                setPlannedItems(newItems);
                              }}
                              placeholder="0"
                            />
                            {item.quantity > 0 && item.quantity > availableStock && (
                              <p className="text-xs text-red-500">
                                {t('tasks.form.exceedsStock', { available: availableStock })}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPlannedItems(plannedItems.filter((_, i) => i !== index));
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {hasVariants && (
                          <div className="pl-0 space-y-1">
                            <Label className="text-xs text-muted-foreground">{t('tasks.form.variantLabel', 'Format / conditionnement')}</Label>
                            <Select
                              value={item.variant_id || '__none__'}
                              onValueChange={(value) => {
                                const newItems = [...plannedItems];
                                newItems[index] = { ...newItems[index], variant_id: value === '__none__' ? undefined : value, quantity: 0 };
                                setPlannedItems(newItems);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('tasks.form.variantPlaceholder', 'Sélectionner un format (optionnel)')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">{t('tasks.form.variantSelectDefault', 'Sans format spécifique')}</SelectItem>
                                {selectedProd!.variants.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {v.name} ({v.quantity} {v.unit ?? selectedProd!.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {plannedItems.length > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300" dangerouslySetInnerHTML={{ __html: t('tasks.form.stockDeductionNote') }} />
                </div>
              )}
            </div>
          )}
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('tasks.form.notesLabel')}</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              rows={2}
              placeholder={t('tasks.form.notesPlaceholder')}
            />
            {errors.notes && (
              <p className="text-red-600 text-sm mt-1">{errors.notes.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('tasks.form.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createTask.isPending || updateTask.isPending || isSubmitting}
            >
              {createTask.isPending || updateTask.isPending || isSubmitting ? t('tasks.form.saving') : t('tasks.form.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;

