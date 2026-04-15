import { useTranslation } from 'react-i18next';
import {
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionLoader } from '@/components/ui/loader';
import { EmptyState } from '@/components/ui/empty-state';
import { ResponsiveList } from '@/components/ui/data-table';
import { useReorderSuggestions } from '@/hooks/useReorderSuggestions';
import { ShoppingCart, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ReorderSuggestions() {
  const { t } = useTranslation('stock');
  const { data: suggestions = [], isLoading, error } = useReorderSuggestions();

  const handleGeneratePO = () => {
    toast.info(t('reorderSuggestions.generatePOPending', 'Coming soon'));
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed dark:border-gray-700">
        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-gray-600 dark:text-gray-400">
          {t('reorderSuggestions.error', 'Failed to load reorder suggestions')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('reorderSuggestions.title', 'Reorder Suggestions')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('reorderSuggestions.subtitle', 'Items below reorder point')}
        </p>
      </div>

      {suggestions.length === 0 ? (
        <EmptyState
          variant="card"
          icon={ShoppingCart}
          title={t('reorderSuggestions.noSuggestions', 'No reorder suggestions')}
          description={t('reorderSuggestions.noSuggestionsHint', 'All items are above their reorder points')}
        />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
              {suggestions.length} {t('reorderSuggestions.subtitle', 'items below reorder point')}
            </Badge>
          </div>

          <ResponsiveList
            items={suggestions}
            isLoading={false}
            keyExtractor={(item) => item.itemId}
            emptyIcon={ShoppingCart}
            emptyMessage={t('reorderSuggestions.noSuggestions', 'No reorder suggestions')}
            renderCard={(suggestion) => (
              <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">
                      {suggestion.itemName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {suggestion.itemCode}
                    </p>
                  </div>
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {t('reorderSuggestions.shortfall', 'Shortfall')}: {suggestion.shortfall} {suggestion.unit}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      {t('reorderSuggestions.currentStock', 'Current Stock')}:
                    </span>{' '}
                    <span className="font-medium">{suggestion.currentStock} {suggestion.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      {t('reorderSuggestions.reorderPoint', 'Reorder Point')}:
                    </span>{' '}
                    <span className="font-medium">{suggestion.reorderPoint} {suggestion.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      {t('reorderSuggestions.suggestedQty', 'Suggested Order')}:
                    </span>{' '}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {suggestion.suggestedOrderQty} {suggestion.unit}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={handleGeneratePO}>
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    {t('reorderSuggestions.generatePO', 'Generate PO')}
                  </Button>
                </div>
              </div>
            )}
            renderTableHeader={
              <TableRow>
                <TableHead>{t('reorderSuggestions.itemCode', 'Item Code')}</TableHead>
                <TableHead>{t('reorderSuggestions.itemName', 'Item Name')}</TableHead>
                <TableHead>{t('reorderSuggestions.currentStock', 'Current Stock')}</TableHead>
                <TableHead>{t('reorderSuggestions.reorderPoint', 'Reorder Point')}</TableHead>
                <TableHead>{t('reorderSuggestions.shortfall', 'Shortfall')}</TableHead>
                <TableHead>{t('reorderSuggestions.suggestedQty', 'Suggested Order')}</TableHead>
                <TableHead className="text-right">{t('reorderSuggestions.generatePO', 'Generate PO')}</TableHead>
              </TableRow>
            }
            renderTable={(suggestion) => (
              <>
                <TableCell className="font-mono text-sm">{suggestion.itemCode}</TableCell>
                <TableCell className="font-medium">{suggestion.itemName}</TableCell>
                <TableCell>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {suggestion.currentStock} {suggestion.unit}
                  </span>
                </TableCell>
                <TableCell>{suggestion.reorderPoint} {suggestion.unit}</TableCell>
                <TableCell>
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    {suggestion.shortfall} {suggestion.unit}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                  {suggestion.suggestedOrderQty} {suggestion.unit}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={handleGeneratePO}>
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    {t('reorderSuggestions.generatePO', 'Generate PO')}
                  </Button>
                </TableCell>
              </>
            )}
          />
        </>
      )}
    </div>
  );
}
