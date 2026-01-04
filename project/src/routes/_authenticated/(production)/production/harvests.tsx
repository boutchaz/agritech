import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { MobileNavBar } from '@/components/MobileNavBar';
import { Package, Plus, Filter, Download, Building2, Loader2, Search } from 'lucide-react';
import { usePaginatedHarvests, useHarvests, useHarvestStatistics, useDeleteHarvest } from '@/hooks/useHarvests';
import { useFarms } from '@/hooks/useParcelsQuery';
import HarvestForm from '@/components/Harvests/HarvestForm';
import HarvestCard from '@/components/Harvests/HarvestCard';
import HarvestDetailsModal from '@/components/Harvests/HarvestDetailsModal';
import HarvestStatistics from '@/components/Harvests/HarvestStatistics';
import type { HarvestSummary } from '@/types/harvests';
import { format } from 'date-fns';
import { useServerTableState, DateRangeFilter, DataTablePagination } from '@/components/ui/data-table';

function HarvestsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<HarvestSummary | null>(null);
  const [selectedHarvest, setSelectedHarvest] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const navigate = useNavigate();

  const tableState = useServerTableState({
    defaultPageSize: 12,
    defaultSort: { key: 'harvest_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching } = usePaginatedHarvests(
    currentOrganization?.id || '',
    {
      ...tableState.queryParams,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    }
  );

  const { data: allHarvestsForExport = [] } = useHarvests(currentOrganization?.id || '', {});
  const { data: statistics } = useHarvestStatistics(currentOrganization?.id || '');
  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const deleteHarvestMutation = useDeleteHarvest();

  const harvests = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

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
    if (allHarvestsForExport.length === 0) return;

    const headers = ['Date', 'Parcelle', 'Culture', 'Quantité', 'Unité', 'Qualité', 'Destination', 'Statut'];
    const rows = allHarvestsForExport.map(h => [
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
    <PageLayout
      activeModule="harvests"
      header={
        <>
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
              subtitle={t('harvests.harvestsCount', { count: totalItems })}
              showSearch={true}
              searchPlaceholder={t('harvests.searchPlaceholder')}
              onSearch={(query) => tableState.setSearch(query)}
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
        </>
      }
    >

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

          {/* Search and Filters Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder={t('harvests.searchPlaceholder')}
                  value={tableState.search}
                  onChange={(e) => tableState.setSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {isFetching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              <DateRangeFilter
                value={tableState.datePreset}
                onChange={tableState.setDatePreset}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full sm:w-40"
              >
                <option value="all">{t('harvests.filterLabels.allStatuses')}</option>
                <option value="stored">{t('harvests.statuses.stored')}</option>
                <option value="in_delivery">{t('harvests.statuses.in_delivery')}</option>
                <option value="delivered">{t('harvests.statuses.delivered')}</option>
                <option value="sold">{t('harvests.statuses.sold')}</option>
                <option value="spoiled">{t('harvests.statuses.spoiled')}</option>
              </select>
            </div>
          </div>

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
                {tableState.search ? t('harvests.noResults') : t('harvests.noHarvests')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {tableState.search ? t('harvests.emptyState.modifySearch') : t('harvests.emptyState.startFirst')}
              </p>
              {!tableState.search && (
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-tour="harvest-list">
                {harvests.map(harvest => (
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

              {totalPages > 1 && (
                <div className="mt-6">
                  <DataTablePagination
                    page={tableState.page}
                    pageSize={tableState.pageSize}
                    totalItems={totalItems}
                    totalPages={totalPages}
                    onPageChange={tableState.setPage}
                    onPageSizeChange={tableState.setPageSize}
                  />
                </div>
              )}
            </>
          )}
        </div>

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
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/production/harvests')({
  component: HarvestsPage,
});
