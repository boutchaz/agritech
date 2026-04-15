import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Plus, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useParcelsByOrganization } from '@/hooks/useParcelsQuery';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { FilterBar, ResponsiveList, ListPageLayout } from '@/components/ui/data-table';
import { TableCell, TableHead } from '@/components/ui/table';

export const Route = createFileRoute('/_authenticated/(production)/orchards')({
  component: Orchards,
});

function Orchards() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;
  const [searchTerm, setSearchTerm] = useState('');

  // Use parcels with tree_type as orchards
  const { data: allParcels = [], isLoading } = useParcelsByOrganization(organizationId || undefined);
  const orchards = useMemo(() => allParcels.filter((p) => p.tree_type), [allParcels]);

  const filteredOrchards = useMemo(() => {
    if (!searchTerm.trim()) return orchards;
    const q = searchTerm.toLowerCase();
    return orchards?.filter(
      (o) =>
        o.name?.toLowerCase().includes(q) ||
        o.crop_category?.toLowerCase().includes(q) ||
        o.tree_variety?.toLowerCase().includes(q) ||
        o.notes?.toLowerCase().includes(q)
    );
  }, [orchards, searchTerm]);

  return (
    <ListPageLayout
      header={
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('orchards.title', 'Orchards')}
            </h1>
            <p className="text-muted-foreground">
              {t('orchards.description', 'Manage your fruit tree orchards')}
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('orchards.new', 'New Orchard')}
          </Button>
        </div>
      }
      filters={
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={t('orchards.searchPlaceholder', 'Search orchards...')}
        />
      }
    >
      <ResponsiveList
        items={filteredOrchards ?? []}
        isLoading={isLoading}
        keyExtractor={(orchard) => orchard.id}
        emptyIcon={TreePine}
        emptyMessage={t('orchards.noOrchards', 'No orchards yet')}
        emptyAction={{
          label: t('orchards.new', 'New Orchard'),
          onClick: () => {},
        }}
        renderCard={(orchard) => (
          <div className="p-4 border border-border rounded-lg hover:border-green-500 dark:hover:border-green-600 transition-colors bg-card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{orchard.name}</div>
                {orchard.crop_category && (
                  <Badge variant="secondary" className="mt-1">{orchard.crop_category}</Badge>
                )}
              </div>
            </div>
            {orchard.notes && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{orchard.notes}</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {orchard.planting_date && (
                <div>
                  <span className="text-muted-foreground">{t('orchards.plantingDate', 'Planting Date')}:</span>{' '}
                  {new Date(orchard.planting_date).toLocaleDateString()}
                </div>
              )}
              {orchard.expected_yield && (
                <div>
                  <span className="text-muted-foreground">{t('orchards.expectedYield', 'Expected Yield')}:</span>{' '}
                  {orchard.expected_yield} {orchard.yield_unit || 'kg'}
                </div>
              )}
              {orchard.expected_yield_per_tree && (
                <div>
                  <span className="text-muted-foreground">{t('orchards.yieldPerTree', 'Yield per Tree')}:</span>{' '}
                  {orchard.expected_yield_per_tree} kg
                </div>
              )}
              {orchard.spacing_between_trees && (
                <div>
                  <span className="text-muted-foreground">{t('orchards.spacing', 'Spacing')}:</span>{' '}
                  {orchard.spacing_between_trees} m
                </div>
              )}
              {orchard.tree_variety && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t('orchards.variety', 'Variety')}:</span>{' '}
                  {orchard.tree_variety}
                </div>
              )}
            </div>
          </div>
        )}
        renderTableHeader={
          <>
            <TableHead>{t('orchards.name', 'Name')}</TableHead>
            <TableHead>{t('orchards.category', 'Category')}</TableHead>
            <TableHead>{t('orchards.plantingDate', 'Planting Date')}</TableHead>
            <TableHead>{t('orchards.expectedYield', 'Expected Yield')}</TableHead>
            <TableHead>{t('orchards.variety', 'Variety')}</TableHead>
          </>
        }
        renderTable={(orchard) => (
          <>
            <TableCell className="font-medium">{orchard.name}</TableCell>
            <TableCell>
              {orchard.crop_category && <Badge variant="secondary">{orchard.crop_category}</Badge>}
            </TableCell>
            <TableCell>
              {orchard.planting_date
                ? new Date(orchard.planting_date).toLocaleDateString()
                : '-'}
            </TableCell>
            <TableCell>
              {orchard.expected_yield ? `${orchard.expected_yield} ${orchard.yield_unit || 'kg'}` : '-'}
            </TableCell>
            <TableCell>{orchard.tree_variety || '-'}</TableCell>
          </>
        )}
      />
    </ListPageLayout>
  );
}
