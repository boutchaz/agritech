import React, { useState } from 'react';
import { X, UserCog } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import { useWorkers } from '../../hooks/useWorkers';
import type { Task, CreateTaskRequest, TaskType, TaskPriority } from '../../types/tasks';
import { TASK_TYPE_LABELS } from '../../types/tasks';
import type { WorkUnit } from '../../types/work-units';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
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

const TaskForm: React.FC<TaskFormProps> = ({
  task,
  organizationId,
  farms,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Partial<CreateTaskRequest>>({
    title: task?.title || '',
    description: task?.description || '',
    task_type: task?.task_type || 'general',
    priority: task?.priority || 'medium',
    farm_id: task?.farm_id || '',
    parcel_id: task?.parcel_id || undefined,
    assigned_to: task?.assigned_to || undefined,
    scheduled_start: task?.scheduled_start?.split('T')[0] || '',
    due_date: task?.due_date || '',
    estimated_duration: task?.estimated_duration || 8,
    notes: task?.notes || '',
    payment_type: task?.payment_type || 'daily',
    work_unit_id: task?.work_unit_id || undefined,
    units_required: task?.units_required || undefined,
    rate_per_unit: task?.rate_per_unit || undefined,
  });

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: workers = [] } = useWorkers(organizationId);

  // Fetch work units for piece-work selection
  const { data: workUnits = [] } = useQuery({
    queryKey: ['work-units', organizationId],
    queryFn: async () => {
      const { supabase } = await import('../../lib/supabase');
      const { data } = await supabase
        .from('work_units')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!organizationId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Clean up form data: convert empty strings to undefined for optional fields
      const cleanedData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => {
          // Convert empty strings to undefined so Postgres can handle them
          if (value === '' && ['scheduled_start', 'due_date', 'assigned_to', 'parcel_id', 'farm_id', 'notes', 'description'].includes(key)) {
            return [key, undefined];
          }
          return [key, value];
        })
      ) as Partial<CreateTaskRequest>;

      if (task) {
        await updateTask.mutateAsync({
          taskId: task.id,
          updates: cleanedData,
        });
      } else {
        await createTask.mutateAsync({
          ...cleanedData as CreateTaskRequest,
          organization_id: organizationId,
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

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

          {/* Farm */}
          <div className="space-y-2">
            <Label htmlFor="farm_id">Ferme *</Label>
            <Select
              value={formData.farm_id}
              onValueChange={(value) => setFormData({ ...formData, farm_id: value })}
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

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to" className="flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              Assigné à (travailleur)
            </Label>
            <Select
              value={formData.assigned_to || '__none__'}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value === '__none__' ? undefined : value })}
            >
              <SelectTrigger id="assigned_to">
                <SelectValue placeholder="Non assigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Non assigné</SelectItem>
                {workers.map(worker => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.first_name} {worker.last_name} - {worker.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sélectionnez un travailleur pour assigner cette tâche
            </p>
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_start">Date début</Label>
              <Input
                id="scheduled_start"
                type="date"
                value={formData.scheduled_start}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Date limite</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_duration">Durée (heures)</Label>
              <Input
                id="estimated_duration"
                type="number"
                min="1"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Payment Type & Work Unit Fields */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold">
              Paiement et Unités de Travail
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Payment Type */}
              <div className="space-y-2">
                <Label htmlFor="payment_type">Type de paiement</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData({ ...formData, payment_type: value as any })}
                >
                  <SelectTrigger id="payment_type">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <Label htmlFor="units_required">Unités requises *</Label>
                  <Input
                    id="units_required"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.units_required || ''}
                    onChange={(e) => setFormData({ ...formData, units_required: parseFloat(e.target.value) || undefined })}
                    placeholder="Ex: 100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_per_unit">Tarif par unité (MAD) *</Label>
                  <Input
                    id="rate_per_unit"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.rate_per_unit || ''}
                    onChange={(e) => setFormData({ ...formData, rate_per_unit: parseFloat(e.target.value) || undefined })}
                    placeholder="Ex: 5.00"
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

