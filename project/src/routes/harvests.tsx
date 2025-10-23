import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import { Package, Plus, Filter, Download, Calendar, TrendingUp, Building2 } from 'lucide-react';
import { useHarvests, useHarvestStatistics, useDeleteHarvest } from '../hooks/useHarvests';
import { useFarms } from '../hooks/useParcelsQuery';
import HarvestForm from '../components/Harvests/HarvestForm';
import HarvestCard from '../components/Harvests/HarvestCard';
import HarvestDetailsModal from '../components/Harvests/HarvestDetailsModal';
import HarvestStatistics from '../components/Harvests/HarvestStatistics';
import type { Module } from '../types';
import type { HarvestSummary, HarvestFilters } from '../types/harvests';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const mockModules: Module[] = [
  {
    id: 'harvests',
    name: 'Récoltes',
    icon: 'Package',
    active: true,
    category: 'agriculture',
    description: 'Gestion des récoltes',
    metrics: []
  }
];

function HarvestsPage() {
  const { currentOrganization } = useAuth();
  const [activeModule, setActiveModule] = useState('harvests');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules] = useState(mockModules);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<HarvestSummary | null>(null);
  const [selectedHarvest, setSelectedHarvest] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<HarvestFilters>({});

  // Data fetching
  const { data: harvests = [], isLoading } = useHarvests(currentOrganization?.id || '', filters);
  const { data: statistics } = useHarvestStatistics(currentOrganization?.id || '');
  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const deleteHarvestMutation = useDeleteHarvest();

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleAddHarvest = () => {
    setEditingHarvest(null);
    setShowAddForm(true);
  };

  const handleEditHarvest = (harvest: HarvestSummary) => {
    setEditingHarvest(harvest);
    setShowAddForm(true);
  };

  const handleDeleteHarvest = async (harvestId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette récolte ?')) return;

    try {
      await deleteHarvestMutation.mutateAsync(harvestId);
    } catch (error) {
      console.error('Error deleting harvest:', error);
      alert('Erreur lors de la suppression de la récolte');
    }
  };

  const handleFormClose = () => {
    setShowAddForm(false);
    setEditingHarvest(null);
  };

  const handleViewDetails = (harvestId: string) => {
    setSelectedHarvest(harvestId);
  };

  const exportToCSV = () => {
    if (harvests.length === 0) return;

    const headers = ['Date', 'Parcelle', 'Culture', 'Quantité', 'Unité', 'Qualité', 'Destination', 'Statut'];
    const rows = harvests.map(h => [
      format(new Date(h.harvest_date), 'dd/MM/yyyy'),
      h.parcel_name || '',
      h.crop_name || '',
      h.quantity,
      h.unit,
      h.quality_grade || '',
      h.intended_for || '',
      h.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recoltes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de l'organisation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
      />

      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <PageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: Package, label: 'Récoltes', isActive: true }
          ]}
        />

        <div className="p-6 space-y-6">
          {/* Statistics */}
          {statistics && <HarvestStatistics statistics={statistics} />}

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gestion des Récoltes
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {harvests.length} récolte{harvests.length !== 1 ? 's' : ''} enregistrée{harvests.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <Filter className="h-4 w-4" />
                Filtres
              </button>

              <button
                onClick={exportToCSV}
                disabled={harvests.length === 0}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                Exporter
              </button>

              <button
                onClick={handleAddHarvest}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Nouvelle Récolte
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Filtres</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ferme
                  </label>
                  <select
                    value={filters.farm_id || ''}
                    onChange={(e) => setFilters({ ...filters, farm_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Toutes les fermes</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Statut
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="stored">Stocké</option>
                    <option value="in_delivery">En livraison</option>
                    <option value="delivered">Livré</option>
                    <option value="sold">Vendu</option>
                    <option value="spoiled">Gâté</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date début
                  </label>
                  <input
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setFilters({})}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          )}

          {/* Harvests List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-6 h-64"></div>
              ))}
            </div>
          ) : harvests.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucune récolte enregistrée
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Commencez par enregistrer votre première récolte
              </p>
              <button
                onClick={handleAddHarvest}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Nouvelle Récolte
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {harvests.map(harvest => (
                <HarvestCard
                  key={harvest.id}
                  harvest={harvest}
                  onEdit={handleEditHarvest}
                  onDelete={handleDeleteHarvest}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <HarvestForm
          harvest={editingHarvest}
          onClose={handleFormClose}
        />
      )}

      {/* Details Modal */}
      {selectedHarvest && (
        <HarvestDetailsModal
          harvestId={selectedHarvest}
          onClose={() => setSelectedHarvest(null)}
          onEdit={(harvest) => {
            setSelectedHarvest(null);
            handleEditHarvest(harvest);
          }}
        />
      )}
    </div>
  );
}

export const Route = createFileRoute('/harvests')({
  component: HarvestsPage,
});
