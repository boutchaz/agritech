import { useMemo, useState } from 'react';
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useDeleteItem, useItemGroups, useItems, usePaginatedItems } from '@/hooks/useItems';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DataTablePagination,
  FilterBar,
  ListPageHeader,
  ListPageLayout,
  ResponsiveList,
  SortableHeader,
  useServerTableState,
} from '@/components/ui/data-table';
import { PageLoader } from '@/components/ui/loader';
import type { Item } from '@/types/items';
import {
  Box,
  Building2,
  DollarSign,
  Edit,
  Grid,
  LayoutTemplate,
  List,
  Package,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  TrendingUp,
} from 'lucide-react';

import { ModuleGate } from '@/components/authorization/ModuleGate';

function MarketplaceGuarded() {
  return (
    <ModuleGate>
      <MarketplacePage />
    </ModuleGate>
  );
}

export const Route = createFileRoute('/_authenticated/(misc)/marketplace')({
  component: MarketplaceGuarded,
});

type ViewMode = 'responsive' | 'grid' | 'list';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(amount);
}

function MarketplacePage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('responsive');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const tableState = useServerTableState({
    defaultPageSize: 12,
    defaultSort: { key: 'item_name', direction: 'asc' },
  });

  const isChildRoute = location.pathname !== '/marketplace' && location.pathname !== '/marketplace/';

  const paginatedQuery = useMemo(
    () => ({
      ...tableState.queryParams,
      is_sales_item: true,
      is_active: true,
      item_group_id: categoryFilter !== 'all' ? categoryFilter : undefined,
    }),
    [categoryFilter, tableState.queryParams],
  );

  const { data: paginatedData, isLoading, isFetching } = usePaginatedItems(paginatedQuery);
  const { data: allSalesItems = [] } = useItems({ is_sales_item: true, is_active: true });
  const { data: itemGroups = [] } = useItemGroups({ is_active: true });
  const deleteItemMutation = useDeleteItem();

  const salesItems = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;
  const hasActiveFilters = Boolean(tableState.search || categoryFilter !== 'all');

  const stats = useMemo(
    () => ({
      totalItems: allSalesItems.length,
      activeItems: allSalesItems.filter((item) => item.is_active).length,
      totalValue: allSalesItems.reduce((sum, item) => sum + (item.standard_rate || 0), 0),
      withImages: allSalesItems.filter((item) => item.image_url).length,
    }),
    [allSalesItems],
  );

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: t('marketplace.filters.allCategories', 'All categories') },
      ...itemGroups.map((group) => ({ value: group.id, label: group.name })),
    ],
    [itemGroups, t],
  );

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    tableState.setPage(1);
  };

  const handleDeleteItem = async (item: Item) => {
    const confirmed = window.confirm(
      t('marketplace.delete.confirm', 'Delete {{name}} from your catalog?', { name: item.item_name }),
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingItemId(item.id);
      await deleteItemMutation.mutateAsync(item.id);
      toast.success(t('marketplace.delete.success', 'Product deleted successfully'));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('marketplace.delete.error', 'Failed to delete product'),
      );
    } finally {
      setDeletingItemId(null);
    }
  };

  if (!currentOrganization) {
    return <PageLoader />;
  }

  if (isChildRoute) {
    return (
      <PageLayout
        activeModule="marketplace"
        header={
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
              { icon: ShoppingBag, label: t('marketplace.title', 'Marketplace'), path: '/marketplace' },
              { label: t('marketplace.quoteRequests', 'Quote Requests'), isActive: true },
            ]}
            title={t('marketplace.quoteRequests', 'Quote Requests')}
            subtitle={t('marketplace.quoteRequestsSubtitle', 'Manage your quote requests')}
          />
        }
      >
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      activeModule="marketplace"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: ShoppingBag, label: t('marketplace.title', 'Marketplace'), isActive: true },
          ]}
          title={t('marketplace.title', 'Marketplace')}
          subtitle={t('marketplace.subtitle', 'Manage your products available for sale')}
        />
      }
    >
      <div className="p-4 md:p-8">
        <ListPageLayout
          header={
            <ListPageHeader
              variant="shell"
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex border rounded-md overflow-hidden">
                    <Button
                      type="button"
                      variant={viewMode === 'responsive' ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => setViewMode('responsive')}
                      title={t('marketplace.viewModes.responsive', 'Responsive view')}
                    >
                      <LayoutTemplate className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                      title={t('marketplace.viewModes.grid', 'Grid view')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => setViewMode('list')}
                      title={t('marketplace.viewModes.list', 'List view')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/stock/items">
                      <Package className="mr-2 h-4 w-4" />
                      {t('marketplace.manageItems', 'Manage Items')}
                    </a>
                  </Button>
                </div>
              }
            />
          }
          filters={
            <FilterBar
              searchValue={tableState.search}
              onSearchChange={tableState.setSearch}
              searchPlaceholder={t('marketplace.search', 'Search products...')}
              isSearching={isFetching}
              filters={[
                {
                  key: 'category',
                  value: categoryFilter,
                  onChange: handleCategoryChange,
                  options: categoryOptions,
                  className: 'w-full sm:w-52',
                },
              ]}
            />
          }
          stats={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('marketplace.stats.totalProducts', 'Total Products')}
                  </CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalItems}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeItems} {t('marketplace.stats.active', 'active')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('marketplace.stats.catalogValue', 'Catalog Value')}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    {t('marketplace.stats.standardRates', 'Based on standard rates')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('marketplace.stats.withImages', 'With Images')}
                  </CardTitle>
                  <Box className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.withImages}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalItems > 0
                      ? `${Math.round((stats.withImages / stats.totalItems) * 100)}%`
                      : '0%'}{' '}
                    {t('marketplace.stats.coverage', 'coverage')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('marketplace.stats.readyToSell', 'Ready to Sell')}
                  </CardTitle>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeItems}</div>
                  <p className="text-xs text-muted-foreground">
                    {t('marketplace.stats.itemsAvailable', 'Items available for sale')}
                  </p>
                </CardContent>
              </Card>
            </div>
          }
          pagination={
            totalItems > 0 ? (
              <DataTablePagination
                page={tableState.page}
                totalPages={totalPages}
                pageSize={tableState.pageSize}
                totalItems={totalItems}
                onPageChange={tableState.setPage}
                onPageSizeChange={tableState.setPageSize}
                pageSizeOptions={[12, 24, 48, 96]}
              />
            ) : null
          }
        >
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t('marketplace.products.title', 'Sales Products')}</CardTitle>
                <CardDescription>
                  {t(
                    'marketplace.products.description',
                    'Items marked as sales items from your inventory',
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {viewMode === 'responsive' ? (
                  <ResponsiveList
                    items={salesItems}
                    isLoading={isLoading}
                    isFetching={isFetching}
                    keyExtractor={(item) => item.id}
                    renderCard={(item) => (
                      <ProductCard
                        item={item}
                        onDelete={handleDeleteItem}
                        isDeleting={deleteItemMutation.isPending && deletingItemId === item.id}
                      />
                    )}
                    renderTableHeader={
                      <tr>
                        <SortableHeader<Item>
                          label={t('marketplace.table.code', 'Code')}
                          sortKey="item_code"
                          currentSort={{
                            key: tableState.sortConfig.key as keyof Item | null,
                            direction: tableState.sortConfig.direction,
                          }}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <SortableHeader<Item>
                          label={t('marketplace.table.name', 'Name')}
                          sortKey="item_name"
                          currentSort={{
                            key: tableState.sortConfig.key as keyof Item | null,
                            direction: tableState.sortConfig.direction,
                          }}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <SortableHeader<Item>
                          label={t('marketplace.table.category', 'Category')}
                          sortKey="item_group_id"
                          currentSort={{
                            key: tableState.sortConfig.key as keyof Item | null,
                            direction: tableState.sortConfig.direction,
                          }}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <SortableHeader<Item>
                          label={t('marketplace.table.unit', 'Unit')}
                          sortKey="default_unit"
                          currentSort={{
                            key: tableState.sortConfig.key as keyof Item | null,
                            direction: tableState.sortConfig.direction,
                          }}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <SortableHeader<Item>
                          label={t('marketplace.table.rate', 'Rate')}
                          sortKey="standard_rate"
                          currentSort={{
                            key: tableState.sortConfig.key as keyof Item | null,
                            direction: tableState.sortConfig.direction,
                          }}
                          onSort={(key) => tableState.handleSort(String(key))}
                          align="right"
                        />
                        <SortableHeader<Item>
                          label={t('marketplace.table.status', 'Status')}
                          sortKey="is_active"
                          currentSort={{
                            key: tableState.sortConfig.key as keyof Item | null,
                            direction: tableState.sortConfig.direction,
                          }}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <th className="py-3 px-4 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                          {t('marketplace.table.actions', 'Actions')}
                        </th>
                      </tr>
                    }
                    renderTable={(item) => (
                      <ProductTableCells
                        item={item}
                        onDelete={handleDeleteItem}
                        isDeleting={deleteItemMutation.isPending && deletingItemId === item.id}
                      />
                    )}
                    emptyIcon={ShoppingBag}
                    emptyTitle={
                      hasActiveFilters
                        ? t('marketplace.noResults', 'No products found')
                        : t('marketplace.empty', 'No sales items yet')
                    }
                    emptyMessage={
                      hasActiveFilters
                        ? t('marketplace.tryDifferentSearch', 'Try a different search term')
                        : t(
                            'marketplace.emptyHint',
                            'Mark items as "Sales Item" in Stock > Items to display them here',
                          )
                    }
                    emptyAction={
                      hasActiveFilters
                        ? undefined
                        : {
                            label: t('marketplace.goToItems', 'Go to Items'),
                            onClick: () => {
                              window.location.href = '/stock/items';
                            },
                            variant: 'outline',
                          }
                    }
                  />
                ) : viewMode === 'grid' ? (
                  isLoading ? (
                    <PageLoader />
                  ) : salesItems.length === 0 ? (
                    <MarketplaceEmptyState hasActiveFilters={hasActiveFilters} />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {salesItems.map((item) => (
                        <ProductCard
                          key={item.id}
                          item={item}
                          onDelete={handleDeleteItem}
                          isDeleting={deleteItemMutation.isPending && deletingItemId === item.id}
                        />
                      ))}
                    </div>
                  )
                ) : isLoading ? (
                  <PageLoader />
                ) : salesItems.length === 0 ? (
                  <MarketplaceEmptyState hasActiveFilters={hasActiveFilters} />
                ) : (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <SortableHeader<Item>
                            label={t('marketplace.table.code', 'Code')}
                            sortKey="item_code"
                            currentSort={{
                              key: tableState.sortConfig.key as keyof Item | null,
                              direction: tableState.sortConfig.direction,
                            }}
                            onSort={(key) => tableState.handleSort(String(key))}
                          />
                          <SortableHeader<Item>
                            label={t('marketplace.table.name', 'Name')}
                            sortKey="item_name"
                            currentSort={{
                              key: tableState.sortConfig.key as keyof Item | null,
                              direction: tableState.sortConfig.direction,
                            }}
                            onSort={(key) => tableState.handleSort(String(key))}
                          />
                          <SortableHeader<Item>
                            label={t('marketplace.table.category', 'Category')}
                            sortKey="item_group_id"
                            currentSort={{
                              key: tableState.sortConfig.key as keyof Item | null,
                              direction: tableState.sortConfig.direction,
                            }}
                            onSort={(key) => tableState.handleSort(String(key))}
                          />
                          <SortableHeader<Item>
                            label={t('marketplace.table.unit', 'Unit')}
                            sortKey="default_unit"
                            currentSort={{
                              key: tableState.sortConfig.key as keyof Item | null,
                              direction: tableState.sortConfig.direction,
                            }}
                            onSort={(key) => tableState.handleSort(String(key))}
                          />
                          <SortableHeader<Item>
                            label={t('marketplace.table.rate', 'Rate')}
                            sortKey="standard_rate"
                            currentSort={{
                              key: tableState.sortConfig.key as keyof Item | null,
                              direction: tableState.sortConfig.direction,
                            }}
                            onSort={(key) => tableState.handleSort(String(key))}
                            align="right"
                          />
                          <SortableHeader<Item>
                            label={t('marketplace.table.status', 'Status')}
                            sortKey="is_active"
                            currentSort={{
                              key: tableState.sortConfig.key as keyof Item | null,
                              direction: tableState.sortConfig.direction,
                            }}
                            onSort={(key) => tableState.handleSort(String(key))}
                          />
                          <th className="py-3 px-4 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('marketplace.table.actions', 'Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {salesItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <ProductTableCells
                              item={item}
                              onDelete={handleDeleteItem}
                              isDeleting={deleteItemMutation.isPending && deletingItemId === item.id}
                            />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {t('marketplace.help.title', 'How to add products to marketplace')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        'marketplace.help.description',
                        'Go to Stock > Items and create or edit an item. Check the "Sales Item" checkbox to make it appear here. Set a standard rate to display the price.',
                      )}
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/stock/items">{t('marketplace.help.goToItems', 'Manage Items')}</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        </ListPageLayout>
      </div>
    </PageLayout>
  );
}

function MarketplaceEmptyState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="text-center py-10">
      <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
      <h3 className="mt-4 text-lg font-medium">
        {hasActiveFilters
          ? t('marketplace.noResults', 'No products found')
          : t('marketplace.empty', 'No sales items yet')}
      </h3>
      <p className="mt-2 text-muted-foreground">
        {hasActiveFilters
          ? t('marketplace.tryDifferentSearch', 'Try a different search term')
          : t(
              'marketplace.emptyHint',
              'Mark items as "Sales Item" in Stock > Items to display them here',
            )}
      </p>
      {!hasActiveFilters && (
        <Button className="mt-4" variant="outline" asChild>
          <a href="/stock/items">
            <Plus className="mr-2 h-4 w-4" />
            {t('marketplace.goToItems', 'Go to Items')}
          </a>
        </Button>
      )}
    </div>
  );
}

