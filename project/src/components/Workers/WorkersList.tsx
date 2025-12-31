import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Plus,
  Search,
  Filter,
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
import { useWorkers, useDeactivateWorker, useDeleteWorker } from '../../hooks/useWorkers';
import { getCompensationDisplay } from '../../types/workers';
import type { Worker, WorkerType } from '../../types/workers';
import WorkerForm from './WorkerForm';
import WorkerPaymentDialog from './WorkerPaymentDialog';
import { Can } from '../authorization/Can';
import { useCan } from '../../lib/casl/AbilityContext';

interface WorkersListProps {
  organizationId: string;
  farms: Array<{ id: string; name: string }>;
}

const WorkersList: React.FC<WorkersListProps> = ({ organizationId, farms }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<WorkerType | 'all'>('all');
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');
  const [filterPlatformAccess, setFilterPlatformAccess] = useState<'all' | 'with' | 'without'>('all');
  const [selectedFarm, setSelectedFarm] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [workerToPay, setWorkerToPay] = useState<Worker | null>(null);

  const { data: workers = [], isLoading } = useWorkers(organizationId);
  const deactivateWorker = useDeactivateWorker();
  const deleteWorker = useDeleteWorker();
  const { can } = useCan();

  // Filter workers
  const filteredWorkers = workers.filter(worker => {
    const matchesSearch =
      worker.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.cin?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || worker.worker_type === filterType;
    const matchesActive = filterActive === 'all' || worker.is_active === filterActive;
    const matchesFarm = selectedFarm === 'all' || worker.farm_id === selectedFarm;
    const matchesPlatformAccess =
      filterPlatformAccess === 'all' ||
      (filterPlatformAccess === 'with' && !!worker.user_id) ||
      (filterPlatformAccess === 'without' && !worker.user_id);

    return matchesSearch && matchesType && matchesActive && matchesFarm && matchesPlatformAccess;
  });

  const handleEdit = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowForm(true);
  };

  const handlePayWorker = (worker: Worker) => {
    setWorkerToPay(worker);
    setShowPaymentDialog(true);
  };

  const handleDeactivate = async (workerId: string) => {
    if (window.confirm(t('workers.confirmations.deactivate'))) {
      try {
        await deactivateWorker.mutateAsync({ workerId, organizationId });
      } catch (error) {
        console.error('Error deactivating worker:', error);
      }
    }
  };

  const handleDelete = async (workerId: string) => {
    if (window.confirm(t('workers.confirmations.delete'))) {
      try {
        await deleteWorker.mutateAsync({ workerId, organizationId });
      } catch (error) {
        console.error('Error deleting worker:', error);
      }
    }
  };

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

  const getWorkerTypeLabel = (type: WorkerType) => {
    return t(`workers.workerTypes.${type}`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t('workers.list.title')}
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('workers.list.subtitle')}
          </p>
        </div>
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
          <button
            data-tour="worker-add"
            onClick={() => {
              setSelectedWorker(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{t('workers.list.addWorker')}</span>
          </button>
        </Can>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">{t('workers.stats.total')}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{workers.length}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-1">{t('workers.stats.fixedSalary')}</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
            {workers.filter(w => w.worker_type === 'fixed_salary').length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mb-1">{t('workers.stats.dailyWorkers')}</p>
          <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">
            {workers.filter(w => w.worker_type === 'daily_worker').length}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 mb-1">{t('workers.stats.sharecropping')}</p>
          <p className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
            {workers.filter(w => w.worker_type === 'metayage').length}
          </p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
          <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 mb-1">{t('workers.stats.platformAccess')}</p>
          <p className="text-xl sm:text-2xl font-bold text-indigo-900 dark:text-indigo-100">
            {workers.filter(w => w.user_id).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('workers.list.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as WorkerType | 'all')}
              className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none text-sm"
            >
              <option value="all">{t('workers.filters.allTypes')}</option>
              <option value="fixed_salary">{t('workers.filters.fixedSalary')}</option>
              <option value="daily_worker">{t('workers.filters.dailyWorker')}</option>
              <option value="metayage">{t('workers.filters.metayage')}</option>
            </select>
          </div>

          {/* Farm Filter */}
          <div>
            <select
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">{t('workers.filters.allFarms')}</option>
              {farms.map(farm => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter */}
          <div>
            <select
              value={filterActive === 'all' ? 'all' : filterActive.toString()}
              onChange={(e) => setFilterActive(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">{t('workers.filters.all')}</option>
              <option value="true">{t('workers.filters.active')}</option>
              <option value="false">{t('workers.filters.inactive')}</option>
            </select>
          </div>

          {/* Platform Access Filter */}
          <div>
            <select
              value={filterPlatformAccess}
              onChange={(e) => setFilterPlatformAccess(e.target.value as 'all' | 'with' | 'without')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">{t('workers.filters.allPlatformAccess')}</option>
              <option value="with">{t('workers.filters.withAccess')}</option>
              <option value="without">{t('workers.filters.withoutAccess')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workers List - Mobile Cards / Desktop Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">{t('workers.loading')}</span>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 sm:p-12 text-center">
          <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('workers.list.noWorkersFound')}</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="lg:hidden space-y-3" data-tour="worker-list">
            {filteredWorkers.map((worker) => (
              <div key={worker.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
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

                {/* Platform Access */}
                <div className="mb-3">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('workers.table.platformAccess')}</p>
                  {worker.user_id ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        {t('workers.table.enabled')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({t('workers.table.farmWorker')})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                        <ShieldOff className="w-3 h-3" />
                        {t('workers.table.notEnabled')}
                      </span>
                      {worker.email && (
                        <button
                          onClick={() => handleEdit(worker)}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                        >
                          {t('workers.table.activate')}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Can I="create" a="Payment">
                    <button
                      onClick={() => handlePayWorker(worker)}
                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                      title={t('workers.actions.paySalary')}
                    >
                      <Banknote className="w-4 h-4" />
                    </button>
                  </Can>
                  <Can I="update" a="Worker">
                    <button
                      onClick={() => handleEdit(worker)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      title={t('workers.actions.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </Can>
                  {worker.is_active && (
                    <Can I="deactivate" a="Worker">
                      <button
                        onClick={() => handleDeactivate(worker.id)}
                        className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
                        title={t('workers.actions.deactivate')}
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </Can>
                  )}
                  <Can I="delete" a="Worker">
                    <button
                      onClick={() => handleDelete(worker.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title={t('workers.actions.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Can>
                  {!can('update', 'Worker') && !can('delete', 'Worker') && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      {t('workers.table.viewOnly')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden" data-tour="worker-list">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('workers.table.worker')}
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('workers.table.type')}
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('workers.table.compensation')}
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('workers.table.farm')}
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('workers.table.cnss')}
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('workers.table.status')}
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('workers.table.platformAccess')}
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('workers.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredWorkers.map((worker) => (
                    <tr key={worker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 xl:px-6 py-4">
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
                      </td>
                      <td className="px-4 xl:px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getWorkerTypeColor(worker.worker_type)}`}>
                          {getWorkerTypeLabel(worker.worker_type)}
                        </span>
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {getCompensationDisplay(worker)}
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {worker.farm_name || '-'}
                      </td>
                      <td className="px-4 xl:px-6 py-4">
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
                      </td>
                      <td className="px-4 xl:px-6 py-4">
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
                      </td>
                      <td className="px-4 xl:px-6 py-4">
                        {worker.user_id ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 rounded-full">
                              <ShieldCheck className="w-3 h-3" />
                              {t('workers.table.enabled')}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({t('workers.table.farmWorker')})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                              <ShieldOff className="w-3 h-3" />
                              {t('workers.table.notEnabled')}
                            </span>
                            {worker.email && (
                              <button
                                onClick={() => handleEdit(worker)}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                                title={t('workers.actions.edit')}
                              >
                                {t('workers.table.activate')}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Can I="create" a="Payment">
                            <button
                              onClick={() => handlePayWorker(worker)}
                              className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                              title={t('workers.actions.paySalary')}
                            >
                              <Banknote className="w-4 h-4" />
                            </button>
                          </Can>
                          <Can I="update" a="Worker">
                            <button
                              onClick={() => handleEdit(worker)}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                              title={t('workers.actions.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </Can>
                          {worker.is_active && (
                            <Can I="deactivate" a="Worker">
                              <button
                                onClick={() => handleDeactivate(worker.id)}
                                className="p-1 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
                                title={t('workers.actions.deactivate')}
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            </Can>
                          )}
                          <Can I="delete" a="Worker">
                            <button
                              onClick={() => handleDelete(worker.id)}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                              title={t('workers.actions.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Can>
                          {!can('update', 'Worker') && !can('delete', 'Worker') && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              {t('workers.table.viewOnly')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Worker Form Modal */}
      <WorkerForm
        open={showForm}
        worker={selectedWorker}
        organizationId={organizationId}
        farms={farms}
        onClose={() => {
          setShowForm(false);
          setSelectedWorker(null);
        }}
        onSuccess={() => {
          setShowForm(false);
          setSelectedWorker(null);
        }}
      />

      {/* Worker Payment Dialog */}
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
            setShowPaymentDialog(false);
            setWorkerToPay(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkersList;
