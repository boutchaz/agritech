import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { stockEntriesApi } from '@/lib/api/stock';
import type { ItemSelectionOption } from '@/types/items';
import { itemsApi } from '@/lib/api/items';
import BarcodeScanField from '@/components/Stock/BarcodeScanField';
import type { ScanResult } from '@/types/barcode';
import { CheckCircle, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface StockTakeItem {
  item: ItemSelectionOption;
  systemQuantity: number;
  physicalQuantity: string;
  unit: string;
}

export default function StockTakeWizard() {
  const { t } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const [step, setStep] = useState(1);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<ItemSelectionOption[]>([]);
  const [stockTakeItems, setStockTakeItems] = useState<StockTakeItem[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization');
      const res = await fetch('/api/v1/warehouses', {
        credentials: 'include',
        headers: { 'X-Organization-Id': currentOrganization.id },
      });
      const data = await res.json();
      return (data.data || data || []) as Array<{ id: string; name: string }>;
    },
    enabled: !!currentOrganization?.id,
  });

  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items-selection', currentOrganization?.id, warehouseId],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return itemsApi.getForSelection({ is_stock_item: true }, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id && !!warehouseId,
  });

  const createEntry = useCreateStockEntry();

  const scanner = useBarcodeScanner({
    items: stockTakeItems.map((item) => ({ item_id: item.item.id, quantity: parseFloat(item.physicalQuantity) || 0 })),
    warehouseId,
    onItemFound: (result: ScanResult) => {
      const idx = stockTakeItems.findIndex((item) => item.item.id === result.item_id);
      if (idx >= 0) {
        const current = parseFloat(stockTakeItems[idx].physicalQuantity) || 0;
        updatePhysicalQty(idx, String(current + 1));
      }
    },
  });

  const toggleItem = (item: ItemSelectionOption) => {
    setSelectedItems((prev) =>
      prev.some((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === stockItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...stockItems]);
    }
  };

  const goToStep2 = async () => {
    const items: StockTakeItem[] = await Promise.all(
      selectedItems.map(async (item) => {
        try {
          if (!currentOrganization?.id || !warehouseId) {
            return { item, systemQuantity: 0, physicalQuantity: '', unit: item.default_unit || 'pcs' };
          }
          const sysQty = await stockEntriesApi.getSystemQuantity(
            item.id,
            warehouseId,
            undefined,
            currentOrganization.id,
          );
          return {
            item,
            systemQuantity: sysQty.quantity,
            physicalQuantity: '',
            unit: sysQty.unit || item.default_unit || 'pcs',
          };
        } catch {
          return { item, systemQuantity: 0, physicalQuantity: '', unit: item.default_unit || 'pcs' };
        }
      })
    );
    setStockTakeItems(items);
    setStep(2);
  };

  const updatePhysicalQty = (index: number, value: string) => {
    setStockTakeItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, physicalQuantity: value } : item))
    );
  };

  const itemsWithVariance = useMemo(
    () =>
      stockTakeItems.filter((item) => {
        const physical = parseFloat(item.physicalQuantity);
        return !isNaN(physical) && physical !== item.systemQuantity;
      }),
    [stockTakeItems]
  );

  const handleSubmit = async () => {
    if (!currentOrganization?.id || !warehouseId) return;

    try {
      await createEntry.mutateAsync({
        organization_id: currentOrganization.id,
        entry_type: 'Stock Reconciliation',
        entry_date: new Date().toISOString().split('T')[0],
        to_warehouse_id: warehouseId,
        notes: t('stockTake.title', 'Stock Take'),
        items: stockTakeItems.map((item) => {
          const physical = parseFloat(item.physicalQuantity) || 0;
          return {
            item_id: item.item.id,
            item_name: item.item.item_name,
            quantity: physical,
            unit: item.unit,
            target_warehouse_id: warehouseId,
            system_quantity: item.systemQuantity,
            physical_quantity: physical,
          };
        }),
      });
      toast.success(t('stockTake.successTitle', 'Stock take submitted'));
      setSubmitted(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(`${t('stockTake.errorSubmit', 'Failed to submit stock take')}: ${message}`);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed dark:border-gray-700">
        <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('stockTake.successTitle', 'Stock take submitted')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('stockTake.successDescription', 'Reconciliation entry has been created')}
        </p>
        <Button className="mt-4" onClick={() => { setSubmitted(false); setStep(1); setSelectedItems([]); setStockTakeItems([]); }}>
          {t('stockTake.title', 'New Stock Take')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('stockTake.title', 'Stock Take')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('stockTake.subtitle', 'Perform physical inventory count')}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
              s === step
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : s < step
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 text-xs font-bold">
              {s < step ? <CheckCircle className="w-4 h-4" /> : s}
            </span>
            <span className="hidden sm:inline">
              {t(`stockTake.step${s}`, `Step ${s}`)}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="dark:border-gray-700">
          <CardHeader>
            <CardTitle>{t('stockTake.step1', 'Select Warehouse & Items')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="warehouse-select" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                {t('stockTake.selectWarehouse', 'Select Warehouse')}
              </label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="warehouse-select">
                  <SelectValue placeholder={t('stockTake.selectWarehouse', 'Select Warehouse')} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {warehouseId && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('stockTake.selectItems', 'Select Items to Count')}
                  </p>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {t('stockTake.selectAll', 'Select All')}
                  </Button>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-2 dark:border-gray-700">
                  {stockItems.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                      {t('stockTake.noItems', 'No items found in this warehouse')}
                    </p>
                  ) : (
                    stockItems.map((item) => (
                      <label
                        key={item.id}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
                          selectedItems.some((i) => i.id === item.id) && 'bg-blue-50 dark:bg-blue-900/20'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.some((i) => i.id === item.id)}
                          onChange={() => toggleItem(item)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">{item.item_name}</span>
                        {item.item_code && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">({item.item_code})</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button
                onClick={goToStep2}
                disabled={!warehouseId || selectedItems.length === 0}
              >
                {t('stockTake.next', 'Next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="dark:border-gray-700">
          <CardHeader>
            <CardTitle>{t('stockTake.step2', 'Enter Physical Quantities')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                {t('barcode.scanPlaceholder', 'Scan or type barcode...')}
              </label>
              <BarcodeScanField
                value={scanner.scanValue}
                onChange={scanner.setScanValue}
                onScan={scanner.handleScan}
                isScanning={scanner.isScanning}
                error={scanner.error}
                autoFocus={false}
              />
            </div>
            <div className="space-y-3">
              {stockTakeItems.map((item, idx) => (
                <div
                  key={item.item.id}
                  className="flex items-center gap-4 p-3 border rounded-lg dark:border-gray-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {item.item.item_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('stockTake.systemQty', 'System Qty')}: {item.systemQuantity} {item.unit}
                    </p>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.physicalQuantity}
                      onChange={(e) => updatePhysicalQty(idx, e.target.value)}
                      placeholder={t('stockTake.physicalQty', 'Physical Qty')}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('stockTake.previous', 'Previous')}
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={stockTakeItems.some((item) => !item.physicalQuantity)}
              >
                {t('stockTake.next', 'Next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="dark:border-gray-700">
          <CardHeader>
            <CardTitle>{t('stockTake.step3', 'Review Variances')}</CardTitle>
            <CardDescription>
              {itemsWithVariance.length > 0
                ? t('stockTake.itemsWithVariance', '{{count}} item(s) with variance', { count: itemsWithVariance.length })
                : t('stockTake.noVarianceItems', 'All items match system quantities')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {stockTakeItems.map((item) => {
                const physical = parseFloat(item.physicalQuantity) || 0;
                const variance = physical - item.systemQuantity;
                const hasVariance = variance !== 0;

                return (
                  <div
                    key={item.item.id}
                    className={cn(
                      'flex items-center justify-between p-3 border rounded-lg dark:border-gray-700',
                      hasVariance && variance > 0 && 'border-l-4 border-l-green-500',
                      hasVariance && variance < 0 && 'border-l-4 border-l-red-500',
                    )}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.item.item_name}</p>
                      <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>{t('stockTake.systemQty', 'System')}: {item.systemQuantity}</span>
                        <span>{t('stockTake.physicalQty', 'Physical')}: {physical}</span>
                      </div>
                    </div>
                    {hasVariance ? (
                      <Badge
                        className={cn(
                          'text-sm',
                          variance > 0
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        )}
                      >
                        {variance > 0
                          ? `${t('stockTake.variancePositive', 'Surplus')} +${variance}`
                          : `${t('stockTake.varianceNegative', 'Shortage')} ${variance}`}
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {t('stockTake.noVariance', 'No variance')}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('stockTake.previous', 'Previous')}
              </Button>
              <Button onClick={() => setStep(4)}>
                {t('stockTake.next', 'Next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="dark:border-gray-700">
          <CardHeader>
            <CardTitle>{t('stockTake.step4', 'Submit')}</CardTitle>
            <CardDescription>
              {t('stockTake.reviewDescription', 'Verify the quantities before submitting')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                {itemsWithVariance.length > 0
                  ? t('stockTake.itemsWithVariance', '{{count}} item(s) with variance', { count: itemsWithVariance.length })
                  : t('stockTake.noVarianceItems', 'All items match system quantities')}
              </p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('stockTake.previous', 'Previous')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createEntry.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createEntry.isPending ? (
                  t('stockTake.submitting', 'Submitting...')
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" />
                    {t('stockTake.submit', 'Submit Stock Take')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
