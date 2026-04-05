/**
 * Piece-Work Entry Component
 *
 * Allows recording work completed by workers in units (trees, boxes, kg, etc.)
 * for piece-work payment calculation
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Save,
  X,
  Calendar,
  User,
  Package,
  Star,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/utils/currencies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { workersApi } from '@/lib/api/workers';
import { workUnitsApi } from '@/lib/api/work-units';
import { tasksApi } from '@/lib/api/tasks';
import { parcelsApi } from '@/lib/api/parcels';
import { pieceWorkApi } from '@/lib/api/piece-work';

import type {
  WorkUnit,
} from '@/types/work-units';
import { QUALITY_RATINGS, PIECE_WORK_PAYMENT_STATUSES, type PieceWorkPaymentStatus } from '@/types/work-units';

// =====================================================
// VALIDATION SCHEMA
// =====================================================

const pieceWorkSchema = z.object({
  worker_id: z.string().uuid(),
  work_date: z.string().min(1),
  task_id: z.string().uuid().optional().or(z.literal('')),
  parcel_id: z.string().uuid().optional().or(z.literal('')),
  work_unit_id: z.string().uuid(),
  units_completed: z.number().positive(),
  rate_per_unit: z.number().nonnegative(),
  quality_rating: z.number().int().min(1).max(5).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  break_duration: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

type PieceWorkFormData = z.infer<typeof pieceWorkSchema>;

interface PieceWorkEntryProps {
  workerId?: string; // Pre-select worker
  taskId?: string; // Pre-select task
  parcelId?: string; // Pre-select parcel
  onSuccess?: () => void;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function PieceWorkEntry({
  workerId,
  taskId,
  parcelId,
  onSuccess,
}: PieceWorkEntryProps) {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // =====================================================
  // DATA FETCHING
  // =====================================================

  // Fetch workers
  const { data: workers = [] } = useQuery({
    queryKey: ['workers', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      return workersApi.getActive({ is_active: true }, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch work units
  const { data: workUnits = [] } = useQuery({
    queryKey: ['work-units', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      return workUnitsApi.getAll({ is_active: true }, currentOrganization.id) as Promise<WorkUnit[]>;
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch tasks (optional)
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentOrganization?.id, currentFarm?.id],
    queryFn: async () => {
      if (!currentOrganization?.id || !currentFarm?.id) return [];
      const result = await tasksApi.getAll(currentOrganization.id, {
        farm_id: currentFarm.id,
        status: ['assigned', 'in_progress', 'completed'],
      });
      return result?.data || [];
    },
    enabled: !!currentOrganization?.id && !!currentFarm?.id,
  });

  // Fetch parcels (optional)
  const { data: parcels = [] } = useQuery({
    queryKey: ['parcels', currentOrganization?.id, currentFarm?.id],
    queryFn: async () => {
      if (!currentOrganization?.id || !currentFarm?.id) return [];
      return parcelsApi.getAll({
        organization_id: currentOrganization.id,
        farm_id: currentFarm.id
      }, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id && !!currentFarm?.id,
  });

  // =====================================================
  // MUTATIONS
  // =====================================================

  const createMutation = useMutation({
    mutationFn: async (data: PieceWorkFormData) => {
      if (!currentOrganization?.id || !currentFarm?.id) {
        throw new Error('No organization or farm selected');
      }

      return pieceWorkApi.create(currentOrganization.id, currentFarm.id, {
        worker_id: data.worker_id,
        work_date: data.work_date,
        task_id: data.task_id || undefined,
        parcel_id: data.parcel_id || undefined,
        work_unit_id: data.work_unit_id,
        units_completed: data.units_completed,
        rate_per_unit: data.rate_per_unit,
        quality_rating: data.quality_rating,
        start_time: data.start_time || undefined,
        end_time: data.end_time || undefined,
        break_duration: data.break_duration || 0,
        notes: data.notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piece-work-records'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setIsDialogOpen(false);
      form.reset();
      onSuccess?.();
    },
  });

  // =====================================================
  // FORM HANDLING
  // =====================================================

  const form = useForm<PieceWorkFormData>({
    resolver: zodResolver(pieceWorkSchema),
    defaultValues: {
      worker_id: workerId || '',
      work_date: format(new Date(), 'yyyy-MM-dd'),
      task_id: taskId || '',
      parcel_id: parcelId || '',
      work_unit_id: '',
      units_completed: 0,
      rate_per_unit: 0,
      quality_rating: undefined,
      break_duration: 0,
      notes: '',
    },
  });

  // Auto-fill rate when worker or unit changes
  const _selectedWorkerId = form.watch('worker_id');
  const selectedUnitId = form.watch('work_unit_id');

  const handleWorkerChange = (workerId: string) => {
    form.setValue('worker_id', workerId);

    const worker = workers.find((w) => w.id === workerId);
    if (worker) {
      // Auto-fill default unit
      if (worker.default_work_unit_id && !selectedUnitId) {
        form.setValue('work_unit_id', worker.default_work_unit_id);
      }

      // Auto-fill rate
      if (worker.rate_per_unit) {
        form.setValue('rate_per_unit', worker.rate_per_unit);
      }
    }
  };

  const handleOpenDialog = () => {
    form.reset({
      worker_id: workerId || '',
      work_date: format(new Date(), 'yyyy-MM-dd'),
      task_id: taskId || '',
      parcel_id: parcelId || '',
      work_unit_id: '',
      units_completed: 0,
      rate_per_unit: 0,
      break_duration: 0,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    form.reset();
  };

  const onSubmit = (data: PieceWorkFormData) => {
    createMutation.mutate(data);
  };

  const totalAmount = form.watch('units_completed') * form.watch('rate_per_unit');

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <Button onClick={handleOpenDialog}>
        <Plus className="h-4 w-4 mr-2" />
        {t('workers.pieceWork.buttons.record')}
      </Button>

      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        size="2xl"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
          <DialogHeader>
            <DialogTitle>{t('workers.pieceWork.title')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Worker & Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="worker_id"
                render={({ field }) => (
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('workers.pieceWork.fields.worker')} *
                    </label>
                    <Select
                      {...field}
                      onChange={(e) => handleWorkerChange(e.target.value)}
                    >
                      <option value="">{t('workers.pieceWork.fields.selectWorker')}</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.first_name} {worker.last_name}
                          {worker.payment_frequency === 'per_unit' && ` (${t('workers.pieceWork.fields.pieceWork')})`}
                        </option>
                      ))}
                    </Select>
                    {form.formState.errors.worker_id && (
                      <p className="text-sm text-red-500 mt-1">
                        {t('workers.pieceWork.validation.workerRequired')}
                      </p>
                    )}
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="work_date"
                render={({ field }) => (
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('workers.pieceWork.fields.date')} *
                    </label>
                    <Input {...field} type="date" />
                    {form.formState.errors.work_date && (
                      <p className="text-sm text-red-500 mt-1">
                        {t('workers.pieceWork.validation.dateRequired')}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Task & Parcel (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="task_id"
                render={({ field }) => (
                  <div>
                    <label className="text-sm font-medium">{t('workers.pieceWork.fields.task')}</label>
                    <Select {...field}>
                      <option value="">{t('workers.pieceWork.fields.none')}</option>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="parcel_id"
                render={({ field }) => (
                  <div>
                    <label className="text-sm font-medium">{t('workers.pieceWork.fields.parcel')}</label>
                    <Select {...field}>
                      <option value="">{t('workers.pieceWork.fields.none')}</option>
                      {parcels.map((parcel) => (
                        <option key={parcel.id} value={parcel.id}>
                          {parcel.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              />
            </div>

            {/* Unit & Amount */}
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t('workers.pieceWork.fields.workCompleted')}
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="work_unit_id"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium">{t('workers.pieceWork.fields.unit')} *</label>
                      <Select {...field}>
                        <option value="">{t('workers.pieceWork.fields.selectUnit')}</option>
                        {workUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.code})
                          </option>
                        ))}
                      </Select>
                      {form.formState.errors.work_unit_id && (
                        <p className="text-sm text-red-500 mt-1">
                          {t('workers.pieceWork.validation.unitRequired')}
                        </p>
                      )}
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="units_completed"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium">{t('workers.pieceWork.fields.unitsCompleted')} *</label>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                      {form.formState.errors.units_completed && (
                        <p className="text-sm text-red-500 mt-1">
                          {t('workers.pieceWork.validation.unitsPositive')}
                        </p>
                      )}
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rate_per_unit"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium">{t('workers.pieceWork.fields.ratePerUnit')} *</label>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                      {form.formState.errors.rate_per_unit && (
                        <p className="text-sm text-red-500 mt-1">
                          {t('workers.pieceWork.validation.rateNonNegative')}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* Total Amount */}
              <div className="mt-4 p-3 bg-background rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t('workers.pieceWork.fields.totalAmount')}:
                  </span>
                  <span className="text-lg font-bold">
                    {currentOrganization?.currency || DEFAULT_CURRENCY} {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Quality Rating */}
            <FormField
              control={form.control}
              name="quality_rating"
              render={({ field }) => (
                <div>
                  <label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4" />
                    {t('workers.pieceWork.fields.qualityRating')}
                  </label>
                  <div className="flex gap-2">
                    {QUALITY_RATINGS.map((rating) => (
                      <Button
                        key={rating.value}
                        type="button"
                        size="sm"
                        variant={field.value === rating.value ? 'default' : 'outline'}
                        onClick={() => field.onChange(rating.value)}
                        className="flex-1"
                      >
                        <span className="text-lg mr-1">{rating.icon}</span>
                        {rating.value}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            />

            {/* Time Tracking (Optional) */}
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('workers.pieceWork.fields.timeTracking')}
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium">{t('workers.pieceWork.fields.startTime')}</label>
                      <Input {...field} type="time" />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium">{t('workers.pieceWork.fields.endTime')}</label>
                      <Input {...field} type="time" />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="break_duration"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium">{t('workers.pieceWork.fields.breakDuration')}</label>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  )}
                />
              </div>
            </Card>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <div>
                  <label className="text-sm font-medium">{t('workers.pieceWork.fields.notes')}</label>
                  <Textarea {...field} rows={3} placeholder={t('workers.pieceWork.fields.notesPlaceholder')} />
                </div>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                {t('workers.pieceWork.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? t('workers.pieceWork.buttons.saving') : t('workers.pieceWork.buttons.save')}
              </Button>
            </div>

            {createMutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">{t('workers.pieceWork.validation.saveError')}</p>
                  <p className="text-sm text-red-600">
                    {createMutation.error?.message || t('workers.pieceWork.validation.tryAgain')}
                  </p>
                </div>
              </div>
            )}
          </form>
      </ResponsiveDialog>
    </>
  );
}

// =====================================================
// PIECE-WORK LIST COMPONENT
// =====================================================

interface PieceWorkListProps {
  workerId?: string;
  filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  };
}

export function PieceWorkList({ workerId, filters }: PieceWorkListProps) {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();

  const { data: pieceWorkRecords = [], isLoading } = useQuery({
    queryKey: ['piece-work-records', currentOrganization?.id, currentFarm?.id, workerId, filters],
    queryFn: async () => {
      if (!currentOrganization?.id || !currentFarm?.id) return [];

      return pieceWorkApi.getAll(currentOrganization.id, currentFarm.id, {
        worker_id: workerId,
        start_date: filters?.startDate,
        end_date: filters?.endDate,
        payment_status: filters?.status as PieceWorkPaymentStatus | undefined,
      });
    },
    enabled: !!currentOrganization?.id && !!currentFarm?.id,
  });

  if (isLoading) {
    return <Card className="p-6"><p className="text-center">{t('workers.pieceWork.list.loading')}</p></Card>;
  }

  if (pieceWorkRecords.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">{t('workers.pieceWork.list.noRecords')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {pieceWorkRecords.map((record) => {
        const status = PIECE_WORK_PAYMENT_STATUSES.find((s) => s.value === record.payment_status);

        return (
          <Card key={record.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold">
                    {record.worker.first_name} {record.worker.last_name}
                  </h4>
                  <Badge variant="secondary">
                    {record.units_completed} {record.work_unit.name}
                  </Badge>
                  {status && (
                    <Badge style={{ backgroundColor: `var(--${status.color}-500)` }}>
                      {status.label}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <div>
                    <Calendar className="inline h-3 w-3 mr-1" />
                    {format(new Date(record.work_date), 'MMM dd, yyyy')}
                  </div>
                  <div>
                    <Package className="inline h-3 w-3 mr-1" />
                    {record.work_unit.code}
                  </div>
                  <div>
                    <DollarSign className="inline h-3 w-3 mr-1" />
                    {record.total_amount.toFixed(2)} {currentOrganization?.currency || DEFAULT_CURRENCY}
                  </div>
                  {record.quality_rating && (
                    <div>
                      <Star className="inline h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                      {record.quality_rating}/5
                    </div>
                  )}
                </div>

                {record.task && (
                  <p className="text-sm text-muted-foreground mt-1">{t('workers.pieceWork.list.task')}: {record.task.title}</p>
                )}

                {record.notes && (
                  <p className="text-sm mt-2">{record.notes}</p>
                )}
              </div>

              {record.verified_at && (
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