function ProductTableCells({
  item,
  onDelete,
  isDeleting,
}: {
  item: Item;
  onDelete: (item: Item) => void;
  isDeleting: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      <td className="py-3 px-4 font-mono text-sm text-gray-900 dark:text-white">{item.item_code}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {item.image_url ? (
            <img src={item.image_url} alt={item.item_name} className="h-10 w-10 rounded object-cover" />
          ) : (
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-gray-900 dark:text-white">{item.item_name}</div>
            {item.description && (
              <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
        {item.item_group?.name || t('marketplace.table.uncategorized', 'Uncategorized')}
      </td>
      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{item.default_unit}</td>
      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900 dark:text-white">
        {item.standard_rate ? formatCurrency(item.standard_rate) : t('marketplace.noPrice', 'No price set')}
      </td>
      <td className="py-3 px-4">
        <Badge variant={item.is_active ? 'default' : 'secondary'}>
          {item.is_active ? t('marketplace.active', 'Active') : t('marketplace.inactive', 'Inactive')}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" asChild>
            <a href={`/stock/items?edit=${item.id}`} aria-label={t('marketplace.actions.edit', 'Edit product')}>
              <Edit className="h-4 w-4" />
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item)}
            disabled={isDeleting}
            aria-label={t('marketplace.actions.delete', 'Delete product')}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </td>
    </>
  );
}

function ProductCard({
  item,
  onDelete,
  isDeleting,
}: {
  item: Item;
  onDelete: (item: Item) => void;
  isDeleting: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square relative bg-muted">
        {item.image_url ? (
          <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        {!item.is_active && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="secondary">{t('marketplace.inactive', 'Inactive')}</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{item.item_name}</h3>
              <p className="text-xs text-muted-foreground">{item.item_code}</p>
            </div>
            <Badge variant="outline">{item.item_group?.name || t('marketplace.table.uncategorized', 'Uncategorized')}</Badge>
          </div>
          {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Box className="h-4 w-4" />
              {item.default_unit}
            </div>
            {item.standard_rate ? (
              <div className="flex items-center gap-1 font-semibold text-primary">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(item.standard_rate)}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{t('marketplace.noPrice', 'No price set')}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" asChild>
            <a href={`/stock/items?edit=${item.id}`}>
              <Edit className="mr-2 h-4 w-4" />
              {t('marketplace.actions.edit', 'Edit')}
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDelete(item)}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('marketplace.actions.delete', 'Delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
