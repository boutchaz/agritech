import { useTranslation } from 'react-i18next';
import { Sparkles, AlertTriangle, Lightbulb, Clock } from 'lucide-react';
import type {
  PhenologyAiEnrichment,
  PhenologyAiConfidence,
} from '@/types/calibration-review';
import { cn } from '@/lib/utils';

interface PhenologyAiEnrichmentPanelProps {
  enrichment: PhenologyAiEnrichment;
  status?: string | null;
  missingStages?: string[];
}

const STAGE_LABELS: Record<string, string> = {
  dormancy_exit: 'Sortie de dormance',
  plateau_start: 'Début plateau',
  peak: 'Pic',
  decline_start: 'Début déclin',
  dormancy_entry: 'Entrée dormance',
};

const CONFIDENCE_STYLES: Record<PhenologyAiConfidence, string> = {
  ELEVEE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  MODEREE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  FAIBLE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  TRES_FAIBLE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const CONFIDENCE_LABELS: Record<PhenologyAiConfidence, string> = {
  ELEVEE: 'Élevée',
  MODEREE: 'Modérée',
  FAIBLE: 'Faible',
  TRES_FAIBLE: 'Très faible',
};

function formatStage(stage: string): string {
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function PhenologyAiEnrichmentPanel({
  enrichment,
  status,
  missingStages,
}: PhenologyAiEnrichmentPanelProps) {
  const { t } = useTranslation('ai');

  const hasImputed = enrichment.imputed_stages.length > 0;
  const hasNarratives = enrichment.phase_narratives.length > 0;
  const hasReasons = enrichment.degradation_reasons.length > 0;
  const hasRecommendations = enrichment.recommendations.length > 0;

  if (
    !enrichment.summary &&
    !hasImputed &&
    !hasNarratives &&
    !hasReasons &&
    !hasRecommendations
  ) {
    return null;
  }

  return (
    <div
      className="mt-6 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/60 to-indigo-50/60 dark:from-purple-950/20 dark:to-indigo-950/20 p-5"
      data-block="phenology-ai-enrichment"
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">
          {t(
            'calibrationReview.phenology.aiEnrichment.title',
            'Explication simple',
          )}
        </h3>
        {status === 'degraded' && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {t(
              'calibrationReview.phenology.aiEnrichment.fragileStatus',
              'Résultat à prendre avec prudence',
            )}
          </span>
        )}
      </div>

      {enrichment.summary && (
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
          {enrichment.summary}
        </p>
      )}

      {hasReasons && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {t(
                'calibrationReview.phenology.aiEnrichment.degradationReasons',
                'Pourquoi il faut rester prudent',
              )}
            </h4>
          </div>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300 pl-5 list-disc">
            {enrichment.degradation_reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {hasImputed && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {t(
                'calibrationReview.phenology.aiEnrichment.imputedStages',
                'Dates estimées',
              )}
              {missingStages && missingStages.length > 0 && (
                <span className="ml-1 text-[10px] font-normal text-gray-500 dark:text-gray-400">
                  ({missingStages.length}{' '}
                  {t(
                    'calibrationReview.phenology.aiEnrichment.missing',
                    'à confirmer',
                  )}
                  )
                </span>
              )}
            </h4>
          </div>
          <ul className="space-y-2">
            {enrichment.imputed_stages.map((s, i) => (
              <li
                key={`${s.stage}-${i}`}
                className="rounded-md bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-sm border border-purple-100/60 dark:border-purple-900/30"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {formatStage(s.stage)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-xs">
                    {formatDate(s.date)}
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium',
                      CONFIDENCE_STYLES[s.confidence],
                    )}
                  >
                    {CONFIDENCE_LABELS[s.confidence]}
                  </span>
                </div>
                {s.rationale && (
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-snug">
                    {s.rationale}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasNarratives && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
            {t(
              'calibrationReview.phenology.aiEnrichment.phaseNarratives',
              'Ce que ça veut dire',
            )}
          </h4>
          <ul className="space-y-2">
            {enrichment.phase_narratives.map((n, i) => (
              <li
                key={i}
                className="rounded-md bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-sm border border-purple-100/60 dark:border-purple-900/30"
              >
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-snug">
                  {n.summary}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasRecommendations && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {t(
                'calibrationReview.phenology.aiEnrichment.recommendations',
                'Que faire maintenant',
              )}
            </h4>
          </div>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300 pl-5 list-disc">
            {enrichment.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-purple-500/80 dark:text-purple-400/70 mt-4 italic">
        {t(
          'calibrationReview.phenology.aiEnrichment.disclaimer',
          'Résumé assisté par IA — vérifie toujours sur le terrain.',
        )}
      </p>
    </div>
  );
}
