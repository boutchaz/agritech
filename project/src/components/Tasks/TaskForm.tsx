import React, { useState, useMemo } from 'react';
import { X, MapPin, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import { useWorkers } from '../../hooks/useWorkers';
import { useBulkCreateTaskAssignments } from '../../hooks/useTaskAssignments';
import { workUnitsApi } from '../../lib/api/work-units';
import { parcelsApi } from '../../lib/api/parcels';
import type { Task, CreateTaskRequest, TaskType, TaskPriority } from '../../types/tasks';
import { TASK_TYPE_LABELS } from '../../types/tasks';
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
  // Default dates for new tasks: today as start, 7 days from now as due date
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState<Partial<CreateTaskRequest>>({
    title: task?.title || '',
    description: task?.description || '',
    task_type: task?.task_type || 'general',
    priority: task?.priority || 'medium',
    farm_id: task?.farm_id || '',
    parcel_id: task?.parcel_id || undefined,
    assigned_to: task?.assigned_to || undefined,
    scheduled_start: task ? formatDateForInput(task.scheduled_start) : today,
    due_date: task ? formatDateForInput(task.due_date) : nextWeek,
    estimated_duration: task?.estimated_duration || 8,
    notes: task?.notes || '',
    payment_type: task?.payment_type || 'daily',
    work_unit_id: task?.work_unit_id || undefined,
    units_required: task?.units_required || undefined,
    rate_per_unit: task?.rate_per_unit || undefined,
  });

  // State for multiple worker selection
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>(
    task?.assigned_to ? [task.assigned_to] : []
  );

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const bulkCreateAssignments = useBulkCreateTaskAssignments();

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

  // Fetch parcels for the selected farm
  const { data: parcels = [] } = useQuery({
    queryKey: ['parcels', organizationId, formData.farm_id],
    queryFn: async () => {
      if (!organizationId || !formData.farm_id) return [];
      const data = await parcelsApi.getAll({ farm_id: formData.farm_id }, organizationId);
      // Handle paginated response: { success: true, parcels: [...], total: ... }
      if (data && typeof data === 'object' && 'parcels' in data && Array.isArray((data as { parcels: any[] }).parcels)) {
        return (data as { parcels: any[] }).parcels;
      }
      // Fallback for direct array response
      return Array.isArray(data) ? data : [];
    },
    enabled: !!organizationId && !!formData.farm_id,
    staleTime: 5 * 60 * 1000,
  });

  // Get selected parcel details to auto-fill crop info - memoize to prevent infinite loops
  const selectedParcel = useMemo(() => {
    return parcels.find((p: Parcel) => p.id === formData.parcel_id);
  }, [parcels, formData.parcel_id]);

  // Auto-update title and crop_id when parcel is selected (only for new tasks without a custom title)
  React.useEffect(() => {
    // Only run for new tasks (not editing existing task)
    if (!task && selectedParcel && formData.parcel_id) {
      const updates: Partial<CreateTaskRequest> = {};

      // Auto-fill crop_id from parcel
      if (selectedParcel.crop_id && formData.crop_id !== selectedParcel.crop_id) {
        updates.crop_id = selectedParcel.crop_id;
      }

      // Auto-update title with crop type ONLY if title is currently empty or matches the auto-generated pattern
      if (selectedParcel.crop_type && formData.task_type) {
        const cropType = selectedParcel.crop_type;
        const taskTypeLabel = TASK_TYPE_LABELS[formData.task_type]?.fr || 'tâche';
        const newTitle = `${taskTypeLabel} - ${cropType} (${selectedParcel.name})`;

        // Only update if title is empty or matches the auto-generated pattern (to allow manual edits)
        const isAutoGenerated = !formData.title || formData.title.includes(cropType) || formData.title.includes(selectedParcel.name);
        if (isAutoGenerated && formData.title !== newTitle) {
          updates.title = newTitle;
        }
      }

      // Only update if there are actual changes to prevent infinite loops
      if (Object.keys(updates).length > 0) {
        setFormData(prev => {
          // Check if updates are actually different from current state
          const hasChanges = Object.keys(updates).some(key => {
            return prev[key as keyof typeof prev] !== updates[key as keyof typeof updates];
          });
          return hasChanges ? { ...prev, ...updates } : prev;
        });
      }
    }
  }, [
    formData.parcel_id,
    formData.task_type,
    formData.crop_id,
    formData.title,
    selectedParcel?.crop_id,
    selectedParcel?.crop_type,
    selectedParcel?.name,
    task,
  ]);

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate required dates
    if (!formData.scheduled_start) {
      setValidationError('La date de début est requise.');
      return;
    }

    if (!formData.due_date) {
      setValidationError('La date limite est requise.');
      return;
    }

    // Validate date order
    if (formData.due_date < formData.scheduled_start) {
      setValidationError('La date limite doit être après la date de début.');
      return;
    }

    // Validate: harvesting tasks require a parcel_id for "Complete with Harvest" workflow
    if (formData.task_type === 'harvesting' && !formData.parcel_id) {
      setValidationError('Les tâches de récolte nécessitent une parcelle pour permettre l\'enregistrement de la récolte.');
      return;
    }

    try {
      // Clean up form data: convert empty strings to undefined for optional fields
      // Convert dates to ISO format for backend
      const cleanedData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => {
          // Convert date fields to ISO format (add time component)
          if ((key === 'scheduled_start' || key === 'due_date') && value && typeof value === 'string') {
            // If it's a date-only string (YYYY-MM-DD), convert to ISO format
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              return [key, `${value}T00:00:00.000Z`];
            }
            return [key, value];
          }
          // Convert empty strings to undefined so Postgres can handle them
          if (value === '' && ['assigned_to', 'parcel_id', 'farm_id', 'notes', 'description'].includes(key)) {
            return [key, undefined];
          }
          return [key, value];
        })
      ) as Partial<CreateTaskRequest>;

      // Set the primary assigned_to to the first selected worker (for backward compatibility)
      if (selectedWorkerIds.length > 0) {
        cleanedData.assigned_to = selectedWorkerIds[0];
      } else {
        cleanedData.assigned_to = undefined;
      }

      if (task) {
        await updateTask.mutateAsync({
          taskId: task.id,
          organizationId,
          updates: cleanedData,
        });
        // For existing tasks, create additional assignments for workers beyond the first
        if (selectedWorkerIds.length > 1) {
          await bulkCreateAssignments.mutateAsync({
            taskId: task.id,
            data: {
              assignments: selectedWorkerIds.slice(1).map(workerId => ({
                worker_id: workerId,
                role: 'worker' as const,
              })),
            },
          });
        }
      } else {
        // Create the task first
        const newTask = await createTask.mutateAsync({
          ...cleanedData as CreateTaskRequest,
          organization_id: organizationId,
        });
        // Then create assignments for additional workers (first worker is already assigned via assigned_to)
        if (selectedWorkerIds.length > 1 && newTask?.id) {
          await bulkCreateAssignments.mutateAsync({
            taskId: newTask.id,
            data: {
              assignments: selectedWorkerIds.slice(1).map(workerId => ({
                worker_id: workerId,
                role: 'worker' as const,
              })),
            },
          });
        }
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving task:', error);
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
            {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {validationError}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Taille des arbres fruitiers"
            />
          </div>

          {/* Task Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task_type">Type de tâche *</Label>
              <Select
                value={formData.task_type}
                onValueChange={(value) => setFormData({ ...formData, task_type: value as TaskType })}
              >
                <SelectTrigger id="task_type">
                  <SelectValue placeholder="Sélectionner type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPE_LABELS).map(([value, labels]) => (
                    <SelectItem key={value} value={value}>
                      {labels.fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorité *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Sélectionner priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Détails de la tâche..."
            />
          </div>

          {/* Farm & Parcel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="farm_id">Ferme *</Label>
              <Select
                value={formData.farm_id}
                onValueChange={(value) => setFormData({ ...formData, farm_id: value, parcel_id: undefined, assigned_to: undefined })}
              >
                <SelectTrigger id="farm_id">
                  <SelectValue placeholder="Sélectionnez une ferme" />
                </SelectTrigger>
                <SelectContent>
                  {farms.map(farm => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Parcel - especially important for harvesting tasks */}
            <div className="space-y-2">
              <Label htmlFor="parcel_id" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Parcelle {formData.task_type === 'harvesting' && '*'}
              </Label>
              <Select
                value={formData.parcel_id || '__none__'}
                onValueChange={(value) => {
                  const newParcelId = value === '__none__' ? undefined : value;
                  setFormData(prev => ({ ...prev, parcel_id: newParcelId }));
                }}
                disabled={!formData.farm_id}
              >
                <SelectTrigger id="parcel_id">
                  <SelectValue placeholder={formData.farm_id ? "Sélectionner parcelle" : "Sélectionnez d'abord une ferme"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune</SelectItem>
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
              {/* Show selected parcel crop info */}
              {selectedParcel && (
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                  🌱 Culture: {selectedParcel.crop_type || 'Non définie'}
                  {selectedParcel.variety && ` | Variété: ${selectedParcel.variety}`}
                  {selectedParcel.tree_count && ` | ${selectedParcel.tree_count} arbres`}
                </div>
              )}
              {formData.task_type === 'harvesting' && !formData.parcel_id && (
                <p className="text-xs text-amber-600">
                  Sélectionnez une parcelle pour les tâches de récolte
                </p>
              )}
            </div>
          </div>

          {/* Assigned To - Multiple Workers */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assigné à (travailleurs)
              {selectedWorkerIds.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs rounded-full">
                  {selectedWorkerIds.length} sélectionné{selectedWorkerIds.length > 1 ? 's' : ''}
                </span>
              )}
            </Label>
            {workers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {!formData.farm_id 
                  ? 'Aucun travailleur disponible. Sélectionnez une ferme pour filtrer les travailleurs.'
                  : 'Aucun travailleur trouvé pour cette ferme'}
              </p>
            ) : (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {workers.map(worker => {
                  const isFixedSalary = worker.worker_type === 'fixed_salary';
                  const workerTypeLabel = worker.worker_type === 'fixed_salary' ? 'Salarié fixe' :
                                         worker.worker_type === 'daily_worker' ? 'Journalier' :
                                         worker.worker_type === 'metayage' ? 'Métayer' : '';
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
                  </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Vous pouvez sélectionner plusieurs travailleurs pour cette tâche
            </p>
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_start">Date début *</Label>
              <Input
                id="scheduled_start"
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.scheduled_start || ''}
                onChange={(e) => {
                  const dateValue = e.target.value;
                  setFormData({
                    ...formData,
                    scheduled_start: dateValue,
                    // Auto-set due_date to scheduled_start if not set or if earlier
                    due_date: formData.due_date && formData.due_date >= dateValue
                      ? formData.due_date
                      : dateValue
                  });
                }}
                className={!formData.scheduled_start ? 'border-amber-400' : ''}
              />
              {!formData.scheduled_start && (
                <p className="text-xs text-amber-600">Requis</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Date limite *</Label>
              <Input
                id="due_date"
                type="date"
                required
                min={formData.scheduled_start || new Date().toISOString().split('T')[0]}
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className={!formData.due_date ? 'border-amber-400' : ''}
              />
              {!formData.due_date && (
                <p className="text-xs text-amber-600">Requis</p>
              )}
              {formData.scheduled_start && formData.due_date && formData.due_date < formData.scheduled_start && (
                <p className="text-xs text-red-600">La date limite doit être après la date de début</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_duration">Durée (heures)</Label>
              <Input
                id="estimated_duration"
                type="number"
                min="1"
                value={formData.estimated_duration || ''}
                onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) || undefined })}
              />
            </div>
          </div>

          {/* Payment Type & Work Unit Fields */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Paiement et Unités de Travail
              </h3>
              {/* Check if any selected workers are fixed salary */}
              {selectedWorkerIds.length > 0 &&
                workers.filter(w => selectedWorkerIds.includes(w.id) && w.worker_type === 'fixed_salary').length > 0 && (
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                  Salariés fixes sélectionnés - paiement optionnel
                </span>
              )}
            </div>

            {/* Note for fixed salary workers */}
            {selectedWorkerIds.length > 0 &&
              workers.filter(w => selectedWorkerIds.includes(w.id) && w.worker_type === 'fixed_salary').length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Les travailleurs à salaire fixe sont déjà rémunérés mensuellement.
                  Le paiement pour cette tâche est optionnel (bonus/prime pour travail exceptionnel).
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Payment Type */}
              <div className="space-y-2">
                <Label htmlFor="payment_type">
                  Type de paiement
                  {selectedWorkerIds.length > 0 &&
                    workers.filter(w => selectedWorkerIds.includes(w.id) && w.worker_type === 'fixed_salary').length === selectedWorkerIds.length && (
                    <span className="text-xs text-muted-foreground ml-2">(optionnel)</span>
                  )}
                </Label>
                <Select
                  value={formData.payment_type || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, payment_type: value === 'none' ? undefined : value as any })}
                >
                  <SelectTrigger id="payment_type">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Show "none" option only when all selected workers are fixed salary */}
                    {selectedWorkerIds.length > 0 &&
                      workers.filter(w => selectedWorkerIds.includes(w.id) && w.worker_type === 'fixed_salary').length > 0 && (
                      <SelectItem value="none">Aucun (inclus dans le salaire)</SelectItem>
                    )}
                    <SelectItem value="daily">Par jour</SelectItem>
                    <SelectItem value="per_unit">À l'unité (Pièce-travail)</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="metayage">Métayage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Work Unit (only if payment type is per_unit) */}
              {formData.payment_type === 'per_unit' && (
                <div className="space-y-2">
                  <Label htmlFor="work_unit_id">Unité de travail *</Label>
                  <Select
                    value={formData.work_unit_id || '__none__'}
                    onValueChange={(value) => setFormData({ ...formData, work_unit_id: value === '__none__' ? undefined : value })}
                  >
                    <SelectTrigger id="work_unit_id">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune</SelectItem>
                      {workUnits.map((unit: WorkUnit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Units Required & Rate (only if payment type is per_unit) */}
            {formData.payment_type === 'per_unit' && formData.work_unit_id && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="units_required">Unités estimées</Label>
                  <Input
                    id="units_required"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.units_required || ''}
                    onChange={(e) => setFormData({ ...formData, units_required: parseFloat(e.target.value) || undefined })}
                    placeholder="Ex: 100 (optionnel)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Les unités réelles seront enregistrées à la fin de la tâche
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_per_unit">Tarif par unité (MAD)</Label>
                  <Input
                    id="rate_per_unit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rate_per_unit || ''}
                    onChange={(e) => setFormData({ ...formData, rate_per_unit: parseFloat(e.target.value) || undefined })}
                    placeholder="Ex: 5.00 (optionnel)"
                  />
                  {formData.units_required && formData.rate_per_unit && (
                    <p className="text-xs text-muted-foreground">
                      Total estimé: {(formData.units_required * formData.rate_per_unit).toFixed(2)} MAD
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Notes additionnelles..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createTask.isPending || updateTask.isPending}
            >
              {createTask.isPending || updateTask.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;

