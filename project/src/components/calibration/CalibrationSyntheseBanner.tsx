import { useTranslation } from 'react-i18next';
import { Leaf, TrendingUp, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalibrationReview } from '@/hooks/useCalibrationReview';
import type { HealthLabel, ConfidenceLevel } from '@/types/calibration-review';

interface CalibrationSyntheseBannerProps {
  parcelId: string;
  onNavigateToReview?: () => void;
}

const HEALTH_COLORS: Record<HealthLabel, { ring: string; bg: string; text: string }> = {
  excellent: { ring: '#2d5016', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
  bon: { ring: '#4a7c25', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
  moyen: { ring: '#d4a017', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300' },
  faible: { ring: '#e67e22', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300' },
  critique: { ring: '#c0392b', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300' },
};

const CONFIDENCE_STYLE: Record<ConfidenceLevel, { bg: string; text: string }> = {
  eleve: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  moyen: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  faible: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  minimal: { bg: 'bg-red-200 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-200' },
};

function MiniGauge({ score, color }: { score: number; color: string }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-[76px] h-[76px] flex items-center justify-center">
      <svg width={76} height={76} className="transform -rotate-90">
        <circle cx={38} cy={38} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={6} className="dark:stroke-gray-700" />
        <circle
          cx={38} cy={38} r={radius} fill="none"
          stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold text-gray-900 dark:text-white">{score}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">/100</span>
      </div>
    </div>
  );
}

export function CalibrationSyntheseBanner({ parcelId, onNavigateToReview }: CalibrationSyntheseBannerProps) {
  const { t } = useTranslation('ai');
  const { data: review, isLoading } = useCalibrationReview(parcelId);

  if (isLoading || !review) return null;

  const { block_a: a } = review;
  const healthStyle = HEALTH_COLORS[a.health_label];
  const confStyle = CONFIDENCE_STYLE[a.confidence_level];
  const confiance10 = (a.confidence_score / 10).toFixed(1);

  const topStrengths = a.strengths.slice(0, 2);
  const topConcerns = a.concerns.slice(0, 2);

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
      data-testid="calibration-synthese-banner"
    >
      {/* Compact header bar */}
      <div className="bg-gradient-to-r from-[#2d5016] to-[#4a7c25] px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-white/80" />
            <span className="text-sm font-semibold text-white">
              {t('calibrationSynthese.title', 'Synth\u00e8se du Calibrage')}
            </span>
          </div>
          <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', confStyle.bg, confStyle.text)}>
            {t('calibrationSynthese.confidence', 'Confiance')} {confiance10}/10
          </span>
        </div>
      </div>

      {/* AI Summary Narrative */}
      {a.summary_narrative && (
        <div className="px-4 pt-3 pb-0">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {a.summary_narrative}
          </p>
        </div>
      )}

      {/* Body */}
      <div className="px-4 py-4">
        <div className="flex flex-wrap items-start gap-5">
          {/* Health score gauge */}
          <div className="flex flex-col items-center gap-1">
            <MiniGauge score={a.health_score} color={healthStyle.ring} />
            <span className={cn('text-xs font-medium', healthStyle.text)}>
              {a.health_narrative}
            </span>
          </div>

          {/* KPIs column */}
          <div className="flex flex-col gap-2 min-w-[140px]">
            {a.yield_range && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('calibrationSynthese.yield', 'Potentiel')}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {a.yield_range.min.toFixed(0)} – {a.yield_range.max.toFixed(0)} {a.yield_range.unit}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Strengths & Concerns */}
          <div className="flex-1 min-w-[200px] grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topStrengths.length > 0 && (
              <div className="space-y-1.5">
                {topStrengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">{s.phrase}</span>
                  </div>
                ))}
              </div>
            )}
            {topConcerns.length > 0 && (
              <div className="space-y-1.5">
                {topConcerns.map((c, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className={cn(
                      'h-3.5 w-3.5 mt-0.5 flex-shrink-0',
                      c.severity === 'critique' ? 'text-red-500' : 'text-orange-500'
                    )} />
                    <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">{c.phrase}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Link to full review */}
        {onNavigateToReview && (
          <button
            type="button"
            onClick={onNavigateToReview}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-[#2d5016] dark:text-green-400 hover:underline"
          >
            {t('calibrationSynthese.viewFull', 'Voir le rapport complet')}
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
