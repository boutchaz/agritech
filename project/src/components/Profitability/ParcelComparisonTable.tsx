import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { profitabilityApi, type AnalysisParcelRow } from '@/lib/api/profitability';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type SortKey = 'parcel_name' | 'crop_type' | 'costs' | 'revenue' | 'profit' | 'margin';

function formatMAD(value: number): string {
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' MAD';
}

function getMarginColor(margin: number): string {
  if (margin > 20) return 'text-green-600 dark:text-green-400';
  if (margin > 10) return 'text-green-500 dark:text-green-300';
  if (margin > 0) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function ParcelComparisonTable() {
  const { t } = useTranslation('common');
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id ?? null;

  const [sortKey, setSortKey] = useState<SortKey>('profit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['profitability-analysis', organizationId, { filter_type: 'parcel' }],
    queryFn: () => profitabilityApi.getAnalysis({ filter_type: 'parcel' }, organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedParcels = useMemo(() => {
    if (!data?.by_parcel) return [];

    const parcels = [...data.by_parcel];
    const dir = sortDir === 'asc' ? 1 : -1;

    parcels.sort((a, b) => {
      switch (sortKey) {
        case 'parcel_name':
          return dir * a.parcel_name.localeCompare(b.parcel_name);
        case 'crop_type':
          return dir * (a.crop_type ?? '').localeCompare(b.crop_type ?? '');
        case 'costs':
          return dir * (a.costs - b.costs);
        case 'revenue':
          return dir * (a.revenue - b.revenue);
        case 'profit':
          return dir * (a.profit - b.profit);
        case 'margin': {
          const marginA = a.revenue > 0 ? (a.profit / a.revenue) * 100 : 0;
          const marginB = b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0;
          return dir * (marginA - marginB);
        }
        default:
          return 0;
      }
    });

    return parcels;
  }, [data?.by_parcel, sortKey, sortDir]);

  const SortableHeader = ({ column, label }: { column: SortKey; label: string }) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:opacity-80"
      onClick={() => handleSort(column)}
    >
      {label}
      <ArrowUpDown
        className={`h-3.5 w-3.5 ${sortKey === column ? 'opacity-100' : 'opacity-30'}`}
      />
    </button>
  );

  const renderMargin = (row: AnalysisParcelRow) => {
    if (row.revenue <= 0) return <span className="text-muted-foreground">-</span>;
    const margin = (row.profit / row.revenue) * 100;
    return (
      <span className={`font-medium ${getMarginColor(margin)}`}>
        {margin.toFixed(1)}%
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profitability.parcelComparison', 'Parcel Comparison')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((key) => (
              <div key={key} className="flex items-center gap-4 h-10">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-destructive">
              {t('profitability.loadError', 'Failed to load parcel data. Please try again.')}
            </p>
          </div>
        ) : sortedParcels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
            <p className="text-muted-foreground text-sm">
              {t('profitability.noParcelData', 'No parcel data available for comparison.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">
                    <SortableHeader
                      column="parcel_name"
                      label={t('profitability.parcelName', 'Parcel Name')}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      column="crop_type"
                      label={t('profitability.cropType', 'Crop Type')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader
                      column="costs"
                      label={t('profitability.totalCosts', 'Total Costs')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader
                      column="revenue"
                      label={t('profitability.totalRevenue', 'Total Revenue')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader
                      column="profit"
                      label={t('profitability.netProfit', 'Net Profit')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHeader
                      column="margin"
                      label={t('profitability.profitMargin', 'Profit Margin')}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedParcels.map((parcel) => (
                  <TableRow key={parcel.parcel_id}>
                    <TableCell className="font-medium text-left">
                      {parcel.parcel_name}
                    </TableCell>
                    <TableCell>
                      {parcel.crop_type ? (
                        <Badge variant="secondary">{parcel.crop_type}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {formatMAD(parcel.costs)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      {formatMAD(parcel.revenue)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        parcel.profit >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatMAD(parcel.profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderMargin(parcel)}
                    </TableCell>
                  </TableRow>
                ))}


                {data && (
                  <TableRow className="border-t-2 border-muted font-bold bg-muted/50">
                    <TableCell className="text-left">
                      {t('profitability.total', 'Total')}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {formatMAD(data.total_costs)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      {formatMAD(data.total_revenue)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        data.net_profit >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatMAD(data.net_profit)}
                    </TableCell>
                    <TableCell className={`text-right ${getMarginColor(data.margin_percent)}`}>
                      {data.margin_percent.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
