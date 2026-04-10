import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingUp, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockASynthese as BlockAData, ConfidenceLevel, HealthLabel } from '@/types/calibration-blocks-review';

interface BlockASyntheseProps {
  data: BlockAData;
  onScrollToBlock?: (block: string) => void;
}

const HEALTH_COLORS: Record<HealthLabel, string> = {
  excellent: 'text-green-600 dark:text-green-400',
  bon: 'text-emerald-600 dark:text-emerald-400',
  moyen: 'text-yellow-600 dark:text-yellow-400',
  faible: 'text-orange-600 dark:text-orange-400',
  critique: 'text-red-600 dark:text-red-400',
};

const HEALTH_BG: Record<HealthLabel, string> = {
  excellent: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  bon: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  moyen: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  faible: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  critique: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};

const CONFIDENCE_COLORS: Record<ConfidenceLevel, { bg: string; text: string; ring: string }> = {
  eleve: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    ring: 'stroke-green-500',
  },
  moyen: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    ring: 'stroke-yellow-500',
  },
  faible: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    ring: 'stroke-orange-500',
  },
  minimal: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    ring: 'stroke-red-500',
  },
};

function ScoreRing({ score, size = 80, strokeWidth = 6, className }: {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width={size} height={size} className={cn('transform -rotate-90', className)}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200 dark:text-gray-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={className}
      />
    </svg>
  );
}

export function BlockASynthese({ data, onScrollToBlock }: BlockASyntheseProps) {
  const { t } = useTranslation('ai');
  const healthColor = HEALTH_COLORS[data.health_label];
  const healthBg = HEALTH_BG[data.health_label];
  const confStyle = CONFIDENCE_COLORS[data.confidence_level];

  return (
    <Card className="border-0 shadow-md" data-block="A">
      <CardContent className="p-6 space-y-6">
        {/* Row 1: Health + Confidence scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Health Score */}
          <div className={cn('rounded-lg border p-4', healthBg)}>
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center">
                <ScoreRing
                  score={data.health_score}
                  size={72}
                  className={healthColor.replace('text-', 'stroke-')}
                />
                <span className={cn('absolute text-lg font-bold', healthColor)}>
                  {data.health_score}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('calibrationReview.blockA.healthScore', 'Score de sant\u00e9')}
                </p>
                <p className={cn('text-lg font-semibold capitalize', healthColor)}>
                  {data.health_score}/100 — {t(`calibrationReview.blockA.health.${data.health_label}`, data.health_label)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {data.health_narrative}
                </p>
              </div>
            </div>
          </div>

          {/* Confidence Score */}
          <div className={cn('rounded-lg border p-4', confStyle.bg, 'border-gray-200 dark:border-gray-700')}>
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center">
                <ScoreRing
                  score={data.confidence_score}
                  size={72}
                  className={confStyle.ring}
                />
                <Shield className={cn('absolute h-5 w-5', confStyle.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('calibrationReview.blockA.confidenceScore', 'Confiance')}
                </p>
                <p className={cn('text-lg font-semibold', confStyle.text)}>
                  {data.confidence_score}/100
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {data.confidence_narrative}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Yield potential */}
        {data.yield_range && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('calibrationReview.blockA.yieldPotential', 'Potentiel estim\u00e9')}
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {data.yield_range.min.toFixed(1).replace('.', ',')} {t('calibrationReview.blockA.to', '\u00e0')}{' '}
                {data.yield_range.max.toFixed(1).replace('.', ',')} {data.yield_range.unit}
              </p>
              {data.yield_range.wide_range_warning && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                  {t('calibrationReview.blockA.wideRange', 'Fourchette \u00e9largie, confiance r\u00e9duite')}
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t('calibrationReview.blockA.yieldDisclaimer', 'Estimation initiale \u2014 sera affin\u00e9e apr\u00e8s chaque r\u00e9colte')}
              </p>
            </div>
          </div>
        )}

        {/* Row 3: Strengths and Concerns */}
        {(data.strengths.length > 0 || data.concerns.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            {data.strengths.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('calibrationReview.blockA.strengths', 'Points forts')}
                </p>
                <div className="space-y-2">
                  {data.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {s.component}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.phrase}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Concerns */}
            {data.concerns.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('calibrationReview.blockA.concerns', "Points d'attention")}
                </p>
                <div className="space-y-2">
                  {data.concerns.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className="flex items-start gap-2 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1 -m-1 transition-colors"
                      onClick={() => onScrollToBlock?.(c.target_block)}
                    >
                      <AlertTriangle
                        className={cn(
                          'h-4 w-4 mt-0.5 flex-shrink-0',
                          c.severity === 'critique' ? 'text-red-500' : 'text-orange-500',
                        )}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {c.component}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'ml-2 text-xs',
                            c.severity === 'critique'
                              ? 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400'
                              : 'border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400',
                          )}
                        >
                          {c.severity === 'critique'
                            ? t('calibrationReview.blockA.critical', 'Critique')
                            : t('calibrationReview.blockA.vigilance', 'Vigilance')}
                        </Badge>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.phrase}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
