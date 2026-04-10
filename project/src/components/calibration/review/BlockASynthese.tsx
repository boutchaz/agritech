import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockASynthese as BlockAData, ConfidenceLevel, HealthLabel } from '@/types/calibration-review';

interface BlockASyntheseProps {
  data: BlockAData;
  onScrollToBlock?: (block: string) => void;
}

const HEALTH_RING_COLORS: Record<HealthLabel, string> = {
  excellent: '#2d5016',
  bon: '#4a7c25',
  moyen: '#d4a017',
  faible: '#e67e22',
  critique: '#c0392b',
};

const CONFIDENCE_BADGE: Record<ConfidenceLevel, { bg: string; text: string; label: string }> = {
  eleve: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Elevé' },
  moyen: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: 'Moyen' },
  faible: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Faible' },
  minimal: { bg: 'bg-red-200 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-200', label: 'Minimal' },
};

function HealthGauge({ score, label }: { score: number; label: HealthLabel }) {
  const color = HEALTH_RING_COLORS[label];
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-[140px] h-[140px] flex items-center justify-center">
      <svg width={140} height={140} className="transform -rotate-90">
        <circle cx={70} cy={70} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={10} className="dark:stroke-gray-700" />
        <circle
          cx={70} cy={70} r={radius} fill="none"
          stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{score}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">/100</span>
      </div>
    </div>
  );
}

export function BlockASynthese({ data, onScrollToBlock }: BlockASyntheseProps) {
  const { t } = useTranslation('ai');
  const confBadge = CONFIDENCE_BADGE[data.confidence_level];
  const confiance10 = (data.confidence_score / 10).toFixed(1);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="A">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
        1. {t('calibrationReview.blockA.sectionTitle', 'SYNTH\u00c8SE EX\u00c9CUTIVE')}
      </h2>

      {/* Top row: Gauge + Confiance + Rendement + Statut */}
      <div className="flex flex-wrap items-start gap-6 mb-6">
        {/* Health gauge */}
        <div className="flex flex-col items-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('calibrationReview.blockA.healthScore', 'Score de Sant\u00e9')}
          </p>
          <HealthGauge score={data.health_score} label={data.health_label} />
        </div>

        {/* Confiance */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('calibrationReview.blockA.confidenceScore', 'Confiance')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {confiance10}/10
          </p>
          <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-semibold w-fit', confBadge.bg, confBadge.text)}>
            {confBadge.label}
          </span>
        </div>

        {/* Yield */}
        {data.yield_range && (
          <div className="flex flex-col gap-1 min-w-[120px]">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('calibrationReview.blockA.yieldPotential', 'Potentiel de rendement')}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.yield_range.min.toFixed(0)} - {data.yield_range.max.toFixed(0)} T/ha
            </p>
            {data.yield_range.wide_range_warning && (
              <p className="text-xs text-orange-600 dark:text-orange-400">
                {t('calibrationReview.blockA.wideRange', 'Fourchette \u00e9largie')}
              </p>
            )}
          </div>
        )}

        {/* Statut */}
        <div className="flex flex-col gap-1 min-w-[100px]">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('calibrationReview.blockA.status', 'Statut')}
          </p>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-medium w-fit">
            <TrendingUp className="h-3.5 w-3.5" />
            {data.health_narrative}
          </span>
        </div>
      </div>

      {/* Bottom row: Points forts + Points de vigilance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('calibrationReview.blockA.strengths', 'Points forts')}
          </h3>
          <div className="space-y-2">
            {data.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{s.phrase}</span>
              </div>
            ))}
            {data.strengths.length === 0 && (
              <p className="text-sm text-gray-400 italic">—</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('calibrationReview.blockA.concerns', 'Points de vigilance')}
          </h3>
          <div className="space-y-2">
            {data.concerns.map((c, i) => (
              <button
                key={i}
                type="button"
                className="flex items-start gap-2 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded p-1 -m-1 transition-colors"
                onClick={() => onScrollToBlock?.(c.target_block)}
              >
                <AlertTriangle
                  className={cn(
                    'h-4 w-4 mt-0.5 flex-shrink-0',
                    c.severity === 'critique' ? 'text-red-500' : 'text-orange-500',
                  )}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{c.phrase}</span>
              </button>
            ))}
            {data.concerns.length === 0 && (
              <p className="text-sm text-gray-400 italic">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
