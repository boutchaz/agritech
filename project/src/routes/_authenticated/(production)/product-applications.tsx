import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProductApplications, useDeleteProductApplication } from '@/hooks/useProductApplications';
import { useFarms } from '@/hooks/useParcelsQuery';
import type { ProductApplication } from '@/lib/api/product-applications';
import { ApplicationFormDialog } from '@/components/parcels/ApplicationFormDialog';
import ModernPageHeader from '@/components/ModernPageHeader';
import { ProductionTabs } from '@/components/Production/ProductionTabs';
import { PageLoader } from '@/components/ui/loader';
import { SectionLoader } from '@/components/ui/loader';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  ListPageLayout,
  ListPageHeader,
  FilterBar,
  ResponsiveList,
  DataTablePagination,
  useServerTableState,
} from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Droplets,
  Plus,
  Building2,
  MapPin,
  Calendar,
  Scale,
  TrendingUp,
  MoreVertical,
  Eye,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withLicensedRouteProtection } from '@/components/authorization/withLicensedRouteProtection';
import { toast } from 'sonner';
import { format } from 'date-fns';

function ProductApplicationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  const [showForm, setShowForm] = useState(false);
  const [filterFarm, setFilterFarm] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<ProductApplication | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<ProductApplication | null>(null);

  const deleteMutation = useDeleteProductApplication();

  const { data: applications = [], isLoading, isError } = useProductApplications();
  const { data: farms = [] } = useFarms(organizationId);
  const farmsArray = Array.isArray(farms) ? farms : [];

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'application_date', direction: 'desc' },
  });

  // Client-side filtering + search + pagination
  const filtered = useMemo(() => {
    let result = [...applications];

    // Farm filter
    if (filterFarm !== 'all') {
      result = result.filter((app) => app.farm_id === filterFarm);
    }

    // Search
    if (tableState.search) {
      const q = tableState.search.toLowerCase();
      result = result.filter(
        (app) =>
          app.inventory?.name?.toLowerCase().includes(q) ||
          app.farm?.name?.toLowerCase().includes(q) ||
          app.parcel?.name?.toLowerCase().includes(q) ||
          app.notes?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [applications, filterFarm, tableState.search]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / tableState.pageSize);
  const paginatedItems = useMemo(() => {
    const start = (tableState.page - 1) * tableState.pageSize;
    return filtered.slice(start, start + tableState.pageSize);
  }, [filtered, tableState.page, tableState.pageSize]);

  // Stats
  const stats = useMemo(() => {
    if (!applications.length) return null;
    const totalArea = applications.reduce((sum, a) => sum + (a.area_treated || 0), 0);
    const totalCost = applications.reduce((sum, a) => sum + (a.cost || 0), 0);
    const uniqueProducts = new Set(applications.map((a) => a.product_id)).size;
    return {
      total: applications.length,
      totalArea: totalArea.toFixed(1),
      totalCost: totalCost.toFixed(0),
      uniqueProducts,
    };
  }, [applications]);

  // Resolve farm for the dialog — use filtered farm or first farm
  const dialogFarmId = filterFarm !== 'all' ? filterFarm : farmsArray[0]?.id || '';

  const handleDelete = async () => {
    if (!appToDelete) return;
    try {
      await deleteMutation.mutateAsync(appToDelete.id);
      toast.success(t('productApplications.deleteSuccess', 'Application supprimée avec succès'));
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error(error instanceof Error ? error.message : t('productApplications.deleteError', 'Erreur lors de la suppression'));
    } finally {
      setConfirmDeleteOpen(false);
      setAppToDelete(null);
    }
  };

  if (!currentOrganization) return <PageLoader />;

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          { icon: Droplets, label: t('productApplications.pageTitle', 'Applications de produits'), isActive: true },
        ]}
        title={t('productApplications.pageTitle', 'Applications de produits')}
        subtitle={t('productApplications.description', 'Suivez les traitements et l\'utilisation des produits phytosanitaires.')}
      />

      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ProductionTabs />
        <ListPageLayout
          header={
            <ListPageHeader
              variant="shell"
              actions={
                <Button
                  variant="green"
                  onClick={() => setShowForm(true)}
                  disabled={!dialogFarmId}
                  className="w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('productApplications.addApplication', 'Enregistrer une application')}
                </Button>
              }
            />
          }
          stats={stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {t('productApplications.stats.total', 'Total applications')}
                  </CardTitle>
                  <Droplets className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {t('productApplications.stats.area', 'Surface traitée')}
                  </CardTitle>
                  <MapPin className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalArea} {t('common.hectares', 'ha')}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {t('productApplications.stats.cost', 'Coût total')}
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCost} {currentOrganization.currency || t('common.mad', 'MAD')}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {t('productApplications.stats.products', 'Produits utilisés')}
                  </CardTitle>
                  <Scale className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.uniqueProducts}</div>
                </CardContent>
              </Card>
            </div>
          ) : undefined}
          filters={
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
              <div className="space-y-3">
                <FilterBar
                  searchValue={tableState.search}
                  onSearchChange={tableState.setSearch}
                  searchPlaceholder={t('productApplications.search', 'Rechercher par produit, ferme, parcelle...')}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select value={filterFarm} onValueChange={setFilterFarm}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('productApplications.allFarms', 'Toutes les fermes')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('productApplications.allFarms', 'Toutes les fermes')}</SelectItem>
                      {farmsArray.map((farm: { id: string; name: string }) => (
                        <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          }
          pagination={totalItems > tableState.pageSize ? (
            <DataTablePagination
              page={tableState.page}
              pageSize={tableState.pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={tableState.setPage}
              onPageSizeChange={tableState.setPageSize}
            />
          ) : undefined}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
            {isLoading ? (
              <SectionLoader />
            ) : isError ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-red-500">{t('common.error', 'An error occurred while loading data.')}</p>
              </div>
            ) : paginatedItems.length === 0 ? (
              <EmptyState
                variant="card"
                icon={Droplets}
                title={
                  tableState.search
                    ? t('productApplications.noResults', 'Aucun résultat')
                    : t('productApplications.noApplications', 'Aucune application enregistrée')
                }
                description={
                  tableState.search
                    ? t('productApplications.noResultsDescription', 'Essayez d\'ajuster vos critères de recherche.')
                    : t('productApplications.noApplicationsDescription', 'Enregistrez les traitements phytosanitaires appliqués sur vos parcelles pour un suivi complet.')
                }
                action={!tableState.search ? {
                  label: t('productApplications.addApplication', 'Enregistrer une application'),
                  onClick: () => setShowForm(true),
                } : undefined}
              />
            ) : (
              <ResponsiveList
                items={paginatedItems}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyIcon={Droplets}
                emptyTitle={t('productApplications.noApplications', 'Aucune application')}
                emptyMessage={t('productApplications.noApplicationsDescription', 'Aucune application enregistrée.')}
                className="p-3 lg:p-0"
                renderCard={(app: ProductApplication) => (
                  <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {app.inventory?.name || t('productApplications.unknownProduct', 'Produit')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(app.application_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                      {app.cost != null && app.cost > 0 && (
                        <Badge className="bg-orange-100 text-orange-800 shrink-0">
                          {app.cost} {app.currency || t('common.mad', 'MAD')}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">{t('productApplications.quantity', 'Quantité')}</p>
                        <p className="font-medium">{app.quantity_used} {app.inventory?.unit || ''}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('productApplications.area', 'Surface')}</p>
                        <p className="font-medium">{app.area_treated} {t('common.hectares', 'ha')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('productApplications.farm', 'Ferme')}</p>
                        <p className="font-medium truncate">{app.farm?.name || t('common.notAvailable', '—')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('productApplications.parcel', 'Parcelle')}</p>
                        <p className="font-medium truncate">{app.parcel?.name || t('common.notAvailable', '—')}</p>
                      </div>
                    </div>
                    {app.task && (
                      <button
                        onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: app.task!.id } })}
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span className="truncate">{app.task.title}</span>
                      </button>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      {app.notes ? (
                        <p className="text-xs text-gray-500 italic truncate flex-1">{app.notes}</p>
                      ) : <div />}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedApp(app)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.viewDetails', 'Voir détails')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { setAppToDelete(app); setConfirmDeleteOpen(true); }}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete', 'Supprimer')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
                renderTableHeader={
                  <TableRow>
                    <TableHead>{t('productApplications.product', 'Produit')}</TableHead>
                    <TableHead>{t('productApplications.date', 'Date')}</TableHead>
                    <TableHead>{t('productApplications.farm', 'Ferme')}</TableHead>
                    <TableHead>{t('productApplications.parcel', 'Parcelle')}</TableHead>
                    <TableHead>{t('productApplications.task', 'Tâche')}</TableHead>
                    <TableHead>{t('productApplications.quantity', 'Quantité')}</TableHead>
                    <TableHead>{t('productApplications.area', 'Surface')}</TableHead>
                    <TableHead>{t('productApplications.cost', 'Coût')}</TableHead>
                    <TableHead className="w-[60px]">{t('common.actionsColumn', 'Actions')}</TableHead>
                  </TableRow>
                }
                renderTable={(app: ProductApplication) => (
                  <>
                    <TableCell className="font-medium">
                      {app.inventory?.name || t('common.notAvailable', '—')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {format(new Date(app.application_date), 'dd/MM/yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>{app.farm?.name || t('common.notAvailable', '—')}</TableCell>
                    <TableCell>{app.parcel?.name || t('common.notAvailable', '—')}</TableCell>
                    <TableCell>
                      {app.task ? (
                        <button
                          onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: app.task!.id } })}
                          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px]">{app.task.title}</span>
                        </button>
                      ) : (
                        <span className="text-gray-400">{t('common.notAvailable', '—')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.quantity_used} {app.inventory?.unit || ''}
                    </TableCell>
                    <TableCell>{app.area_treated} {t('common.hectares', 'ha')}</TableCell>
                    <TableCell>
                      {app.cost != null && app.cost > 0
                        ? `${app.cost} ${app.currency || t('common.mad', 'MAD')}`
                        : t('common.notAvailable', '—')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedApp(app)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.viewDetails', 'Voir détails')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { setAppToDelete(app); setConfirmDeleteOpen(true); }}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete', 'Supprimer')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </>
                )}
              />
            )}
          </div>
        </ListPageLayout>
      </div>

      {dialogFarmId && (
        <ApplicationFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          farmId={dialogFarmId}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {/* Detail Dialog */}
      {selectedApp && createPortal(
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedApp(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedApp.inventory?.name || t('productApplications.unknownProduct', 'Produit')}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedApp(null)}>✕</Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">{t('productApplications.date', 'Date')}</p>
                <p className="font-medium">{format(new Date(selectedApp.application_date), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('productApplications.quantity', 'Quantité')}</p>
                <p className="font-medium">{selectedApp.quantity_used} {selectedApp.inventory?.unit || ''}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('productApplications.area', 'Surface')}</p>
                <p className="font-medium">{selectedApp.area_treated} {t('common.hectares', 'ha')}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('productApplications.cost', 'Coût')}</p>
                <p className="font-medium">
                  {selectedApp.cost != null && selectedApp.cost > 0
                    ? `${selectedApp.cost} ${selectedApp.currency || t('common.mad', 'MAD')}`
                    : t('common.notAvailable', '—')}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t('productApplications.farm', 'Ferme')}</p>
                <p className="font-medium">{selectedApp.farm?.name || t('common.notAvailable', '—')}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('productApplications.parcel', 'Parcelle')}</p>
                <p className="font-medium">{selectedApp.parcel?.name || t('common.notAvailable', '—')}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('productApplications.task', 'Tâche')}</p>
                {selectedApp.task ? (
                  <button
                    onClick={() => { setSelectedApp(null); navigate({ to: '/tasks/$taskId', params: { taskId: selectedApp.task!.id } }); }}
                    className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    {selectedApp.task.title}
                  </button>
                ) : (
                  <p className="font-medium text-gray-400">{t('common.notAvailable', '—')}</p>
                )}
              </div>
            </div>
            {selectedApp.notes && (
              <div>
                <p className="text-sm text-gray-500">{t('productApplications.notes', 'Notes')}</p>
                <p className="text-sm mt-1">{selectedApp.notes}</p>
              </div>
            )}
          </div>
        </div>
      , document.body)}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t('productApplications.confirmDeleteTitle', 'Supprimer cette application ?')}
        description={t(
          'productApplications.confirmDeleteDescription',
          'Cette action est irréversible. Le stock sera restauré et les écritures comptables seront supprimées.'
        )}
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/product-applications')({
  component: withLicensedRouteProtection(ProductApplicationsPage, 'read', 'Stock'),
});
