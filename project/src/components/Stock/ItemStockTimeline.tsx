import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/Input';
import { SectionLoader } from '@/components/ui/loader';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStockMovements } from '@/hooks/useStockMovements';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import type { StockMovementType, StockMovementWithDetails } from '@/types/stock-entries';
import { AlertCircle, CalendarDays, Clock3, Package, RefreshCcw, UserRound, Warehouse } from 'lucide-react';

interface ItemStockTimelineProps {
  itemId: string;
  itemName: string;
  onClose: () => void;
}

type MovementFilterValue = 'all' | StockMovementType;

type TimelineMovement = StockMovementWithDetails & {
  runningBalance: number;
};

const movementBadgeClasses: Record<StockMovementType, string> = {
  IN: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  OUT: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  TRANSFER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);

const getWarehouseLabel = (movement: StockMovementWithDetails, t: (key: string, fallback?: string) => string) => {
  const warehouseName = movement.warehouse?.name || '—';

  if (movement.movement_type === 'TRANSFER') {
    return movement.quantity < 0
      ? `${t('items.timeline.fromWarehouse', 'From')}: ${warehouseName}`
      : `${t('items.timeline.toWarehouse', 'To')}: ${warehouseName}`;
  }

  return movement.movement_type === 'OUT'
    ? `${t('items.timeline.fromWarehouse', 'From')}: ${warehouseName}`
    : `${t('items.timeline.toWarehouse', 'To')}: ${warehouseName}`;
};

const getMovementQuantityClass = (quantity: number) => {
  if (quantity > 0) return 'text-green-700 dark:text-green-400';
  if (quantity < 0) return 'text-red-700 dark:text-red-400';
  return 'text-gray-700 dark:text-gray-300';
};

