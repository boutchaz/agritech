import { useEffect } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAnnualCampaignBilan } from '@/hooks/useAnnualRecalibration';

interface AnnualCampaignBilanStepProps {
  parcelId: string;
  onReadyForAutoAdvance: () => void;
}

function formatDelta(delta: number | null): string {
  if (delta == null) return 'N/A';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(0)}%`;
}

export function AnnualCampaignBilanStep({ parcelId, onReadyForAutoAdvance }: AnnualCampaignBilanStepProps) {
  const { data: bilan, isLoading, isError, refetch, isFetching } = useAnnualCampaignBilan(parcelId);

  useEffect(() => {
    if (bilan && !isLoading) {
      onReadyForAutoAdvance();
    }
  }, [bilan, isLoading, onReadyForAutoAdvance]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Generation automatique du bilan de campagne...</p>
      </div>
    );
  }

  if (isError || !bilan) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4 space-y-3">
        <p className="text-sm text-red-700 dark:text-red-300">Impossible de charger le bilan de campagne.</p>
        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="h-4 w-4" />
          Reessayer
        </Button>
      </div>
    );
  }

  const interventionExecutionRate =
    bilan.interventions_planned > 0
      ? Math.round((bilan.interventions_executed / bilan.interventions_planned) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-900/20 p-3">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-sm">Bilan calcule automatiquement. Aucune saisie manuelle n&apos;est requise.</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <Table className="w-full text-sm">
          <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
            <TableRow>
              <TableHead className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Metric</TableHead>
              <TableHead className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Predicted</TableHead>
              <TableHead className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Actual</TableHead>
              <TableHead className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-t border-gray-200 dark:border-gray-700">
              <TableCell className="px-4 py-3 text-gray-700 dark:text-gray-300">Rendement</TableCell>
              <TableCell className="px-4 py-3 text-gray-900 dark:text-white">
                {bilan.predicted_yield.min}-{bilan.predicted_yield.max} T/ha
              </TableCell>
              <TableCell className="px-4 py-3 text-gray-900 dark:text-white">
                {bilan.actual_yield != null ? `${bilan.actual_yield} T/ha` : 'N/A'}
              </TableCell>
              <TableCell className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{formatDelta(bilan.yield_deviation_pct)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-violet-500" />
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Statut alternance N+1</h5>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{bilan.alternance_status_next}</p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Interventions planifiees vs executees</h5>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {bilan.interventions_executed}/{bilan.interventions_planned} ({interventionExecutionRate}%)
          </p>
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(100, interventionExecutionRate)}%` }} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
        <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Evolution du health score</h5>
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <span>{bilan.health_score_evolution.start}</span>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-white">{bilan.health_score_evolution.end}</span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
        <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Resume des alertes saison</h5>
        {bilan.alerts_summary.length > 0 ? (
          <div className="space-y-1.5">
            {bilan.alerts_summary.map((alert) => (
              <div key={`${alert.code}-${alert.count}`} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{alert.code}</span>
                <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-amber-700 dark:text-amber-300 text-xs font-medium">
                  {alert.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <AlertTriangle className="h-4 w-4" />
            Aucune alerte critique identifiee.
          </div>
        )}
      </div>
    </div>
  );
}
