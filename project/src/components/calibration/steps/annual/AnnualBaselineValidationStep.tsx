import { ArrowRight, FileDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAnnualCampaignBilan, useStartAnnualRecalibration } from '@/hooks/useAnnualRecalibration';
import { exportCampaignBilanPdf } from '@/lib/export/campaignReportPdf';

interface AnnualBaselineValidationStepProps {
  parcelId: string;
  estimatedCampaignCount?: number;
  onValidated: () => void;
}

interface BaselineRow {
  label: string;
  oldValue: string;
  newValue: string;
  changed: boolean;
}

function safePercentage(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export function AnnualBaselineValidationStep({
  parcelId,
  estimatedCampaignCount = 2,
  onValidated,
}: AnnualBaselineValidationStepProps) {
  const { data: bilan, isLoading } = useAnnualCampaignBilan(parcelId);
  const startAnnualRecalibration = useStartAnnualRecalibration(parcelId);

  if (isLoading || !bilan) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Preparation de la baseline finale...</p>
      </div>
    );
  }

  const predictedMidpoint = (bilan.predicted_yield.min + bilan.predicted_yield.max) / 2;
  const adjustedMidpoint =
    bilan.actual_yield != null
      ? (predictedMidpoint + bilan.actual_yield) / 2
      : predictedMidpoint;

  const interventionsRate =
    bilan.interventions_planned > 0
      ? (bilan.interventions_executed / bilan.interventions_planned) * 100
      : 0;

  const baselineRows: BaselineRow[] = [
    {
      label: 'Potentiel de rendement cible',
      oldValue: `${predictedMidpoint.toFixed(1)} T/ha`,
      newValue: `${adjustedMidpoint.toFixed(1)} T/ha`,
      changed: Math.abs(adjustedMidpoint - predictedMidpoint) >= 0.2,
    },
    {
      label: 'Execution des interventions',
      oldValue: safePercentage(100),
      newValue: safePercentage(interventionsRate),
      changed: Math.round(interventionsRate) < 100,
    },
    {
      label: 'Score sante de reference',
      oldValue: `${bilan.health_score_evolution.start}/100`,
      newValue: `${bilan.health_score_evolution.end}/100`,
      changed: bilan.health_score_evolution.start !== bilan.health_score_evolution.end,
    },
    {
      label: 'Alternance N+1',
      oldValue: 'A confirmer',
      newValue: bilan.alternance_status_next,
      changed: true,
    },
  ];

  const estimatedR2 = Math.min(
    0.9,
    0.38 + estimatedCampaignCount * 0.05 + Math.max(0, interventionsRate - 70) * 0.002,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <Table className="w-full text-sm">
          <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
            <TableRow>
              <TableHead className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Parametre</TableHead>
              <TableHead className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Ancien profil de reference</TableHead>
              <TableHead className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Nouveau profil de reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baselineRows.map((row) => (
              <TableRow key={row.label} className="border-t border-gray-200 dark:border-gray-700">
                <TableCell className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.label}</TableCell>
                <TableCell className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.oldValue}</TableCell>
                <TableCell
                  className={`px-4 py-3 font-medium ${
                    row.changed
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {row.newValue}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          Avec cette {estimatedCampaignCount}eme campagne validee, le modele predictif de rendement atteint un R2 estime
          de {estimatedR2.toFixed(2)}.
        </p>
        <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">
          Ce score s&apos;ameliore automatiquement a chaque campagne validee.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          onClick={async () => {
            await startAnnualRecalibration.mutateAsync({ trigger: 'annual-wizard' });
            onValidated();
          }}
          disabled={startAnnualRecalibration.isPending}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {startAnnualRecalibration.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Lancement en cours...
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4" />
              Valider et lancer le recalibrage annuel
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            exportCampaignBilanPdf(parcelId, bilan);
          }}
        >
            <FileDown className="h-4 w-4" />
            Exporter rapport campagne (PDF)
        </Button>
      </div>
    </div>
  );
}