export default function ItemStockTimeline({ itemId, itemName, onClose }: ItemStockTimelineProps) {
  const { t } = useTranslation('stock');
  const { t: tCommon } = useTranslation('common');
  const isMobile = useIsMobile();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [movementType, setMovementType] = useState<MovementFilterValue>('all');

  const filters = useMemo(
    () => ({
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      movement_type: movementType === 'all' ? undefined : movementType,
    }),
    [fromDate, toDate, movementType],
  );

  const {
    data: movements = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useStockMovements(itemId, filters);

  const timelineMovements = useMemo<TimelineMovement[]>(() => {
    const ascending = [...movements].sort(
      (a, b) => new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime(),
    );

    const withBalance = ascending.reduce<TimelineMovement[]>((acc, movement) => {
      const prevBalance = acc.length > 0 ? acc[acc.length - 1].runningBalance : 0;
      acc.push({
        ...movement,
        runningBalance: prevBalance + Number(movement.quantity || 0),
      });
      return acc;
    }, []);

    return withBalance.reverse();
  }, [movements]);

  const summary = useMemo(() => {
    return timelineMovements.reduce(
      (acc, movement) => {
        const quantity = Number(movement.quantity || 0);
        if (quantity > 0) acc.totalIn += quantity;
        if (quantity < 0) acc.totalOut += Math.abs(quantity);
        return acc;
      },
      {
        totalIn: 0,
        totalOut: 0,
        currentBalance: timelineMovements[0]?.runningBalance ?? 0,
      },
    );
  }, [timelineMovements]);

  const unit = timelineMovements[0]?.unit || movements[0]?.item?.default_unit || '';

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('items.timeline.title', 'Stock movement history')}
      description={t('items.timeline.description', { itemName, defaultValue: `Full movement timeline for ${itemName}` })}
      size="4xl"
      contentClassName="max-h-[90vh] overflow-hidden"
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('items.timeline.summary.totalIn', 'Total in')}</p>
              <p className="mt-2 text-2xl font-semibold text-green-700 dark:text-green-400">
                +{formatNumber(summary.totalIn)} {unit}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('items.timeline.summary.totalOut', 'Total out')}</p>
              <p className="mt-2 text-2xl font-semibold text-red-700 dark:text-red-400">
                -{formatNumber(summary.totalOut)} {unit}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('items.timeline.summary.currentBalance', 'Current balance')}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(summary.currentBalance)} {unit}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_220px]">
          <div className="space-y-2">
            <label htmlFor="stock-movement-from-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('items.timeline.filters.fromDate', 'From date')}
            </label>
            <Input
              id="stock-movement-from-date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="stock-movement-to-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('items.timeline.filters.toDate', 'To date')}
            </label>
            <Input
              id="stock-movement-to-date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('items.timeline.filters.movementType', 'Movement type')}
            </label>
            <Select value={movementType} onValueChange={(value) => setMovementType(value as MovementFilterValue)}>
              <SelectTrigger>
                <SelectValue placeholder={t('items.timeline.filters.all', 'All movements')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('items.timeline.filters.all', 'All movements')}</SelectItem>
                <SelectItem value="IN">{t('items.timeline.types.IN', 'IN')}</SelectItem>
                <SelectItem value="OUT">{t('items.timeline.types.OUT', 'OUT')}</SelectItem>
                <SelectItem value="TRANSFER">{t('items.timeline.types.TRANSFER', 'TRANSFER')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white dark:bg-gray-950">
          {isLoading ? (
            <SectionLoader className="py-10" />
          ) : error ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={AlertCircle}
                title={t('items.timeline.errorTitle', 'Unable to load movement history')}
                description={error instanceof Error ? error.message : t('items.timeline.errorDescription', 'Please try again.')}
                action={{
                  label: t('items.timeline.retry', 'Retry'),
                  onClick: () => refetch(),
                }}
              />
            </div>
          ) : timelineMovements.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={Package}
                title={t('items.timeline.emptyTitle', 'No stock movements found')}
                description={t('items.timeline.emptyDescription', 'This item has no stock movement history for the selected filters.')}
              />
            </div>
          ) : isMobile ? (
            <div className="space-y-3 overflow-y-auto p-4">
              {timelineMovements.map((movement) => (
                <Card key={movement.id} className="border shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays className="h-4 w-4" />
                          {formatDateTime(movement.movement_date)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {movement.stock_entry?.entry_number || t('items.timeline.noReference', 'No reference')}
                        </p>
                      </div>
                      <Badge className={cn('border-0', movementBadgeClasses[movement.movement_type])}>
                        {t(`items.timeline.types.${movement.movement_type}`, movement.movement_type)}
                      </Badge>
                    </div>

                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{t('items.timeline.quantity', 'Quantity')}</span>
                        <span className={cn('font-semibold', getMovementQuantityClass(movement.quantity))}>
                          {movement.quantity > 0 ? '+' : ''}
                          {formatNumber(movement.quantity)} {movement.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{t('items.timeline.warehouse', 'Warehouse')}</span>
                        <span className="text-right">{getWarehouseLabel(movement, t)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{t('items.timeline.runningBalance', 'Running balance')}</span>
                        <span className="font-medium">{formatNumber(movement.runningBalance)} {movement.unit}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{t('items.timeline.postedBy', 'Posted by')}</span>
                        <span className="text-right">{movement.created_by || t('items.timeline.unknownUser', 'Unknown user')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                  <TableRow>
                    <TableHead>{t('items.timeline.table.date', 'Date')}</TableHead>
                    <TableHead>{t('items.timeline.table.type', 'Type')}</TableHead>
                    <TableHead>{t('items.timeline.table.quantity', 'Quantity')}</TableHead>
                    <TableHead>{t('items.timeline.table.warehouse', 'Warehouse')}</TableHead>
                    <TableHead>{t('items.timeline.table.runningBalance', 'Running balance')}</TableHead>
                    <TableHead>{t('items.timeline.table.postedBy', 'Posted by')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timelineMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">{formatDateTime(movement.movement_date)}</span>
                          <span className="text-xs text-muted-foreground">
                            {movement.stock_entry?.entry_number || t('items.timeline.noReference', 'No reference')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border-0', movementBadgeClasses[movement.movement_type])}>
                          {t(`items.timeline.types.${movement.movement_type}`, movement.movement_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn('font-semibold', getMovementQuantityClass(movement.quantity))}>
                          {movement.quantity > 0 ? '+' : ''}
                          {formatNumber(movement.quantity)} {movement.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Warehouse className="h-4 w-4 text-muted-foreground" />
                          <span>{getWarehouseLabel(movement, t)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatNumber(movement.runningBalance)} {movement.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                          <span>{movement.created_by || t('items.timeline.unknownUser', 'Unknown user')}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span>{t('items.timeline.count', { count: timelineMovements.length, defaultValue: '{{count}} movement(s)' })}</span>
            {isFetching && !isLoading ? (
              <span className="inline-flex items-center gap-1">
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                {t('items.timeline.refreshing', 'Refreshing...')}
              </span>
            ) : null}
          </div>
          <Button variant="outline" onClick={onClose}>
            {tCommon('app.close', 'Close')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
