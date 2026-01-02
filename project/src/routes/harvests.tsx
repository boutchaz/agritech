import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { MobileNavBar } from '../components/MobileNavBar';
import { Package, Plus, Filter, Download, Building2 } from 'lucide-react';
import { useHarvests, useHarvestStatistics, useDeleteHarvest } from '../hooks/useHarvests';
import { useFarms } from '../hooks/useParcelsQuery';
import HarvestForm from '../components/Harvests/HarvestForm';
import HarvestCard from '../components/Harvests/HarvestCard';
import HarvestDetailsModal from '../components/Harvests/HarvestDetailsModal';
import HarvestStatistics from '../components/Harvests/HarvestStatistics';
import type { Module } from '../types';
import type { HarvestSummary, HarvestFilters } from '../types/harvests';
import { format } from 'date-fns';
import { useSidebarMargin } from '../hooks/useSidebarLayout';

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
  const { t } = useTranslation();
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
  const [searchQuery, setSearchQuery] = useState('');
  const { style: sidebarStyle } = useSidebarMargin();
  const navigate = useNavigate();

  // Data fetching
  const { data: harvests = [], isLoading } = useHarvests(currentOrganization?.id || '', filters);
  const { data: statistics } = useHarvestStatistics(currentOrganization?.id || '');
  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const deleteHarvestMutation = useDeleteHarvest();

  // Filter harvests by search query
  const filteredHarvests = useMemo(() => {
    if (!searchQuery) return harvests;
    const query = searchQuery.toLowerCase();
    return harvests.filter(harvest =>
      harvest.crop_name?.toLowerCase().includes(query) ||
      harvest.parcel_name?.toLowerCase().includes(query) ||
      harvest.farm_name?.toLowerCase().includes(query)
    );
  }, [harvests, searchQuery]);

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
    if (!confirm(t('harvests.deleteConfirm'))) return;

    try {
      await deleteHarvestMutation.mutateAsync({
        harvestId,
        organizationId: currentOrganization?.id || ''
      });
    } catch (error) {
      console.error('Error deleting harvest:', error);
      alert(t('harvests.deleteError'));
    }
  };

  const handleFormClose = () => {
    setShowAddForm(false);
    setEditingHarvest(null);
  };

  const handleViewDetails = (harvestId: string) => {
    setSelectedHarvest(harvestId);
  };

  const handleCreateReception = (harvest: HarvestSummary) => {
    navigate({
      to: '/reception-batches',
      search: { harvest_id: harvest.id }
    });
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('harvests.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar with mobile menu support */}
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
      />

      <main className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-all duration-300 ease-in-out" style={sidebarStyle}>
        {/* Mobile Navigation Bar */}
        <MobileNavBar title={t('harvests.title')} />

        {/* Desktop Header */}
        <div className="hidden md:block">
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
              { icon: Package, label: t('harvests.title'), isActive: true }
            ]}
            title={t('harvests.title')}
            subtitle={t('harvests.harvestsCount', { count: filteredHarvests.length })}
            showSearch={true}
            searchPlaceholder={t('harvests.searchPlaceholder')}
            onSearch={setSearchQuery}
            actions={
              <div className="flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 w-full sm:w-auto"
                >
                  <Filter className="h-4 w-4" />
                  {t('harvests.filters')}
                </button>

                <button
                  onClick={exportToCSV}
                  disabled={harvests.length === 0}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  {t('harvests.export')}
                </button>

                <button
                  data-tour="harvest-add"
                  onClick={handleAddHarvest}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  {t('harvests.newHarvest')}
                </button>
              </div>
            }
          />
        </div>

        <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 space-y-6">
          {/* Mobile Add Button - Only visible on mobile */}
          <div className="md:hidden">
            <button
              onClick={handleAddHarvest}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md font-medium"
            >
              <Plus className="h-5 w-5" />
              {t('harvests.newHarvest')}
            </button>
          </div>

          {/* Statistics */}
          {statistics && <div data-tour="harvest-stats"><HarvestStatistics statistics={statistics} /></div>}

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4" data-tour="harvest-filters">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('harvests.filters')}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('harvests.filterLabels.farm')}
                  </label>
                  <select
                    value={filters.farm_id || ''}
                    onChange={(e) => setFilters({ ...filters, farm_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{t('harvests.filterLabels.allFarms')}</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('harvests.filterLabels.status')}
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{t('harvests.filterLabels.allStatuses')}</option>
                    <option value="stored">{t('harvests.statuses.stored')}</option>
                    <option value="in_delivery">{t('harvests.statuses.in_delivery')}</option>
                    <option value="delivered">{t('harvests.statuses.delivered')}</option>
                    <option value="sold">{t('harvests.statuses.sold')}</option>
                    <option value="spoiled">{t('harvests.statuses.spoiled')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('harvests.filterLabels.startDate')}
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
                    {t('harvests.filterLabels.endDate')}
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
                  {t('harvests.filterLabels.reset')}
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
          ) : filteredHarvests.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery ? t('harvests.noResults') : t('harvests.noHarvests')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery ? t('harvests.emptyState.modifySearch') : t('harvests.emptyState.startFirst')}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleAddHarvest}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <Plus className="h-4 w-4" />
                  {t('harvests.newHarvest')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-tour="harvest-list">
              {filteredHarvests.map(harvest => (
                <HarvestCard
                  key={harvest.id}
                  harvest={harvest}
                  onEdit={handleEditHarvest}
                  onDelete={handleDeleteHarvest}
                  onViewDetails={handleViewDetails}
                  onCreateReception={handleCreateReception}
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
