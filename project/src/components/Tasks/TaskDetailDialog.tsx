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
} from 'lucide-react';
import { useUpdateTask } from '../../hooks/useTasks';
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
      setError(err instanceof Error ? err.message : 'Erreur lors du démarrage de la tâche');
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
      setError(err instanceof Error ? err.message : 'Erreur lors de la pause de la tâche');
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
      setError(err instanceof Error ? err.message : 'Erreur lors de la reprise de la tâche');
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
      setError(err instanceof Error ? err.message : 'Erreur lors de la complétion de la tâche');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompletePerUnit = async () => {
    if (!hasMultipleWorkers && perUnitData.units_completed <= 0) {
      setError('Veuillez entrer le nombre d\'unités complétées');
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
      setError(err instanceof Error ? err.message : 'Erreur lors de la complétion de la tâche');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteWithHarvest = async () => {
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
      setError(err instanceof Error ? err.message : 'Erreur lors de la complétion de la récolte');
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

          {/* Task Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Type de tâche</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {getTaskTypeLabel(task.task_type, 'fr')}
              </p>
            </div>

            {'farm_name' in task && task.farm_name && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Ferme</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {task.farm_name}
                </p>
              </div>
            )}

            {'parcel_name' in task && task.parcel_name && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Parcelle</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  {task.parcel_name}
                </p>
              </div>
            )}

            {'worker_name' in task && task.worker_name && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Assigné à</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {task.worker_name}
                </p>
              </div>
            )}

            {task.estimated_duration && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Durée estimée</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {task.estimated_duration} heures
                </p>
              </div>
            )}

            {task.scheduled_start && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Date prévue</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(task.scheduled_start), 'PPP', { locale: fr })}
                </p>
              </div>
            )}

            {task.due_date && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Date limite</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(task.due_date), 'PPP', { locale: fr })}
                </p>
              </div>
            )}
          </div>

          {task.description && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
              <p className="text-gray-900 dark:text-white">{task.description}</p>
            </div>
          )}

          {/* Payment Info */}
          {task.payment_type && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">Informations de paiement</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Type de paiement</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {task.payment_type === 'per_unit' ? 'À l\'unité' :
                     task.payment_type === 'daily' ? 'Journalier' :
                     task.payment_type === 'monthly' ? 'Mensuel' : 'Métayage'}
                  </p>
                </div>
                {task.units_required && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Unités estimées</p>
                    <p className="font-medium text-gray-900 dark:text-white">{task.units_required}</p>
                  </div>
                )}
                {task.rate_per_unit && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Tarif par unité</p>
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
                Paiement à l'unité
              </h3>

              {/* Tarif par unité (always shown) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_per_unit_completion">Tarif par unité (MAD) *</Label>
                  <Input
                    id="rate_per_unit_completion"
                    type="number"
                    min="0"
                    step="0.01"
                    value={perUnitData.rate_per_unit || ''}
                    onChange={(e) => setPerUnitData({ ...perUnitData, rate_per_unit: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 5.00"
                  />
                </div>
              </div>

              {/* Per-worker units if multiple workers */}
              {hasMultipleWorkers ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Unités par travailleur</p>
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
                  <Label htmlFor="units_completed">Unités complétées *</Label>
                  <Input
                    id="units_completed"
                    type="number"
                    min="0"
                    step="0.01"
                    value={perUnitData.units_completed || ''}
                    onChange={(e) => setPerUnitData({ ...perUnitData, units_completed: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 100"
                  />
                  {task.units_required && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Unités estimées: {task.units_required}
                    </p>
                  )}
                </div>
              )}

              {/* Total summary */}
              {perUnitData.rate_per_unit > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Paiement total
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
                <Label htmlFor="per_unit_notes">Notes</Label>
                <Textarea
                  id="per_unit_notes"
                  value={perUnitData.notes}
                  onChange={(e) => setPerUnitData({ ...perUnitData, notes: e.target.value })}
                  rows={2}
                  placeholder="Notes sur le travail effectué..."
                />
              </div>
            </div>
          )}
          {/* Harvest Completion Form */}
          {showHarvestForm && (
            <div className="border-t dark:border-gray-700 pt-6 space-y-4">
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
                      <p className="font-medium text-sm">Terminer complètement</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Marquer la tâche comme terminée</p>
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format automatique: {'{'}ParcelCode{'}'}{'{'}FarmCode{'}'}-{'{'}Sequence{'}'}{'{'}Year{'}'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Crop Selector */}
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
                          ? "Cette parcelle n'a pas de type de culture défini. Veuillez modifier la parcelle pour ajouter un type de culture."
                          : "Aucune culture trouvée pour cette parcelle. Veuillez d'abord créer une culture dans Agriculture > Cultures."
                        : "Aucune parcelle assignée à cette tâche. Modifiez la tâche pour ajouter une parcelle, ou créez une culture dans Agriculture > Cultures."}
                    </p>
                  )}
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
                  <Select
                    value={harvestData.unit}
                    onValueChange={(value) => setHarvestData({ ...harvestData, unit: value as HarvestUnit })}
                  >
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
                  <Select
                    value={harvestData.quality_grade}
                    onValueChange={(value) => setHarvestData({ ...harvestData, quality_grade: value as HarvestQualityGrade })}
                  >
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
            </div>
          )}

          {/* Progress Bar */}
          {task.completion_percentage > 0 && task.status !== 'completed' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Progression</span>
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

        {/* Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>

            {canStart && (
              <Button variant="blue" onClick={handleStartTask} disabled={isLoading} >
                <Play className="w-4 h-4 mr-2" />
                Démarrer
              </Button>
            )}

            {canPause && (
              <Button
                onClick={handlePauseTask}
                disabled={isLoading}
                variant="outline"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            )}

            {canResume && (
              <Button variant="blue" onClick={handleResumeTask} disabled={isLoading} >
                <Play className="w-4 h-4 mr-2" />
                Reprendre
              </Button>
            )}

            {canComplete && !showHarvestForm && !showPerUnitForm && (
              <Button variant="green" onClick={handleCompleteTask} disabled={isLoading} >
                {isHarvestingTask ? (
                  <>
                    <Wheat className="w-4 h-4 mr-2" />
                    Terminer avec récolte
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Terminer
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
                  Annuler
                </Button>
                <Button variant="green" onClick={handleCompletePerUnit} disabled={isLoading || perUnitData.units_completed <= 0} >
                  {isLoading ? (
                    'Enregistrement...'
                  ) : (
                    <>
                      <Banknote className="w-4 h-4 mr-2" />
                      Terminer et payer
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
                  Annuler
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
                    ? 'Enregistrement...'
                    : completionType === 'partial'
                    ? 'Enregistrer récolte partielle'
                    : 'Terminer et enregistrer'}
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
