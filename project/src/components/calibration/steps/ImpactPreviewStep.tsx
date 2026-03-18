import { ArrowRight, BadgeAlert, FlaskConical, Gauge, Sparkles } from 'lucide-react';
import type { FieldPath } from 'react-hook-form';
import type { CalibrationWizardFormValues } from '@/components/calibration/RecalibrationWizard';

export interface ModifiedParameterPreview {
  path: FieldPath<CalibrationWizardFormValues>;
  label: string;
  oldValue: string;
  newValue: string;
}

interface ImpactPreviewStepProps {
  modifiedParameters: ModifiedParameterPreview[];
  modulesToRecalculate: string[];
  confidencePreview: number;
  recommendation: 'partial' | 'full';
}

export function ImpactPreviewStep({
  modifiedParameters,
  modulesToRecalculate,
  confidencePreview,
  recommendation,
}: ImpactPreviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">Apercu d'impact</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Simulation des changements avant execution du recalibrage partiel.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          <FlaskConical className="h-4 w-4" />
          <span>Parametres modifies ({modifiedParameters.length})</span>
        </div>

        {modifiedParameters.length === 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md p-3">
            Aucun changement detecte pour le moment. Mettez a jour au moins un parametre dans l'etape precedente.
          </p>
        ) : (
          <div className="space-y-2">
            {modifiedParameters.map((param) => (
              <div
                key={param.path}
                className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm"
              >
                <span className="font-medium text-gray-900 dark:text-white">{param.label}</span>
                <span className="text-gray-500 dark:text-gray-400">{param.oldValue}</span>
                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                <span className="font-medium text-blue-700 dark:text-blue-300">{param.newValue}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            <Sparkles className="h-4 w-4" />
            <span>Modules recalcules</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {modulesToRecalculate.map((module) => (
              <span
                key={module}
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
              >
                {module}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/30 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <Gauge className="h-4 w-4" />
            <span>Apercu du score de confiance</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(confidencePreview * 100)}%</div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${Math.round(confidencePreview * 100)}%` }} />
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl border p-4 ${
          recommendation === 'partial'
            ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
            : 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
        }`}
      >
        <div className="flex items-start gap-2">
          <BadgeAlert
            className={`h-4 w-4 mt-0.5 ${
              recommendation === 'partial' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          />
          <div>
            <p
              className={`text-sm font-semibold ${
                recommendation === 'partial' ? 'text-green-900 dark:text-green-200' : 'text-amber-900 dark:text-amber-200'
              }`}
            >
              Recommandation IA: {recommendation === 'partial' ? 'Recalibrage partiel' : 'Recalibrage complet'}
            </p>
            <p
              className={`text-xs mt-1 ${
                recommendation === 'partial' ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
              }`}
            >
              {recommendation === 'partial'
                ? 'Le systeme estime que les changements restent limites au bloc cible.'
                : 'L impact est large ou structurel. Un recalibrage complet est plus fiable.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
