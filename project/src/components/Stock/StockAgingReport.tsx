import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownAZ, Loader2, Warehouse as WarehouseIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStockAging } from '@/hooks/useStockEntries';
import { useWarehouses } from '@/hooks/useWarehouses';
import { cn } from '@/lib/utils';
import type { StockAgingItem } from '@/lib/api/stock';

const formatMoney = (n: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(n);

const formatQty = (n: number, unit: string) =>
  `${new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 }).format(n)} ${unit}`;

const BUCKET_KEYS = ['0-30', '31-60', '61-90', '90+'] as const;

const BUCKET_STYLES: Record<(typeof BUCKET_KEYS)[number], { label: string; bg: string; text: string }> = {
  '0-30': { label: '0–30 days', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300' },
  '31-60': { label: '31–60 days', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300' },
  '61-90': { label: '61–90 days', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300' },
  '90+': { label: '90+ days', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300' },
};

type SortKey = 'oldest' | 'value' | 'qty';

export function StockAgingReport() {
  const { t } = useTranslation('stock');
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  const [sortKey, setSortKey] = useState<SortKey>('oldest');
  const { data, isLoading } = useStockAging(warehouseId);
  const { data: warehouses = [] } = useWarehouses();

  const sortedItems = useMemo<StockAgingItem[]>(() => {
    if (!data) return [];
    const copy = [...data.items];
    copy.sort((a, b) => {
      if (sortKey === 'value') return b.totalValue - a.totalValue;
      if (sortKey === 'qty') return b.totalQty - a.totalQty;
      return b.oldestDays - a.oldestDays;
    });
    return copy;
  }, [data, sortKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('aging.title', 'Stock Aging')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              'aging.subtitle',
              'Slow-moving inputs by days in inventory. Identify stuck pesticides, expired seasonal stock, and tied-up capital.',
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={warehouseId ?? 'all'} onValueChange={(v) => setWarehouseId(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-[200px]">
              <WarehouseIcon className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('aging.allWarehouses', 'All warehouses')}
              </SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[200px]">
              <ArrowDownAZ className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oldest">
                {t('aging.sort.oldest', 'Oldest first')}
              </SelectItem>
              <SelectItem value="value">
                {t('aging.sort.value', 'Highest value')}
              </SelectItem>
              <SelectItem value="qty">
                {t('aging.sort.qty', 'Highest quantity')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bucket KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {BUCKET_KEYS.map((key) => {
          const bucket = data?.buckets[key];
          const style = BUCKET_STYLES[key];
          return (
            <Card key={key} className={cn(style.bg, 'border-0')}>
              <CardContent className="p-4">
                <div className={cn('text-xs uppercase tracking-wider font-semibold', style.text)}>
                  {style.label}
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {bucket ? formatMoney(bucket.value) : '—'}
                </div>
                {bucket && (
                  <div className={cn('text-xs mt-1', style.text)}>
                    {new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 }).format(bucket.qty)}
                    {' '}
                    {t('aging.units', 'units')}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Per-item table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('aging.perItem.title', 'Aging by item × warehouse')}</CardTitle>
          <CardDescription>
            {t(
              'aging.perItem.subtitle',
              'Each row aggregates all valuation lots for the item in the warehouse. Oldest age = oldest unconsumed lot.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>{t('aging.empty', 'No remaining stock to age.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('aging.cols.item', 'Item')}</TableHead>
                    <TableHead>{t('aging.cols.warehouse', 'Warehouse')}</TableHead>
                    <TableHead className="text-right">{t('aging.cols.qty', 'Qty')}</TableHead>
                    <TableHead className="text-right">{t('aging.cols.value', 'Value')}</TableHead>
                    <TableHead className="text-right">{t('aging.cols.age', 'Oldest')}</TableHead>
                    {BUCKET_KEYS.map((k) => (
                      <TableHead key={k} className="text-right">
                        {BUCKET_STYLES[k].label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((it) => (
                    <TableRow key={`${it.itemId}-${it.warehouseId}`}>
                      <TableCell>
                        <div className="font-medium text-sm">{it.itemName}</div>
                        {it.itemCode && (
                          <div className="text-xs text-muted-foreground font-mono">{it.itemCode}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{it.warehouseName}</TableCell>
                      <TableCell className="text-right text-sm">
                        {formatQty(it.totalQty, it.unit)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(it.totalValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'font-mono',
                            it.oldestDays > 90 && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                            it.oldestDays > 60 && it.oldestDays <= 90 && 'bg-orange-100 text-orange-700',
                            it.oldestDays > 30 && it.oldestDays <= 60 && 'bg-amber-100 text-amber-700',
                          )}
                        >
                          {it.oldestDays}d
                        </Badge>
                      </TableCell>
                      {BUCKET_KEYS.map((k) => (
                        <TableCell
                          key={k}
                          className={cn(
                            'text-right text-sm',
                            it.buckets[k].value > 0 ? '' : 'text-muted-foreground',
                          )}
                        >
                          {it.buckets[k].value > 0 ? formatMoney(it.buckets[k].value) : '—'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
