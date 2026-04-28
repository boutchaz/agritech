import React, { useCallback, useState } from 'react';
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
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useWarehouses } from '@/hooks/useWarehouses';
import BarcodeScanField from '@/components/Stock/BarcodeScanField';
import type { ScanResult } from '@/types/barcode';
import { Package, Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function QuickStockEntry() {
  const { t } = useTranslation('stock');
  const { t: tCommon } = useTranslation('common');
  const { currentOrganization } = useAuth();
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [lastEntry, setLastEntry] = useState<string | null>(null);
  const [scannedItem, setScannedItem] = useState<ScanResult | null>(null);

  const { data: warehouses = [], isLoading: warehousesLoading, isError: warehousesError } = useWarehouses();
  const createEntry = useCreateStockEntry();

  const scanner = useBarcodeScanner({
    items: [],
    onItemFound: (result) => {
      setScannedItem(result);
      if (!quantity) setQuantity('1');
    },
    warehouseId,
  });

  const handleBarcodeSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!warehouseId || !quantity || !currentOrganization?.id || !scannedItem) return;

      createEntry.mutate(
        {
          organization_id: currentOrganization.id,
          entry_type: 'Material Receipt',
          entry_date: new Date().toISOString().split('T')[0],
          to_warehouse_id: warehouseId,
          notes: t('quickStockEntry.title', 'Quick Stock Entry'),
          items: [
            {
              item_id: scannedItem.item_id,
              item_name: scannedItem.item_name,
              quantity: parseFloat(quantity),
              unit: scannedItem.unit_name || 'pcs',
              target_warehouse_id: warehouseId,
              variant_id: scannedItem.variant_id || undefined,
              scanned_barcode: scannedItem.barcode,
            },
          ],
        },
        {
          onSuccess: (entry) => {
            toast.success(t('quickStockEntry.success', 'Stock entry created'));
            setLastEntry(entry.entry_number);
            setQuantity('');
            setScannedItem(null);
            scanner.setScanValue('');
          },
          onError: (error: Error) => {
            toast.error(`${t('quickStockEntry.error', 'Failed to create entry')}: ${error.message}`);
          },
        }
      );
    },
    [warehouseId, quantity, currentOrganization, scannedItem, createEntry, t, scanner]
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                {t('quickStockEntry.barcode', 'Barcode / Scan')}
              </label>
              <BarcodeScanField
                value={scanner.scanValue}
                onChange={scanner.setScanValue}
                onScan={scanner.handleScan}
                isScanning={scanner.isScanning}
                error={scanner.error}
                placeholder={t('quickStockEntry.barcodePlaceholder', 'Scan or enter barcode...')}
                className="min-h-[48px]"
              />
            </div>

            {scannedItem && (
              <div className="flex items-center gap-2 rounded-lg border p-3 dark:border-gray-700">
                <Package className="h-4 w-4 text-green-600" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {scannedItem.item_name}
                </span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                  {t('quickStockEntry.autoDetected', 'Auto-detected')}
                </Badge>
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
              disabled={!warehouseId || !quantity || !scannedItem || createEntry.isPending}
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
