import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from '@tanstack/react-query';
import {
  Handshake,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  AlertCircle,
} from 'lucide-react';
import { useWorkers } from '../../hooks/useWorkers';
import type { MetayageSettlement } from '../../types/workers';
import { useCurrency } from '../../hooks/useCurrency';
import { workersApi } from '../../lib/api/workers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SectionLoader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';

interface ProductionSharingTabProps {
  organizationId: string;
  farmId?: string;
}

const ProductionSharingTab = ({
  organizationId,
  farmId,
}: ProductionSharingTabProps) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrency();
  const { data: workers = [], isLoading: workersLoading } = useWorkers(organizationId, farmId);
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);

  const metayageWorkers = useMemo(
    () => workers.filter((w) => w.worker_type === 'metayage' && w.is_active),
    [workers],
  );

  // Fetch settlements for all metayage workers in parallel
  const settlementQueries = useQueries({
    queries: metayageWorkers.map((worker) => ({
      queryKey: ['metayage-settlements', organizationId, worker.id],
      queryFn: () =>
        workersApi.getMetayageSettlements(organizationId, worker.id) as Promise<
          MetayageSettlement[]
        >,
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading =
    workersLoading || settlementQueries.some((q) => q.isLoading);

  // Aggregate all settlements with worker info
  const allSettlements = useMemo(() => {
    const result: (MetayageSettlement & { worker_name: string; worker_metayage_type?: string })[] = [];
    metayageWorkers.forEach((worker, idx) => {
      const settlements = settlementQueries[idx]?.data || [];
      for (const s of settlements) {
        result.push({
          ...s,
          worker_name: `${worker.first_name} ${worker.last_name}`,
          worker_metayage_type: worker.metayage_type,
        });
      }
    });
    // Sort by period_end desc
    result.sort(
      (a, b) =>
        new Date(b.period_end).getTime() - new Date(a.period_end).getTime(),
    );
    return result;
  }, [metayageWorkers, settlementQueries]);

  // Summary metrics
  const summary = useMemo(() => {
    const totalGrossRevenue = allSettlements.reduce(
      (sum, s) => sum + (s.gross_revenue || 0),
      0,
    );
    const totalCharges = allSettlements.reduce(
      (sum, s) => sum + (s.total_charges || 0),
      0,
    );
    const totalNetRevenue = totalGrossRevenue - totalCharges;
    const totalWorkerShares = allSettlements.reduce(
      (sum, s) => sum + (s.worker_share_amount || 0),
      0,
    );
    const ownerShare = totalNetRevenue - totalWorkerShares;
    const pendingCount = allSettlements.filter(
      (s) => s.payment_status === 'pending',
    ).length;
    const paidCount = allSettlements.filter(
      (s) => s.payment_status === 'paid',
    ).length;

    return {
      totalGrossRevenue,
      totalCharges,
      totalNetRevenue,
      totalWorkerShares,
      ownerShare,
      pendingCount,
      paidCount,
      totalSettlements: allSettlements.length,
    };
  }, [allSettlements]);

  // Per-worker summary for the expanded view
  const workerSummaries = useMemo(() => {
    return metayageWorkers.map((worker, idx) => {
      const settlements = settlementQueries[idx]?.data || [];
      const totalGross = settlements.reduce(
        (sum, s) => sum + (s.gross_revenue || 0),
        0,
      );
      const totalCharges = settlements.reduce(
        (sum, s) => sum + (s.total_charges || 0),
        0,
      );
      const totalShare = settlements.reduce(
        (sum, s) => sum + (s.worker_share_amount || 0),
        0,
      );
      return {
        worker,
        settlements,
        totalGross,
        totalCharges,
        totalShare,
        netRevenue: totalGross - totalCharges,
      };
    });
  }, [metayageWorkers, settlementQueries]);

  if (isLoading) {
    return <SectionLoader />;
  }

  if (metayageWorkers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed border-gray-300 dark:border-gray-600">
        <Handshake className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('workers.metayage.noWorkers', 'Aucun travailleur en métayage actif')}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {t(
            'workers.productionSharing.addHint',
            'Ajoutez un travailleur de type "Métayage" pour commencer le suivi',
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('workers.productionSharing.summary.grossRevenue', 'Revenu brut total')}
              </span>
              <CircleDollarSign className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.totalGrossRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('workers.productionSharing.summary.totalCharges', 'Charges totales')}
              </span>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(summary.totalCharges)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('workers.productionSharing.summary.workerShares', 'Parts travailleurs')}
              </span>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(summary.totalWorkerShares)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('workers.productionSharing.summary.ownerShare', 'Part propriétaire')}
              </span>
              {summary.ownerShare >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div
              className={cn(
                'text-lg font-bold',
                summary.ownerShare >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {formatCurrency(summary.ownerShare)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment status badges */}
      <div className="flex gap-3">
        <Badge variant="outline" className="gap-1.5">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          {summary.pendingCount} {t('workers.productionSharing.pending', 'en attente')}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {summary.paidCount} {t('workers.productionSharing.paid', 'payés')}
        </Badge>
      </div>

      {/* Per-worker breakdown */}
      <div className="space-y-3">
        {workerSummaries.map(({ worker, settlements, totalGross, totalCharges, totalShare }) => (
          <Card key={worker.id}>
            <button
              type="button"
              className="w-full text-left"
              onClick={() =>
                setExpandedWorkerId(
                  expandedWorkerId === worker.id ? null : worker.id,
                )
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold text-sm">
                      {worker.first_name[0]}
                      {worker.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {worker.first_name} {worker.last_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Badge variant="secondary" className="text-[10px]">
                          {worker.metayage_type?.toUpperCase()} -{' '}
                          {worker.metayage_percentage}%
                        </Badge>
                        <span>
                          {worker.calculation_basis === 'gross_revenue'
                            ? t('workers.metayage.type.grossRevenue', 'Revenu brut')
                            : t('workers.metayage.type.netRevenue', 'Revenu net')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {formatCurrency(totalShare)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {settlements.length}{' '}
                        {t('workers.productionSharing.settlements', 'règlements')}
                      </p>
                    </div>
                    {expandedWorkerId === worker.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardContent>
            </button>

            {expandedWorkerId === worker.id && settlements.length > 0 && (
              <div className="px-4 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">
                          {t('workers.productionSharing.table.period', 'Période')}
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          {t('workers.productionSharing.table.grossRevenue', 'Revenu brut')}
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          {t('workers.productionSharing.table.charges', 'Charges')}
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          {t('workers.productionSharing.table.basis', 'Base')}
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          {t('workers.productionSharing.table.percentage', '%')}
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          {t('workers.productionSharing.table.workerShare', 'Part travailleur')}
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          {t('workers.productionSharing.table.verification', 'Vérification')}
                        </TableHead>
                        <TableHead className="text-xs">
                          {t('workers.productionSharing.table.status', 'Statut')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements
                        .sort(
                          (a, b) =>
                            new Date(b.period_end).getTime() -
                            new Date(a.period_end).getTime(),
                        )
                        .map((settlement) => {
                          // Verify data integrity: recalculate from stored fields
                          // The backend is authoritative — this just checks stored values are consistent
                          const basisAmount =
                            settlement.calculation_basis === 'gross_revenue'
                              ? settlement.gross_revenue
                              : settlement.gross_revenue -
                                settlement.total_charges;
                          const expectedShare =
                            basisAmount * (settlement.worker_percentage / 100);
                          const savedShare = settlement.worker_share_amount;
                          const isConsistent =
                            Math.abs(expectedShare - savedShare) < 0.01;

                          return (
                            <TableRow key={settlement.id}>
                              <TableCell className="text-xs">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  {new Date(
                                    settlement.period_start,
                                  ).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                  })}{' '}
                                  -{' '}
                                  {new Date(
                                    settlement.period_end,
                                  ).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium">
                                {formatCurrency(settlement.gross_revenue)}
                              </TableCell>
                              <TableCell className="text-xs text-right text-red-600 dark:text-red-400">
                                -{formatCurrency(settlement.total_charges)}
                              </TableCell>
                              <TableCell className="text-xs text-right">
                                {formatCurrency(basisAmount)}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-purple-600 dark:text-purple-400">
                                {settlement.worker_percentage}%
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold text-purple-700 dark:text-purple-300">
                                {formatCurrency(savedShare)}
                              </TableCell>
                              <TableCell className="text-xs text-right">
                                {isConsistent ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-green-600 border-green-200"
                                  >
                                    OK
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-red-600 border-red-200 gap-1"
                                  >
                                    <AlertCircle className="h-3 w-3" />
                                    {formatCurrency(expectedShare)}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                <Badge
                                  variant={
                                    settlement.payment_status === 'paid'
                                      ? 'default'
                                      : settlement.payment_status === 'pending'
                                        ? 'secondary'
                                        : 'destructive'
                                  }
                                  className="text-[10px]"
                                >
                                  {settlement.payment_status === 'paid'
                                    ? t('workers.productionSharing.statusPaid', 'Payé')
                                    : settlement.payment_status === 'pending'
                                      ? t('workers.productionSharing.statusPending', 'En attente')
                                      : t('workers.productionSharing.statusCancelled', 'Annulé')}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>

                {/* Worker total summary row */}
                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('workers.productionSharing.workerTotal', 'Total pour')} {worker.first_name}{' '}
                    {worker.last_name}
                  </span>
                  <div className="flex gap-6">
                    <span>
                      <span className="text-gray-500 text-xs">
                        {t('workers.productionSharing.table.grossRevenue', 'Revenu brut')}:{' '}
                      </span>
                      <span className="font-medium">{formatCurrency(totalGross)}</span>
                    </span>
                    <span>
                      <span className="text-gray-500 text-xs">
                        {t('workers.productionSharing.table.charges', 'Charges')}:{' '}
                      </span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(totalCharges)}
                      </span>
                    </span>
                    <span>
                      <span className="text-gray-500 text-xs">
                        {t('workers.productionSharing.table.workerShare', 'Part travailleur')}:{' '}
                      </span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(totalShare)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {expandedWorkerId === worker.id && settlements.length === 0 && (
              <div className="px-4 pb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  {t(
                    'workers.productionSharing.noSettlements',
                    'Aucun règlement enregistré. Utilisez le calculateur pour créer un règlement.',
                  )}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProductionSharingTab;
