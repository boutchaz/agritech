import { useState } from 'react';
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterBar } from '@/components/ui/data-table';
import {
  Plus,
  ShoppingBag,
  TrendingUp,
  Package,
  Grid,
  List,
  Edit,
  Tag,
  DollarSign,
  Box,
  Building2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { itemsApi } from '@/lib/api/items';
import type { Item } from '@/types/items';
import { PageLoader, SectionLoader } from '@/components/ui/loader';


export const Route = createFileRoute('/_authenticated/(misc)/marketplace')({
  component: MarketplacePage,
});

function MarketplacePage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/marketplace' && location.pathname !== '/marketplace/';

  // Fetch items marked as sales items
  const { data: salesItems = [], isLoading } = useQuery({
    queryKey: ['sales-items', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const items = await itemsApi.getAll(
        { is_sales_item: true, is_active: true },
        currentOrganization.id
      );
      return items;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Filter items by search query
  const filteredItems = salesItems.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const stats = {
    totalItems: salesItems.length,
    activeItems: salesItems.filter((item) => item.is_active).length,
    totalValue: salesItems.reduce(
      (sum, item) => sum + (item.standard_rate || 0),
      0
    ),
    withImages: salesItems.filter((item) => item.image_url).length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(amount);
  };

  if (!currentOrganization) {
    return (
      <PageLoader />
    );
  }

  // If we're on a child route, render the Outlet
  if (isChildRoute) {
    return (
      <PageLayout
        activeModule="marketplace"
        header={
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
              { icon: ShoppingBag, label: t('marketplace.title', 'Marketplace'), path: '/marketplace' },
              { label: t('marketplace.quoteRequests', 'Quote Requests'), isActive: true }
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
        <>
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
              { icon: ShoppingBag, label: t('marketplace.title', 'Marketplace'), isActive: true }
            ]}
            title={t('marketplace.title', 'Marketplace')}
            subtitle={t('marketplace.subtitle', 'Manage your products available for sale')}
          />
        </>
      }
    >
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t('marketplace.title', 'Marketplace')}
            </h2>
            <p className="text-muted-foreground">
              {t(
                'marketplace.subtitle',
                'Manage your products available for sale'
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/stock/items">
                <Package className="mr-2 h-4 w-4" />
                {t('marketplace.manageItems', 'Manage Items')}
              </a>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
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
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalValue)}
              </div>
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

        {/* Products Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>
                  {t('marketplace.products.title', 'Sales Products')}
                </CardTitle>
                <CardDescription>
                  {t(
                    'marketplace.products.description',
                    'Items marked as sales items from your inventory'
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex-1 md:w-64">
                  <FilterBar
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder={t('marketplace.search', 'Search products...')}
                  />
                </div>
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SectionLoader />
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">
                  {searchQuery
                    ? t('marketplace.noResults', 'No products found')
                    : t('marketplace.empty', 'No sales items yet')}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {searchQuery
                    ? t(
                        'marketplace.tryDifferentSearch',
                        'Try a different search term'
                      )
                    : t(
                        'marketplace.emptyHint',
                        'Mark items as "Sales Item" in Stock > Items to display them here'
                      )}
                </p>
                {!searchQuery && (
                  <Button className="mt-4" variant="outline" asChild>
                    <a href="/stock/items">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('marketplace.goToItems', 'Go to Items')}
                    </a>
                  </Button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('marketplace.table.code', 'Code')}</TableHead>
                      <TableHead>{t('marketplace.table.name', 'Name')}</TableHead>
                      <TableHead>{t('marketplace.table.unit', 'Unit')}</TableHead>
                      <TableHead className="text-right">
                        {t('marketplace.table.rate', 'Rate')}
                      </TableHead>
                      <TableHead>{t('marketplace.table.status', 'Status')}</TableHead>
                      <TableHead className="text-right">
                        {t('marketplace.table.actions', 'Actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          {item.item_code}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.item_name}
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{item.item_name}</div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.default_unit}</TableCell>
                        <TableCell className="text-right">
                          {item.standard_rate
                            ? formatCurrency(item.standard_rate)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.is_active ? 'default' : 'secondary'}
                          >
                            {item.is_active
                              ? t('marketplace.active', 'Active')
                              : t('marketplace.inactive', 'Inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`/stock/items?edit=${item.id}`}>
                              <Edit className="h-4 w-4" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
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
                    'Go to Stock > Items and create or edit an item. Check the "Sales Item" checkbox to make it appear here. Set a standard rate to display the price.'
                  )}
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="/stock/items">
                  {t('marketplace.help.goToItems', 'Manage Items')}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

// Product Card Component
function ProductCard({ item }: { item: Item }) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(amount);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square relative bg-muted">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.item_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        {!item.is_active && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="secondary">
              {t('marketplace.inactive', 'Inactive')}
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{item.item_name}</h3>
              <p className="text-xs text-muted-foreground">{item.item_code}</p>
            </div>
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}
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
              <span className="text-sm text-muted-foreground">
                {t('marketplace.noPrice', 'No price set')}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
