import React, { useState } from 'react';
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
} from 'lucide-react';
import { useWorkers, useDeactivateWorker, useDeleteWorker } from '../../hooks/useWorkers';
import { getWorkerTypeLabel, getCompensationDisplay } from '../../types/workers';
import type { Worker, WorkerType } from '../../types/workers';
import WorkerForm from './WorkerForm';
import { Can } from '../authorization/Can';
import { useCan } from '../../lib/casl/AbilityContext';

interface WorkersListProps {
  organizationId: string;
  farms: Array<{ id: string; name: string }>;
}

const WorkersList: React.FC<WorkersListProps> = ({ organizationId, farms }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<WorkerType | 'all'>('all');
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');
  const [selectedFarm, setSelectedFarm] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

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

    return matchesSearch && matchesType && matchesActive && matchesFarm;
  });

  const handleEdit = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowForm(true);
  };

  const handleDeactivate = async (workerId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir désactiver ce travailleur?')) {
      try {
        await deactivateWorker.mutateAsync({ workerId });
      } catch (error) {
        console.error('Error deactivating worker:', error);
      }
    }
  };

  const handleDelete = async (workerId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement ce travailleur? Cette action est irréversible.')) {
      try {
        await deleteWorker.mutateAsync(workerId);
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Gestion du Personnel
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez vos salariés, ouvriers et travailleurs en métayage
          </p>
        </div>
        <Can
          I="create"
          a="Worker"
          fallback={
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed">
              <Lock className="w-5 h-5" />
              <span>Accès restreint</span>
            </div>
          }
        >
          <button
            onClick={() => {
              setSelectedWorker(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter un travailleur</span>
          </button>
        </Can>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{workers.length}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Salariés fixes</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {workers.filter(w => w.worker_type === 'fixed_salary').length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">Ouvriers journaliers</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {workers.filter(w => w.worker_type === 'daily_worker').length}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Métayage</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {workers.filter(w => w.worker_type === 'metayage').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as WorkerType | 'all')}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none"
            >
              <option value="all">Tous les types</option>
              <option value="fixed_salary">Salariés fixes</option>
              <option value="daily_worker">Ouvriers journaliers</option>
              <option value="metayage">Métayage</option>
            </select>
          </div>

          {/* Farm Filter */}
          <div>
            <select
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Toutes les fermes</option>
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Tous</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workers Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement...</span>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Aucun travailleur trouvé</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Travailleur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rémunération
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ferme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    CNSS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredWorkers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {worker.first_name} {worker.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {worker.position || 'Non spécifié'}
                        </p>
                        {worker.cin && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            CIN: {worker.cin}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getWorkerTypeColor(worker.worker_type)}`}>
                        {getWorkerTypeLabel(worker.worker_type, 'fr')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {getCompensationDisplay(worker)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {worker.farm_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {worker.is_cnss_declared ? (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Déclaré</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs">Non déclaré</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {worker.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 rounded-full">
                          <UserX className="w-3 h-3" />
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Can I="update" a="Worker">
                          <button
                            onClick={() => handleEdit(worker)}
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </Can>
                        {worker.is_active && (
                          <Can I="deactivate" a="Worker">
                            <button
                              onClick={() => handleDeactivate(worker.id)}
                              className="p-1 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
                              title="Désactiver"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </Can>
                        )}
                        <Can I="delete" a="Worker">
                          <button
                            onClick={() => handleDelete(worker.id)}
                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Can>
                        {!can('update', 'Worker') && !can('delete', 'Worker') && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Vue seule
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
      )}

      {/* Worker Form Modal */}
      {showForm && (
        <WorkerForm
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
      )}
    </div>
  );
};

export default WorkersList;
