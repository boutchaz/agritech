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

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

import type {
  PieceWorkRecord,
  PieceWorkRecordInsertDto,
  WorkUnit,
} from '@/types/work-units';
import { QUALITY_RATINGS, PIECE_WORK_PAYMENT_STATUSES } from '@/types/work-units';

// =====================================================
// VALIDATION SCHEMA
// =====================================================

const pieceWorkSchema = z.object({
  worker_id: z.string().uuid('Please select a worker'),
  work_date: z.string().min(1, 'Work date is required'),
  task_id: z.string().uuid().optional().or(z.literal('')),
  parcel_id: z.string().uuid().optional().or(z.literal('')),
  work_unit_id: z.string().uuid('Please select a work unit'),
  units_completed: z.number().positive('Units completed must be positive'),
  rate_per_unit: z.number().nonnegative('Rate per unit must be non-negative'),
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

      const { data, error } = await supabase
        .from('workers')
        .select('id, first_name, last_name, worker_type, payment_frequency, rate_per_unit, default_work_unit_id')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch work units
  const { data: workUnits = [] } = useQuery({
    queryKey: ['work-units', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('work_units')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as WorkUnit[];
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch tasks (optional)
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentFarm?.id],
    queryFn: async () => {
      if (!currentFarm?.id) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, parcel_id, status')
        .eq('farm_id', currentFarm.id)
        .in('status', ['assigned', 'in_progress', 'completed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!currentFarm?.id,
  });

  // Fetch parcels (optional)
  const { data: parcels = [] } = useQuery({
    queryKey: ['parcels', currentFarm?.id],
    queryFn: async () => {
      if (!currentFarm?.id) return [];

      const { data, error } = await supabase
        .from('parcels')
        .select('id, name')
        .eq('farm_id', currentFarm.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!currentFarm?.id,
  });

  // =====================================================
  // MUTATIONS
  // =====================================================

  const createMutation = useMutation({
    mutationFn: async (data: PieceWorkFormData) => {
      if (!currentOrganization?.id || !currentFarm?.id) {
        throw new Error('No organization or farm selected');
      }

      const insertData: PieceWorkRecordInsertDto = {
        organization_id: currentOrganization.id,
        farm_id: currentFarm.id,
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
      };

      const { data: newRecord, error } = await supabase
        .from('piece_work_records')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return newRecord;
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
        Record Piece Work
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Piece Work</DialogTitle>
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
                      Worker *
                    </label>
                    <Select
                      {...field}
                      onChange={(e) => handleWorkerChange(e.target.value)}
                    >
                      <option value="">Select worker...</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.first_name} {worker.last_name}
                          {worker.payment_frequency === 'per_unit' && ' (Piece-work)'}
                        </option>
                      ))}
                    </Select>
                    {form.formState.errors.worker_id && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.worker_id.message}
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
                      Date *
                    </label>
                    <Input {...field} type="date" />
                    {form.formState.errors.work_date && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.work_date.message}
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
                    <label className="text-sm font-medium">Task (Optional)</label>
                    <Select {...field}>
                      <option value="">None</option>
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
                    <label className="text-sm font-medium">Parcel (Optional)</label>
                    <Select {...field}>
                      <option value="">None</option>
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
                Work Completed
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="work_unit_id"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium">Unit *</label>
                      <Select {...field}>
                        <option value="">Select unit...</option>
                        {workUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.code})
                          </option>
                        ))}
                      </Select>
                      {form.formState.errors.work_unit_id && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.work_unit_id.message}
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
                      <label className="text-sm font-medium">Units Completed *</label>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                      {form.formState.errors.units_completed && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.units_completed.message}
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
                      <label className="text-sm font-medium">Rate per Unit *</label>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                      {form.formState.errors.rate_per_unit && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.rate_per_unit.message}
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
                    Total Amount:
                  </span>
                  <span className="text-lg font-bold">
                    {currentOrganization?.currency || 'MAD'} {totalAmount.toFixed(2)}
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
                    Quality Rating (Optional)
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
                Time Tracking (Optional)
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium">Start Time</label>
                      <Input {...field} type="time" />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium">End Time</label>
                      <Input {...field} type="time" />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="break_duration"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium">Break (minutes)</label>
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
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea {...field} rows={3} placeholder="Additional notes..." />
                </div>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>

            {createMutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error saving piece work</p>
                  <p className="text-sm text-red-600">
                    {createMutation.error?.message || 'Please try again'}
                  </p>
                </div>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
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
  const { currentOrganization, currentFarm } = useAuth();

  const { data: pieceWorkRecords = [], isLoading } = useQuery({
    queryKey: ['piece-work-records', currentFarm?.id, workerId, filters],
    queryFn: async () => {
      if (!currentFarm?.id) return [];

      let query = supabase
        .from('piece_work_records')
        .select(`
          *,
          worker:workers!inner(first_name, last_name),
          work_unit:work_units!inner(name, code),
          task:tasks(title),
          parcel:parcels(name)
        `)
        .eq('farm_id', currentFarm.id)
        .order('work_date', { ascending: false });

      if (workerId) {
        query = query.eq('worker_id', workerId);
      }

      if (filters?.startDate) {
        query = query.gte('work_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('work_date', filters.endDate);
      }

      if (filters?.status) {
        query = query.eq('payment_status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any[];
    },
    enabled: !!currentFarm?.id,
  });

  if (isLoading) {
    return <Card className="p-6"><p className="text-center">Loading...</p></Card>;
  }

  if (pieceWorkRecords.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No piece work records found</p>
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
                    {record.total_amount.toFixed(2)} {currentOrganization?.currency || 'MAD'}
                  </div>
                  {record.quality_rating && (
                    <div>
                      <Star className="inline h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                      {record.quality_rating}/5
                    </div>
                  )}
                </div>

                {record.task && (
                  <p className="text-sm text-muted-foreground mt-1">Task: {record.task.title}</p>
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
