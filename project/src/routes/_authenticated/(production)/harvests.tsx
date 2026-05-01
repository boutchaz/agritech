import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';
import ModernPageHeader from '@/components/ModernPageHeader';
import { ProductionTabs } from '@/components/Production/ProductionTabs';

import { Package, Plus, Download, Building2, LayoutGrid, List } from 'lucide-react';
import { usePaginatedHarvests, useHarvests, useHarvestStatistics, useDeleteHarvest } from '@/hooks/useHarvests';
import { useFarms } from '@/hooks/useParcelsQuery';
import HarvestForm from '@/components/Harvests/HarvestForm';
import HarvestCard from '@/components/Harvests/HarvestCard';
import HarvestTable from '@/components/Harvests/HarvestTable';
import HarvestDetailsModal from '@/components/Harvests/HarvestDetailsModal';
import HarvestStatistics from '@/components/Harvests/HarvestStatistics';
import { PageLoader } from '@/components/ui/loader';
import type { HarvestSummary } from '@/types/harvests';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useServerTableState, DataTablePagination, FilterBar, ListPageLayout } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function HarvestsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  useAutoStartTour('harvests', 1500);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmAction: {title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void} = {title:"",onConfirm:()=>{}};

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<HarvestSummary | null>(null);
  const [selectedHarvest, setSelectedHarvest] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
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
  const { data: _farms = [] } = useFarms(currentOrganization?.id);
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
      toast.error(t('harvests.deleteError'));
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
    return <PageLoader />;
  }

  return (
    <>
      <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: Package, label: t('harvests.title'), isActive: true }
          ]}
          title={t('harvests.title')}
          subtitle={t('harvests.harvestsCount', { count: totalItems })}
          showSearch={true}
          searchPlaceholder={t('harvests.searchPlaceholder')}
          onSearch={(query) => tableState.setSearch(query)}
          actions={
            <div className="flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
              <Button
                onClick={exportToCSV}
                disabled={harvests.length === 0}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                {t('harvests.export')}
              </Button>

              <Button variant="green" data-tour="harvest-add" onClick={handleAddHarvest} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg w-full sm:w-auto" >
                <Plus className="h-4 w-4" />
                {t('harvests.newHarvest')}
              </Button>
            </div>
          }
        />

      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ProductionTabs />
        {/* Mobile Add Button - Only visible on mobile */}
        <div className="md:hidden">
          <Button variant="green" onClick={handleAddHarvest} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg shadow-md font-medium" >
            <Plus className="h-5 w-5" />
            {t('harvests.newHarvest')}
          </Button>
        </div>

        <ListPageLayout
          stats={statistics && <div data-tour="harvest-stats"><HarvestStatistics statistics={statistics} /></div>}
          filters={
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="flex-1" data-tour="harvest-filters">
                <FilterBar
                  searchValue={tableState.search}
                  onSearchChange={(value) => tableState.setSearch(value)}
                  searchPlaceholder={t('harvests.searchPlaceholder')}
                  isSearching={isFetching}
                  filters={[
                    {
                      key: 'status',
                      value: filterStatus,
                      onChange: setFilterStatus,
                      options: [
                        { value: 'all', label: t('harvests.filterLabels.allStatuses') },
                        { value: 'stored', label: t('harvests.statuses.stored') },
                        { value: 'in_delivery', label: t('harvests.statuses.in_delivery') },
                        { value: 'delivered', label: t('harvests.statuses.delivered') },
                        { value: 'sold', label: t('harvests.statuses.sold') },
                        { value: 'spoiled', label: t('harvests.statuses.spoiled') },
                      ],
                      placeholder: t('harvests.filterLabels.allStatuses'),
                    },
                  ]}
                  datePreset={tableState.datePreset}
                  onDatePresetChange={(preset) => {
                    if (preset !== 'custom') {
                      tableState.setDatePreset(preset);
                    }
                  }}
                />
              </div>

              <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden self-start xl:self-auto">
                <Button
                  variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="rounded-none border-r border-gray-300 dark:border-gray-600"
                  title={t('harvests.viewMode.card', 'Card view')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-none"
                  title={t('harvests.viewMode.table', 'Table view')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          }
          pagination={
            totalPages > 1 ? (
              <DataTablePagination
                page={tableState.page}
                pageSize={tableState.pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={tableState.setPage}
                onPageSizeChange={tableState.setPageSize}
              />
            ) : undefined
          }
        >
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(skIdx => (
                <div key={"sk-" + skIdx} className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-6 h-64"></div>
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
                <Button variant="green" onClick={handleAddHarvest} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg" >
                  <Plus className="h-4 w-4" />
                  {t('harvests.newHarvest')}
                </Button>
              )}
            </div>
          ) : viewMode === 'card' ? (
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
          ) : (
            <HarvestTable
              harvests={harvests}
              onEdit={handleEditHarvest}
              onDelete={handleDeleteHarvest}
              onViewDetails={handleViewDetails}
              onCreateReception={handleCreateReception}
            />
          )}
        </ListPageLayout>
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
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/harvests')({
  component: HarvestsPage,
});
