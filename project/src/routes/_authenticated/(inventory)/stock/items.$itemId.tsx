import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLoader } from '@/components/ui/loader';
import FarmStockLevels from '@/components/Stock/FarmStockLevels';
import ItemFarmUsage from '@/components/Stock/ItemFarmUsage';
import { useItem } from '@/hooks/useItems';
import { useCurrency } from '@/hooks/useCurrency';

function ItemDetailsPage() {
  const { t } = useTranslation('stock');
  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const { itemId } = Route.useParams();
  const { data: item, isLoading } = useItem(itemId);

  if (isLoading) {
    return <SectionLoader />;
  }

  if (!item) {
    return (
      <EmptyState
        variant="card"
        icon={Package}
        title={t('items.noItemsTitle', 'Item not found')}
        description={t('items.noItemsFound', 'The selected item could not be found.')}
        action={{
          label: t('app.back', 'Back'),
          onClick: () => navigate({ to: '/stock/items' }),
          variant: 'outline',
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate({ to: '/stock/items' })}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('app.back', 'Back')}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{item.item_name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-gray-700 dark:text-gray-300">
          <div><span className="font-medium text-gray-900 dark:text-white">{t('items.itemCode')}:</span> {item.item_code}</div>
          <div><span className="font-medium text-gray-900 dark:text-white">{t('items.group')}:</span> {item.item_group?.name || '-'}</div>
          <div><span className="font-medium text-gray-900 dark:text-white">{t('items.defaultUnit')}:</span> {item.default_unit}</div>
          <div><span className="font-medium text-gray-900 dark:text-white">{t('items.standardRate')}:</span> {item.standard_rate ? formatCurrency(item.standard_rate) : '-'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('items.stockByFarm', 'Stock by Farm')}</CardTitle>
        </CardHeader>
        <CardContent>
          <FarmStockLevels item_id={item.id} showWarehouseDetails={true} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('items.farmUsage', 'Farm Usage')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemFarmUsage item_id={item.id} unit={item.default_unit} showDetails={true} />
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/items/$itemId')({
  component: ItemDetailsPage,
});
