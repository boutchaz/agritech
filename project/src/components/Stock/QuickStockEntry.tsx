import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { useAuth } from '@/hooks/useAuth';
import { useCreateStockEntry } from '@/hooks/useStockEntries';
import { useBarcodeLookup } from '@/hooks/useBarcodeLookup';
import { useWarehouses } from '@/hooks/useWarehouses';
import { Barcode, Package, Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function QuickStockEntry() {
  const { t } = useTranslation('stock');
  const { t: tCommon } = useTranslation('common');
  const { currentOrganization } = useAuth();
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lastEntry, setLastEntry] = useState<string | null>(null);

  const { data: warehouses = [], isLoading: warehousesLoading, isError: warehousesError } = useWarehouses();

  const { data: foundItem, isLoading: isSearching } = useBarcodeLookup(barcode || null);
  const createEntry = useCreateStockEntry();

  const handleBarcodeSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!barcode || !warehouseId || !quantity || !currentOrganization?.id) return;
      if (!foundItem) return;

      createEntry.mutate(
        {
          organization_id: currentOrganization.id,
          entry_type: 'Material Receipt',
          entry_date: new Date().toISOString().split('T')[0],
          to_warehouse_id: warehouseId,
          notes: t('quickStockEntry.title', 'Quick Stock Entry'),
          items: [
            {
              item_id: foundItem.id,
              item_name: foundItem.item_name,
              quantity: parseFloat(quantity),
              unit: foundItem.default_unit || 'pcs',
              target_warehouse_id: warehouseId,
              variant_id: foundItem.variantId || undefined,
            },
          ],
        },
        {
          onSuccess: (entry) => {
            toast.success(t('quickStockEntry.success', 'Stock entry created'));
            setLastEntry(entry.entry_number);
            setBarcode('');
            setQuantity('');
          },
          onError: (error: Error) => {
            toast.error(`${t('quickStockEntry.error', 'Failed to create entry')}: ${error.message}`);
          },
        }
      );
    },
    [barcode, warehouseId, quantity, currentOrganization, foundItem, createEntry, t]
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('quickStockEntry.title', 'Quick Stock Entry')}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('quickStockEntry.subtitle', 'Fast stock entry for mobile devices')}
        </p>
      </div>

      <Card className="dark:border-gray-700">
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div>
            <label htmlFor="quick-warehouse" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              {t('quickStockEntry.warehouse', 'Warehouse')}
            </label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger id="quick-warehouse" className="min-h-[48px]">
                <SelectValue placeholder={t('quickStockEntry.selectWarehouse', 'Select warehouse')} />
              </SelectTrigger>
              <SelectContent>
                {warehousesLoading ? (
                  <SelectItem value="_loading" disabled>
                    {tCommon('app.loading', 'Loading...')}
                  </SelectItem>
                ) : warehousesError ? (
                  <SelectItem value="_error" disabled>
                    {t('common.error', 'An error occurred while loading data.')}
                  </SelectItem>
                ) : warehouses.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    {t('quickStockEntry.noWarehouses', 'No warehouses available')}
                  </SelectItem>
                ) : (
                  warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <form onSubmit={handleBarcodeSubmit} className="space-y-4">
            <div>
              <label htmlFor="quick-barcode" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                {t('quickStockEntry.barcode', 'Barcode / Scan')}
              </label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="quick-barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder={t('quickStockEntry.barcodePlaceholder', 'Scan or enter barcode...')}
                  className="pl-10 min-h-[48px] text-lg"
                  autoFocus
                />
              </div>
            </div>

            {barcode && (
              <div className="rounded-lg border p-3 dark:border-gray-700">
                {isSearching ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('quickStockEntry.scanPrompt', 'Searching...')}
                  </p>
                ) : foundItem ? (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {foundItem.item_name}
                    </span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                      {t('quickStockEntry.autoDetected', 'Auto-detected')}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {t('quickStockEntry.notFound', 'Item not found')}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="quick-quantity" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                {t('quickStockEntry.quantity', 'Quantity')}
              </label>
              <Input
                id="quick-quantity"
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={t('quickStockEntry.quantityPlaceholder', 'Enter quantity')}
                className="min-h-[48px] text-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={!barcode || !warehouseId || !quantity || !foundItem || createEntry.isPending}
              variant="green"
              className="w-full min-h-[48px] text-lg"
            >
              {createEntry.isPending ? (
                t('quickStockEntry.submitting', 'Adding...')
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  {t('quickStockEntry.submit', 'Add Stock')}
                </>
              )}
            </Button>
          </form>

          {lastEntry && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800 dark:text-green-300">
                {lastEntry}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
