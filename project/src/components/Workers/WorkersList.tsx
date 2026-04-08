import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  UserX,
  Lock,
  ShieldCheck,
  ShieldOff,
  Banknote,
} from 'lucide-react';
import {
  useWorkers,
  usePaginatedWorkers,
  useDeactivateWorker,
  useDeleteWorker,
} from '../../hooks/useWorkers';
import { getCompensationDisplay } from '../../types/workers';
import type { Worker, WorkerType } from '../../types/workers';
import WorkerForm from './WorkerForm';
import WorkerPaymentDialog from './WorkerPaymentDialog';
import { Can } from '../authorization/Can';
import { useCan } from '../../lib/casl/AbilityContext';
import { Button } from '@/components/ui/button';
import {
  DataTablePagination,
  FilterBar,
  ListPageHeader,
  ListPageLayout,
  ResponsiveList,
  useServerTableState,
} from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface WorkersListProps {
  organizationId: string;
  farms: Array<{ id: string; name: string }>;
}

interface ConfirmActionState {
  title: string;
  description?: string;
  variant?: 'destructive' | 'default';
  onConfirm: () => Promise<void> | void;
}

const DEFAULT_CONFIRM_ACTION: ConfirmActionState = {
  title: '',
  onConfirm: () => {},
};

const WorkersList = ({ organizationId, farms }: WorkersListProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useCan();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState>(DEFAULT_CONFIRM_ACTION);
  const [filterType, setFilterType] = useState<WorkerType | 'all'>('all');
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');
  const [filterPlatformAccess, setFilterPlatformAccess] = useState<'all' | 'with' | 'without'>('all');
  const [selectedFarm, setSelectedFarm] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [workerToPay, setWorkerToPay] = useState<Worker | null>(null);

  const farmsArray = Array.isArray(farms) ? farms : [];
  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'last_name', direction: 'asc' },
  });

  const { data: workersData = [] } = useWorkers(organizationId);
  const allWorkers = workersData as Worker[];

  const { data: paginatedData, isLoading, isFetching } = usePaginatedWorkers(organizationId, {
    ...tableState.queryParams,
    workerType: filterType !== 'all' ? filterType : undefined,
    isActive: filterActive === 'all' ? undefined : filterActive,
    farmId: selectedFarm !== 'all' ? selectedFarm : undefined,
    platformAccess: filterPlatformAccess !== 'all' ? filterPlatformAccess : undefined,
  });

  const workers = (paginatedData?.data ?? []) as Worker[];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const deactivateWorker = useDeactivateWorker();
  const deleteWorker = useDeleteWorker();

  const filteredWorkersForStats = useMemo(() => {
    const normalizedSearch = tableState.search.trim().toLowerCase();

    return allWorkers.filter((worker) => {
      const matchesSearch = !normalizedSearch
        || worker.first_name.toLowerCase().includes(normalizedSearch)
        || worker.last_name.toLowerCase().includes(normalizedSearch)
        || worker.cin?.toLowerCase().includes(normalizedSearch);

      const matchesType = filterType === 'all' || worker.worker_type === filterType;
      const matchesActive = filterActive === 'all' || worker.is_active === filterActive;
      const matchesFarm = selectedFarm === 'all' || worker.farm_id === selectedFarm;
      const matchesPlatformAccess = filterPlatformAccess === 'all'
        || (filterPlatformAccess === 'with' && !!worker.user_id)
        || (filterPlatformAccess === 'without' && !worker.user_id);

      return matchesSearch && matchesType && matchesActive && matchesFarm && matchesPlatformAccess;
    });
  }, [allWorkers, filterActive, filterPlatformAccess, filterType, selectedFarm, tableState.search]);

  const stats = useMemo(() => ({
    total: paginatedData?.total ?? filteredWorkersForStats.length,
    fixedSalary: filteredWorkersForStats.filter((worker) => worker.worker_type === 'fixed_salary').length,
    dailyWorkers: filteredWorkersForStats.filter((worker) => worker.worker_type === 'daily_worker').length,
    sharecropping: filteredWorkersForStats.filter((worker) => worker.worker_type === 'metayage').length,
    platformAccess: filteredWorkersForStats.filter((worker) => !!worker.user_id).length,
  }), [filteredWorkersForStats, paginatedData?.total]);

  const getWorkerTypeColor = (type: WorkerType) => {
    switch (type) {
      case 'fixed_salary':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'daily_worker':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'metayage':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200';
    }
  };

  const getWorkerTypeLabel = (type: WorkerType) => t(`workers.workerTypes.${type}`);

  const openCreateForm = () => {
    setSelectedWorker(null);
    setShowForm(true);
  };

  const handleEdit = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowForm(true);
  };

  const handlePayWorker = (worker: Worker) => {
    setWorkerToPay(worker);
    setShowPaymentDialog(true);
  };

  const handleViewWorker = (workerId: string) => {
    navigate({ to: '/workers/$workerId', params: { workerId } });
  };

  const openConfirm = (action: ConfirmActionState) => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleDeactivate = (worker: Worker) => {
    openConfirm({
      title: t('workers.confirmations.deactivate'),
      variant: 'default',
      onConfirm: async () => {
        try {
          await deactivateWorker.mutateAsync({ workerId: worker.id, organizationId });
        } catch (error) {
          console.error('Error deactivating worker:', error);
        }
      },
    });
  };

  const handleDelete = (worker: Worker) => {
    openConfirm({
      title: t('workers.confirmations.delete'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteWorker.mutateAsync({ workerId: worker.id, organizationId });
        } catch (error) {
          console.error('Error deleting worker:', error);
        }
      },
    });
  };

  const handleStatusChange = (value: string) => {
    setFilterType((current) => (current === value ? 'all' : value as WorkerType));
    tableState.setPage(1);
  };

  const handleActiveFilterChange = (value: string) => {
    setFilterActive(value === 'all' ? 'all' : value === 'true');
    tableState.setPage(1);
  };

  const handleFarmChange = (value: string) => {
    setSelectedFarm(value);
    tableState.setPage(1);
  };

  const handlePlatformAccessChange = (value: string) => {
    setFilterPlatformAccess(value as 'all' | 'with' | 'without');
    tableState.setPage(1);
  };

  const renderWorkerCard = (worker: Worker) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow cursor-pointer hover:shadow-md transition-shadow">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => handleViewWorker(worker.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {worker.first_name} {worker.last_name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {worker.position || t('workers.table.notSpecified')}
            </p>
            {worker.cin && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                CIN: {worker.cin}
              </p>
            )}
          </div>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getWorkerTypeColor(worker.worker_type)}`}>
            {getWorkerTypeLabel(worker.worker_type)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">{t('workers.table.compensation')}</p>
            <p className="text-gray-900 dark:text-white">{getCompensationDisplay(worker)}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">{t('workers.table.farm')}</p>
            <p className="text-gray-900 dark:text-white">{worker.farm_name || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">{t('workers.table.cnss')}</p>
            {worker.is_cnss_declared ? (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs">{t('workers.table.declared')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-400">
                <XCircle className="w-3 h-3" />
                <span className="text-xs">{t('workers.table.notDeclared')}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">{t('workers.table.status')}</p>
            {worker.is_active ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 rounded-full">
                <CheckCircle className="w-3 h-3" />
                {t('workers.table.active')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 rounded-full">
                <UserX className="w-3 h-3" />
                {t('workers.table.inactive')}
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="mb-3">
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('workers.table.platformAccess')}</p>
        {worker.user_id ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              {t('workers.table.enabled')}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">({t('workers.table.farmWorker')})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
              <ShieldOff className="w-3 h-3" />
              {t('workers.table.notEnabled')}
            </span>
            {worker.email && (
              <Button
                type="button"
                onClick={() => handleEdit(worker)}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
              >
                {t('workers.table.activate')}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700 rtl:flex-row-reverse">
        <Can I="create" a="Payment">
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePayWorker(worker);
            }}
            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
            title={t('workers.actions.paySalary')}
          >
            <Banknote className="w-4 h-4" />
          </Button>
        </Can>
        <Can I="update" a="Worker">
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(worker);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
            title={t('workers.actions.edit')}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </Can>
        {worker.is_active && (
          <Can I="deactivate" a="Worker">
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeactivate(worker);
              }}
              className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
              title={t('workers.actions.deactivate')}
            >
              <UserX className="w-4 h-4" />
            </Button>
          </Can>
        )}
        <Can I="delete" a="Worker">
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(worker);
            }}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            title={t('workers.actions.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </Can>
        {!can('update', 'Worker') && !can('delete', 'Worker') && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {t('workers.table.viewOnly')}
          </span>
        )}
      </div>
    </div>
  );

  const renderWorkerTableCells = (worker: Worker) => (
    <>
      <td className="px-4 xl:px-6 py-4">
        <button type="button" className="w-full text-left" onClick={() => handleViewWorker(worker.id)}>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {worker.first_name} {worker.last_name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {worker.position || t('workers.table.notSpecified')}
            </p>
            {worker.cin && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                CIN: {worker.cin}
              </p>
            )}
          </div>
        </button>
      </td>
      <td className="px-4 xl:px-6 py-4">
        <button type="button" className="w-full text-left" onClick={() => handleViewWorker(worker.id)}>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getWorkerTypeColor(worker.worker_type)}`}>
            {getWorkerTypeLabel(worker.worker_type)}
          </span>
        </button>
      </td>
      <td className="px-4 xl:px-6 py-4 text-sm text-gray-900 dark:text-white">
        <button type="button" className="w-full text-left" onClick={() => handleViewWorker(worker.id)}>
          {getCompensationDisplay(worker)}
        </button>
      </td>
      <td className="px-4 xl:px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
        <button type="button" className="w-full text-left" onClick={() => handleViewWorker(worker.id)}>
          {worker.farm_name || '-'}
        </button>
      </td>
      <td className="px-4 xl:px-6 py-4">
        <button type="button" className="w-full text-left" onClick={() => handleViewWorker(worker.id)}>
          {worker.is_cnss_declared ? (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">{t('workers.table.declared')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-gray-400">
              <XCircle className="w-4 h-4" />
              <span className="text-xs">{t('workers.table.notDeclared')}</span>
            </div>
          )}
        </button>
      </td>
      <td className="px-4 xl:px-6 py-4">
        <button type="button" className="w-full text-left" onClick={() => handleViewWorker(worker.id)}>
          {worker.is_active ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 rounded-full">
              <CheckCircle className="w-3 h-3" />
              {t('workers.table.active')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 rounded-full">
              <UserX className="w-3 h-3" />
              {t('workers.table.inactive')}
            </span>
          )}
        </button>
      </td>
      <td className="px-4 xl:px-6 py-4">
        <div className="flex items-center gap-2">
          <button type="button" className="flex items-center gap-2 text-left" onClick={() => handleViewWorker(worker.id)}>
            {worker.user_id ? (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  {t('workers.table.enabled')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">({t('workers.table.farmWorker')})</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                <ShieldOff className="w-3 h-3" />
                {t('workers.table.notEnabled')}
              </span>
            )}
          </button>
          {!worker.user_id && worker.email && (
            <Button
              type="button"
              onClick={() => handleEdit(worker)}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
              title={t('workers.actions.edit')}
            >
              {t('workers.table.activate')}
            </Button>
          )}
        </div>
      </td>
      <td className="px-4 xl:px-6 py-4 text-end">
        <div className="flex items-center justify-end gap-1 rtl:flex-row-reverse">
          <Can I="create" a="Payment">
            <Button
              type="button"
              onClick={() => handlePayWorker(worker)}
              className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              title={t('workers.actions.paySalary')}
            >
              <Banknote className="w-4 h-4" />
            </Button>
          </Can>
          <Can I="update" a="Worker">
            <Button
              type="button"
              onClick={() => handleEdit(worker)}
              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              title={t('workers.actions.edit')}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </Can>
          {worker.is_active && (
            <Can I="deactivate" a="Worker">
              <Button
                type="button"
                onClick={() => handleDeactivate(worker)}
                className="p-1 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
                title={t('workers.actions.deactivate')}
              >
                <UserX className="w-4 h-4" />
              </Button>
            </Can>
          )}
          <Can I="delete" a="Worker">
            <Button
              type="button"
              onClick={() => handleDelete(worker)}
              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              title={t('workers.actions.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Can>
          {!can('update', 'Worker') && !can('delete', 'Worker') && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {t('workers.table.viewOnly')}
            </span>
          )}
        </div>
      </td>
    </>
  );

  return (
    <ListPageLayout
      header={
        <ListPageHeader
          title={t('workers.list.title')}
          subtitle={t('workers.list.subtitle')}
          icon={<Users className="h-5 w-5 shrink-0 text-blue-600 sm:h-6 sm:w-6" />}
          actions={
            <Can
              I="create"
              a="Worker"
              fallback={
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed text-sm">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{t('workers.list.restrictedAccess')}</span>
                </div>
              }
            >
              <Button
                variant="blue"
                data-tour="worker-add"
                onClick={openCreateForm}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{t('workers.list.addWorker')}</span>
              </Button>
            </Can>
          }
        />
      }
      stats={
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">{t('workers.stats.total')}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-1">{t('workers.stats.fixedSalary')}</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.fixedSalary}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mb-1">{t('workers.stats.dailyWorkers')}</p>
            <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">{stats.dailyWorkers}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 mb-1">{t('workers.stats.sharecropping')}</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.sharecropping}</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
            <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 mb-1">{t('workers.stats.platformAccess')}</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-900 dark:text-indigo-100">{stats.platformAccess}</p>
          </div>
        </div>
      }
      filters={
        <FilterBar
          searchValue={tableState.search}
          onSearchChange={tableState.setSearch}
          searchPlaceholder={t('workers.list.search')}
          isSearching={isFetching}
          statusFilters={[
            { value: 'fixed_salary', label: t('workers.filters.fixedSalary') },
            { value: 'daily_worker', label: t('workers.filters.dailyWorker') },
            { value: 'metayage', label: t('workers.filters.metayage') },
          ]}
          activeStatus={filterType}
          onStatusChange={handleStatusChange}
          filters={[
            {
              key: 'farm',
              value: selectedFarm,
              onChange: handleFarmChange,
              options: [
                { value: 'all', label: t('workers.filters.allFarms') },
                ...farmsArray.map((farm) => ({ value: farm.id, label: farm.name })),
              ],
              placeholder: t('workers.filters.allFarms'),
            },
            {
              key: 'active',
              value: filterActive === 'all' ? 'all' : String(filterActive),
              onChange: handleActiveFilterChange,
              options: [
                { value: 'all', label: t('workers.filters.all') },
                { value: 'true', label: t('workers.filters.active') },
                { value: 'false', label: t('workers.filters.inactive') },
              ],
              placeholder: t('workers.filters.all'),
            },
            {
              key: 'platformAccess',
              value: filterPlatformAccess,
              onChange: handlePlatformAccessChange,
              options: [
                { value: 'all', label: t('workers.filters.allPlatformAccess') },
                { value: 'with', label: t('workers.filters.withAccess') },
                { value: 'without', label: t('workers.filters.withoutAccess') },
              ],
              placeholder: t('workers.filters.allPlatformAccess'),
            },
          ]}
        />
      }
      pagination={
        <DataTablePagination
          page={tableState.page}
          totalPages={totalPages}
          pageSize={tableState.pageSize}
          totalItems={totalItems}
          onPageChange={tableState.setPage}
          onPageSizeChange={tableState.setPageSize}
        />
      }
    >
      <div data-tour="worker-list">
        <ResponsiveList
          items={workers}
          isLoading={isLoading}
          isFetching={isFetching}
          keyExtractor={(worker) => worker.id}
          renderCard={renderWorkerCard}
          renderTableHeader={(
            <tr>
              <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('workers.table.worker')}
              </th>
              <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('workers.table.type')}
              </th>
              <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('workers.table.compensation')}
              </th>
              <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('workers.table.farm')}
              </th>
              <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('workers.table.cnss')}
              </th>
              <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('workers.table.status')}
              </th>
              <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('workers.table.platformAccess')}
              </th>
              <th className="px-4 xl:px-6 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('workers.table.actions')}
              </th>
            </tr>
          )}
          renderTable={renderWorkerTableCells}
          emptyIcon={Users}
          emptyTitle={t('workers.list.noWorkersFound')}
          emptyMessage={t('workers.list.noWorkersFound')}
          emptyAction={can('create', 'Worker') ? {
            label: t('workers.list.addWorker'),
            onClick: openCreateForm,
          } : undefined}
        />
      </div>

      <WorkerForm
        open={showForm}
        worker={selectedWorker}
        organizationId={organizationId}
        farms={farmsArray}
        existingWorkers={allWorkers}
        onClose={() => {
          setShowForm(false);
          setSelectedWorker(null);
        }}
        onSuccess={() => {
          setShowForm(false);
          setSelectedWorker(null);
        }}
      />

      {workerToPay && (
        <WorkerPaymentDialog
          open={showPaymentDialog}
          worker={workerToPay}
          organizationId={organizationId}
          onClose={() => {
            setShowPaymentDialog(false);
            setWorkerToPay(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['worker-payments'] });
            queryClient.invalidateQueries({ queryKey: ['payments', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['payment-statistics', organizationId] });
            if (workerToPay?.id) {
              queryClient.invalidateQueries({ queryKey: ['worker-stats', organizationId, workerToPay.id] });
            }
            setShowPaymentDialog(false);
            setWorkerToPay(null);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={async () => {
          await confirmAction.onConfirm();
          setConfirmOpen(false);
          setConfirmAction(DEFAULT_CONFIRM_ACTION);
        }}
      />
    </ListPageLayout>
  );
};

export default WorkersList;
