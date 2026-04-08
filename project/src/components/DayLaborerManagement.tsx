import { useState } from 'react';
import { Plus, X, Edit2, Trash2, User } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { workersApi, type Worker } from '../lib/api/workers';
import { tasksApi } from '../lib/api/tasks';
import { useAuth } from '../hooks/useAuth';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FilterBar, ResponsiveList } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';


interface TaskCategory {
  id: string;
  name: string;
  description: string;
}

interface DayLaborer {
  id: string;
  first_name: string;
  last_name: string;
  cin: string;
  phone: string;
  address: string;
  daily_rate: number;
  task_rate: number | null;
  unit_rate: number | null;
  unit_type: string | null;
  payment_type: 'daily' | 'task' | 'unit';
  specialties?: string[]; // store category ids or names directly in array column
  farm_id: string;
}

const DayLaborerManagement = () => {
  const { currentFarm, currentOrganization } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const farmId = currentFarm?.id;
  const organizationId = currentOrganization?.id;
  const currency = currentOrganization?.currency || 'EUR';
  const [searchValue, setSearchValue] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingLaborer, setEditingLaborer] = useState<DayLaborer | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const [newLaborer, setNewLaborer] = useState<Partial<DayLaborer>>({
    first_name: '',
    last_name: '',
    cin: '',
    phone: '',
    address: '',
    daily_rate: 0,
    payment_type: 'daily',
    task_rate: null,
      unit_rate: null,
      unit_type: null
  });

  const mapWorkerToDayLaborer = (worker: Worker): DayLaborer => {
    const paymentFrequency = String(worker.payment_frequency || '');
    const paymentType: DayLaborer['payment_type'] =
      paymentFrequency === 'per_task' ? 'task' : paymentFrequency === 'per_unit' ? 'unit' : 'daily';

    return {
      id: worker.id,
      first_name: worker.first_name,
      last_name: worker.last_name,
      cin: worker.cin || '',
      phone: worker.phone || '',
      address: worker.notes || '',
      daily_rate: worker.daily_rate ?? 0,
      task_rate: paymentType === 'task' ? (worker.daily_rate ?? 0) : null,
      unit_rate: paymentType === 'unit' ? (worker.daily_rate ?? 0) : null,
      unit_type: null,
      payment_type: paymentType,
      specialties: worker.specialties || [],
      farm_id: worker.farm_id || farmId || '',
    };
  };

  const laborersQuery = useQuery({
    queryKey: ['day-laborers', organizationId, farmId],
    queryFn: async (): Promise<DayLaborer[]> => {
      if (!organizationId || !farmId) return [];
      const workers = await workersApi.getAll({ farmId }, organizationId);
      return workers
        .filter((worker) => worker.worker_type === 'daily_worker')
        .map(mapWorkerToDayLaborer)
        .sort((a, b) => a.last_name.localeCompare(b.last_name));
    },
    enabled: !!organizationId && !!farmId,
  });

  const taskCategoriesQuery = useQuery({
    queryKey: ['task-categories', organizationId],
    queryFn: async (): Promise<TaskCategory[]> => {
      if (!organizationId) return [];
      const categories = await tasksApi.getCategories(organizationId);
      return categories.map((category) => ({
        id: String(category.id),
        name: String(category.name || ''),
        description: String(category.description || ''),
      }));
    },
    enabled: !!organizationId,
  });

  const addLaborerMutation = useMutation({
    mutationFn: async ({ laborer, specialties }: { laborer: Partial<DayLaborer>; specialties: string[] }) => {
      if (!organizationId || !farmId) {
        throw new Error(t('dayLaborers.errors.selectFarmToAdd', 'Sélectionnez une ferme pour ajouter un ouvrier.'));
      }

      const paymentFrequency = laborer.payment_type === 'task' || laborer.payment_type === 'unit'
        ? 'per_task'
        : 'daily';

      const effectiveRate = laborer.payment_type === 'task'
        ? laborer.task_rate ?? 0
        : laborer.payment_type === 'unit'
          ? laborer.unit_rate ?? 0
          : laborer.daily_rate ?? 0;

      await workersApi.create({
        first_name: laborer.first_name || '',
        last_name: laborer.last_name || '',
        cin: laborer.cin || undefined,
        phone: laborer.phone || undefined,
        hire_date: new Date().toISOString().split('T')[0],
        farm_id: farmId,
        worker_type: 'daily_worker',
        is_cnss_declared: false,
        daily_rate: effectiveRate,
        payment_frequency: paymentFrequency,
        specialties,
        notes: laborer.address || undefined,
      }, organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-laborers', organizationId, farmId] });
      setShowAddModal(false);
      setNewLaborer({
        first_name: '',
        last_name: '',
        cin: '',
        phone: '',
        address: '',
        daily_rate: 0,
        payment_type: 'daily',
        task_rate: null,
        unit_rate: null,
        unit_type: null,
      });
      setSelectedSpecialties([]);
      setError(null);
    },
    onError: (mutationError) => {
      console.error('Error adding day laborer:', mutationError);
      setError(t('dayLaborers.errors.addFailed', 'Échec de l’ajout de l’ouvrier journalier.'));
    },
  });

  const updateLaborerMutation = useMutation({
    mutationFn: async (laborer: DayLaborer) => {
      if (!organizationId || !farmId) {
        throw new Error(t('dayLaborers.errors.selectFarmToEdit', 'Sélectionnez une ferme pour modifier un ouvrier.'));
      }

      const paymentFrequency = laborer.payment_type === 'task' || laborer.payment_type === 'unit'
        ? 'per_task'
        : 'daily';

      const effectiveRate = laborer.payment_type === 'task'
        ? laborer.task_rate ?? 0
        : laborer.payment_type === 'unit'
          ? laborer.unit_rate ?? 0
          : laborer.daily_rate ?? 0;

      await workersApi.update(laborer.id, {
        first_name: laborer.first_name,
        last_name: laborer.last_name,
        cin: laborer.cin || undefined,
        phone: laborer.phone || undefined,
        farm_id: farmId,
        worker_type: 'daily_worker',
        daily_rate: effectiveRate,
        payment_frequency: paymentFrequency,
        specialties: laborer.specialties || [],
        notes: laborer.address || undefined,
      }, organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-laborers', organizationId, farmId] });
      setEditingLaborer(null);
      setError(null);
    },
    onError: (mutationError) => {
      console.error('Error updating laborer:', mutationError);
      setError(t('dayLaborers.errors.updateFailed', 'Échec de la mise à jour de l’ouvrier journalier.'));
    },
  });

  const deleteLaborerMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId || !farmId) {
        throw new Error(t('dayLaborers.errors.selectFarmToDelete', 'Sélectionnez une ferme pour supprimer un ouvrier.'));
      }
      await workersApi.delete(id, organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-laborers', organizationId, farmId] });
      setError(null);
    },
    onError: (mutationError) => {
      console.error('Error deleting laborer:', mutationError);
      setError(t('dayLaborers.errors.deleteFailed', 'Échec de la suppression de l’ouvrier journalier.'));
    },
  });

  const laborers = laborersQuery.data || [];
  const taskCategories = taskCategoriesQuery.data || [];
  const loading = laborersQuery.isLoading || taskCategoriesQuery.isLoading;
  const isFetching = laborersQuery.isFetching || taskCategoriesQuery.isFetching;
  const displayError = error
    || (laborersQuery.isError ? t('dayLaborers.errors.fetchLaborersFailed', 'Échec du chargement des ouvriers journaliers.') : null)
    || (taskCategoriesQuery.isError ? t('dayLaborers.errors.fetchTaskCategoriesFailed', 'Échec du chargement des catégories de tâches.') : null);

  const filteredLaborers = laborers.filter((laborer) => {
    const query = searchValue.trim().toLowerCase();

    if (!query) return true;

    const searchableValues = [
      laborer.first_name,
      laborer.last_name,
      `${laborer.first_name} ${laborer.last_name}`,
      laborer.cin,
    ];

    return searchableValues.some((value) => value?.toLowerCase().includes(query));
  });

  const getPaymentTypeLabel = (paymentType: DayLaborer['payment_type']) => {
    if (paymentType === 'task') {
      return t('dayLaborers.paymentType.task', 'Par tâche');
    }

    if (paymentType === 'unit') {
      return t('dayLaborers.paymentType.unit', 'Par unité');
    }

    return t('dayLaborers.paymentType.daily', 'Journalier');
  };

  const getRateLabel = (laborer: DayLaborer) => {
    if (laborer.payment_type === 'task') {
      return laborer.task_rate
        ? `${t('dayLaborers.labels.taskRate', 'Taux par tâche')}: ${laborer.task_rate} ${currency}`
        : '—';
    }

    if (laborer.payment_type === 'unit') {
      return laborer.unit_rate
        ? `${t('dayLaborers.labels.unitRate', 'Taux par unité')}${laborer.unit_type ? ` (${laborer.unit_type})` : ''}: ${laborer.unit_rate} ${currency}`
        : '—';
    }

    return `${laborer.daily_rate} ${currency}`;
  };

  const renderCreateAction = () => ({
    label: t('dayLaborers.actions.addFirst', 'Ajouter votre premier ouvrier'),
    onClick: () => setShowAddModal(true),
    variant: 'default' as const,
  });

  const handleAddLaborer = async () => {
    if (!farmId) {
      setError(t('dayLaborers.errors.selectFarmToAdd', 'Sélectionnez une ferme pour ajouter un ouvrier.'));
      return;
    }

    addLaborerMutation.mutate({ laborer: newLaborer, specialties: selectedSpecialties });
  };

  const handleUpdateLaborer = async (laborer: DayLaborer) => {
    updateLaborerMutation.mutate(laborer);
  };

  const handleDeleteLaborer = async (id: string) => {
    showConfirm(t('dayLaborers.confirm.deleteTitle', 'Êtes-vous sûr de vouloir supprimer cet ouvrier ?'), () => {
      try {
        if (!farmId) {
          setError(t('dayLaborers.errors.selectFarmToDelete', 'Sélectionnez une ferme pour supprimer un ouvrier.'));
          return;
        }
        deleteLaborerMutation.mutate(id);
      } catch (error) {
        console.error('Error deleting laborer:', error);
        setError(t('dayLaborers.errors.deleteFailed', 'Échec de la suppression de l’ouvrier journalier.'));
      }
    }, {variant: "destructive"});
  };

  const renderSpecialtiesSelect = () => (
    <FormField
      label={t('dayLaborers.fields.specialties', 'Spécialités')}
      htmlFor="laborer_specialties"
      helper={t('dayLaborers.fields.specialtiesHelper', 'Maintenez Ctrl/Cmd pour sélectionner plusieurs')}
    >
      <Select
        id="laborer_specialties"
        multiple
        value={selectedSpecialties}
        onChange={(e) => {
          const values = Array.from((e.target as HTMLSelectElement).selectedOptions, option => option.value);
          setSelectedSpecialties(values);
        }}
        size={5}
      >
        {taskCategories.map(category => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
    </FormField>
  );

  const renderSpecialties = (laborer: DayLaborer) => {
    if (!laborer.specialties?.length) return null;
    const idToName = new Map(taskCategories.map(c => [c.id, c.name] as const));
    return (
      <div className="mt-2">
        <p className="font-medium">{t('dayLaborers.fields.specialtiesLabel', 'Spécialités:')}</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {laborer.specialties.map((value) => {
            const label = idToName.get(value) || value;
            return (
              <span
                key={value}
                className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs"
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('dayLaborers.title', 'Gestion des Ouvriers Journaliers')}
        </h2>
        <Button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={!currentFarm?.id}
          variant={currentFarm?.id ? 'green' : undefined}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md ${!currentFarm?.id ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : ''}`}
          title={!currentFarm?.id ? t('dayLaborers.errors.selectFarmToAdd', 'Sélectionnez une ferme pour ajouter un ouvrier.') : undefined}
        >
          <Plus className="h-5 w-5" />
          <span>{t('dayLaborers.actions.newLaborer', 'Nouvel Ouvrier')}</span>
        </Button>
      </div>

      {displayError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{displayError}</p>
        </div>
      )}

      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder={t('dayLaborers.searchPlaceholder', 'Rechercher par nom ou CIN')}
      />

      {!farmId && (
        <EmptyState
          variant="inline"
          icon={User}
          description={t('dayLaborers.selectFarmMessage', 'Sélectionnez une ferme pour gérer les ouvriers journaliers.')}
        />
      )}

      {farmId && (
        <ResponsiveList
          items={filteredLaborers}
          isLoading={loading}
          isFetching={isFetching}
          keyExtractor={(laborer) => laborer.id}
          emptyIcon={User}
          emptyMessage={searchValue
            ? t('dayLaborers.empty.filtered', 'Aucun ouvrier ne correspond à votre recherche.')
            : t('dayLaborers.empty.default', 'Aucun ouvrier pour l’instant.')}
          emptyAction={renderCreateAction()}
          renderCard={(laborer) => (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4 gap-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <User className="h-10 w-10 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold truncate">
                      {laborer.first_name} {laborer.last_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {t('dayLaborers.fields.cinLabel', 'CIN')}: {laborer.cin || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <Button
                    type="button"
                    onClick={() => setEditingLaborer(laborer)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <Edit2 className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDeleteLaborer(laborer.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-gray-600 dark:text-gray-300">
                  {t('dayLaborers.fields.phoneLabel', 'Tél')}: {laborer.phone || '—'}
                </p>
                {laborer.address && (
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('dayLaborers.fields.address', 'Adresse')}: {laborer.address}
                  </p>
                )}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                  <p className="font-medium">
                    {t('dayLaborers.fields.paymentType', 'Type de paiement')}: {getPaymentTypeLabel(laborer.payment_type)}
                  </p>
                  <p>
                    {t('dayLaborers.fields.rate', 'Tarif')}: {getRateLabel(laborer)}
                  </p>
                </div>
                {renderSpecialties(laborer)}
              </div>
            </div>
          )}
          renderTableHeader={(
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('dayLaborers.table.name', 'Nom')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('dayLaborers.table.cin', 'CIN')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('dayLaborers.table.phone', 'Téléphone')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('dayLaborers.table.paymentType', 'Type de paiement')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('dayLaborers.table.rate', 'Tarif')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('dayLaborers.table.specialties', 'Spécialités')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('dayLaborers.table.actions', 'Actions')}
              </th>
            </tr>
          )}
          renderTable={(laborer) => (
            <>
              <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                {laborer.first_name} {laborer.last_name}
              </td>
              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{laborer.cin || '—'}</td>
              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{laborer.phone || '—'}</td>
              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{getPaymentTypeLabel(laborer.payment_type)}</td>
              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{getRateLabel(laborer)}</td>
              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                {laborer.specialties?.length ? renderSpecialties(laborer) : '—'}
              </td>
              <td className="px-4 py-4 text-sm text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => setEditingLaborer(laborer)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <Edit2 className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDeleteLaborer(laborer.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </td>
            </>
          )}
        />
      )}

      {showAddModal && (
        <div className="modal-overlay overflow-y-auto">
          <div className="modal-panel p-6 max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('dayLaborers.modal.addTitle', 'Nouvel Ouvrier')}
              </h3>
              <Button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('common.firstName', 'Prénom')} htmlFor="dl_first_name" required>
                  <Input
                    id="dl_first_name"
                    type="text"
                    value={newLaborer.first_name}
                    onChange={(e) => setNewLaborer({ ...newLaborer, first_name: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label={t('common.lastName', 'Nom')} htmlFor="dl_last_name" required>
                  <Input
                    id="dl_last_name"
                    type="text"
                    value={newLaborer.last_name}
                    onChange={(e) => setNewLaborer({ ...newLaborer, last_name: e.target.value })}
                    required
                  />
                </FormField>
              </div>

              <div>
                <FormField label={t('dayLaborers.fields.cin', 'CIN')} htmlFor="dl_cin" required>
                  <Input
                    id="dl_cin"
                    type="text"
                    value={newLaborer.cin}
                    onChange={(e) => setNewLaborer({ ...newLaborer, cin: e.target.value })}
                    required
                  />
                </FormField>
              </div>

              <div>
                <FormField label={t('common.phone', 'Téléphone')} htmlFor="dl_phone">
                  <Input
                    id="dl_phone"
                    type="tel"
                    value={newLaborer.phone}
                    onChange={(e) => setNewLaborer({ ...newLaborer, phone: e.target.value })}
                  />
                </FormField>
              </div>

              <div>
                <FormField label={t('common.address', 'Adresse')} htmlFor="dl_address">
                  <Input
                    id="dl_address"
                    type="text"
                    value={newLaborer.address}
                    onChange={(e) => setNewLaborer({ ...newLaborer, address: e.target.value })}
                  />
                </FormField>
              </div>

              <div>
                <FormField label={t('dayLaborers.fields.paymentType', 'Type de paiement')} htmlFor="dl_payment_type" required>
                  <Select
                    id="dl_payment_type"
                    value={newLaborer.payment_type}
                    onChange={(e) => setNewLaborer({
                      ...newLaborer,
                      payment_type: (e.target as HTMLSelectElement).value as 'daily' | 'task' | 'unit'
                    })}
                    required
                  >
                    <option value="daily">{t('dayLaborers.paymentType.daily', 'Journalier')}</option>
                    <option value="task">{t('dayLaborers.paymentType.task', 'Par tâche')}</option>
                    <option value="unit">{t('dayLaborers.paymentType.unit', 'Par unité')}</option>
                  </Select>
                </FormField>
              </div>

              {newLaborer.payment_type === 'daily' && (
                  <FormField label={t('dayLaborers.fields.dailyRateWithCurrency', { defaultValue: 'Taux journalier ({{currency}})', currency })} htmlFor="dl_daily_rate" required>
                  <Input
                    id="dl_daily_rate"
                    type="number"
                    value={newLaborer.daily_rate}
                    onChange={(e) => setNewLaborer({ ...newLaborer, daily_rate: Number(e.target.value) })}
                      placeholder={t('dayLaborers.fields.dailyRatePlaceholder', { defaultValue: 'Taux journalier en {{currency}}', currency })}
                    required
                  />
                </FormField>
              )}

              {newLaborer.payment_type === 'task' && (
                  <FormField label={t('dayLaborers.fields.taskRateWithCurrency', { defaultValue: 'Taux par tâche ({{currency}})', currency })} htmlFor="dl_task_rate" required>
                  <Input
                    id="dl_task_rate"
                    type="number"
                    value={newLaborer.task_rate || ''}
                    onChange={(e) => setNewLaborer({ ...newLaborer, task_rate: Number(e.target.value) })}
                      placeholder={t('dayLaborers.fields.taskRatePlaceholder', { defaultValue: 'Taux par tâche en {{currency}}', currency })}
                    required
                  />
                </FormField>
              )}

              {newLaborer.payment_type === 'unit' && (
                <>
                   <FormField label={t('dayLaborers.fields.unitType', "Type d'unité")} htmlFor="dl_unit_type" required>
                    <Input
                      id="dl_unit_type"
                      type="text"
                      value={newLaborer.unit_type || ''}
                      onChange={(e) => setNewLaborer({ ...newLaborer, unit_type: e.target.value })}
                      placeholder={t('dayLaborers.fields.unitTypePlaceholder', 'Ex: kg, caisse, arbre...')}
                      required
                    />
                  </FormField>
                   <FormField label={t('dayLaborers.fields.unitRateWithCurrency', { defaultValue: 'Taux par unité ({{currency}})', currency })} htmlFor="dl_unit_rate" required>
                    <Input
                      id="dl_unit_rate"
                      type="number"
                      value={newLaborer.unit_rate || ''}
                      onChange={(e) => setNewLaborer({ ...newLaborer, unit_rate: Number(e.target.value) })}
                      placeholder={t('dayLaborers.fields.unitRatePlaceholder', { defaultValue: 'Taux par unité en {{currency}}', currency })}
                      required
                    />
                  </FormField>
                </>
              )}

              {renderSpecialtiesSelect()}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                {t('common.cancel', 'Annuler')}
              </Button>
              <Button variant="green" type="button" onClick={handleAddLaborer} className="px-4 py-2 text-sm font-medium rounded-md" >
                {t('common.add', 'Ajouter')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingLaborer && (
        <div className="modal-overlay overflow-y-auto">
          <div className="modal-panel p-6 max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('dayLaborers.modal.editTitle', "Modifier l'Ouvrier")}
              </h3>
              <Button
                type="button"
                onClick={() => setEditingLaborer(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('common.firstName', 'Prénom')} htmlFor="dl_edit_first_name" required>
                  <Input
                    id="dl_edit_first_name"
                    type="text"
                    value={editingLaborer.first_name}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      first_name: e.target.value
                    })}
                    required
                  />
                </FormField>
                <FormField label={t('common.lastName', 'Nom')} htmlFor="dl_edit_last_name" required>
                  <Input
                    id="dl_edit_last_name"
                    type="text"
                    value={editingLaborer.last_name}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      last_name: e.target.value
                    })}
                    required
                  />
                </FormField>
              </div>

              <div>
                <FormField label={t('dayLaborers.fields.cin', 'CIN')} htmlFor="dl_edit_cin" required>
                  <Input
                    id="dl_edit_cin"
                    type="text"
                    value={editingLaborer.cin}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      cin: e.target.value
                    })}
                    required
                  />
                </FormField>
              </div>

              <div>
                <FormField label={t('common.phone', 'Téléphone')} htmlFor="dl_edit_phone">
                  <Input
                    id="dl_edit_phone"
                    type="tel"
                    value={editingLaborer.phone}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      phone: e.target.value
                    })}
                  />
                </FormField>
              </div>

              <div>
                <FormField label={t('common.address', 'Adresse')} htmlFor="dl_edit_address">
                  <Input
                    id="dl_edit_address"
                    type="text"
                    value={editingLaborer.address}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      address: e.target.value
                    })}
                  />
                </FormField>
              </div>

              <div>
                <FormField label={t('dayLaborers.fields.paymentType', 'Type de paiement')} htmlFor="dl_edit_payment_type" required>
                  <Select
                    id="dl_edit_payment_type"
                    value={editingLaborer.payment_type}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      payment_type: (e.target as HTMLSelectElement).value as 'daily' | 'task' | 'unit'
                    })}
                    required
                  >
                    <option value="daily">{t('dayLaborers.paymentType.daily', 'Journalier')}</option>
                    <option value="task">{t('dayLaborers.paymentType.task', 'Par tâche')}</option>
                    <option value="unit">{t('dayLaborers.paymentType.unit', 'Par unité')}</option>
                  </Select>
                </FormField>
              </div>

              {editingLaborer.payment_type === 'daily' && (
                 <FormField label={t('dayLaborers.fields.dailyRateWithCurrency', { defaultValue: 'Taux journalier ({{currency}})', currency })} htmlFor="dl_edit_daily_rate" required>
                  <Input
                    id="dl_edit_daily_rate"
                    type="number"
                    value={editingLaborer.daily_rate}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      daily_rate: Number(e.target.value)
                    })}
                     placeholder={t('dayLaborers.fields.dailyRatePlaceholder', { defaultValue: 'Taux journalier en {{currency}}', currency })}
                    required
                  />
                </FormField>
              )}

              {editingLaborer.payment_type === 'task' && (
                 <FormField label={t('dayLaborers.fields.taskRateWithCurrency', { defaultValue: 'Taux par tâche ({{currency}})', currency })} htmlFor="dl_edit_task_rate" required>
                  <Input
                    id="dl_edit_task_rate"
                    type="number"
                    value={editingLaborer.task_rate || ''}
                    onChange={(e) => setEditingLaborer({
                      ...editingLaborer,
                      task_rate: Number(e.target.value)
                    })}
                     placeholder={t('dayLaborers.fields.taskRatePlaceholder', { defaultValue: 'Taux par tâche en {{currency}}', currency })}
                    required
                  />
                </FormField>
              )}

              {editingLaborer.payment_type === 'unit' && (
                <>
                   <FormField label={t('dayLaborers.fields.unitType', "Type d'unité")} htmlFor="dl_edit_unit_type" required>
                    <Input
                      id="dl_edit_unit_type"
                      type="text"
                      value={editingLaborer.unit_type || ''}
                      onChange={(e) => setEditingLaborer({
                        ...editingLaborer,
                        unit_type: e.target.value
                      })}
                       placeholder={t('dayLaborers.fields.unitTypePlaceholder', 'Ex: kg, caisse, arbre...')}
                      required
                    />
                  </FormField>
                   <FormField label={t('dayLaborers.fields.unitRateWithCurrency', { defaultValue: 'Taux par unité ({{currency}})', currency })} htmlFor="dl_edit_unit_rate" required>
                    <Input
                      id="dl_edit_unit_rate"
                      type="number"
                      value={editingLaborer.unit_rate || ''}
                      onChange={(e) => setEditingLaborer({
                        ...editingLaborer,
                        unit_rate: Number(e.target.value)
                      })}
                       placeholder={t('dayLaborers.fields.unitRatePlaceholder', { defaultValue: 'Taux par unité en {{currency}}', currency })}
                      required
                    />
                  </FormField>
                </>
              )}

              {renderSpecialtiesSelect()}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                type="button"
                onClick={() => setEditingLaborer(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                {t('common.cancel', 'Annuler')}
              </Button>
              <Button variant="green"
                type="button"
                onClick={() => handleUpdateLaborer(editingLaborer)}
                className="px-4 py-2 text-sm font-medium rounded-md"
              >
                {t('common.save', 'Enregistrer')}
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
};

export default DayLaborerManagement;
