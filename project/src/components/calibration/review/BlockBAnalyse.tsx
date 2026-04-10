import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Droplets, Leaf, Sprout, Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockBAnalyse as BlockBData } from '@/types/calibration-blocks-review';

interface BlockBAnalyseProps {
  data: BlockBData;
}

function GaugeBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ZoneBar({ zones }: { zones: BlockBData['heatmap']['zone_summary'] }) {
  const total = zones.reduce((sum, z) => sum + z.percent, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      {/* Stacked horizontal bar */}
      <div className="flex h-6 rounded-md overflow-hidden">
        {zones.map((zone) => (
          <div
            key={zone.class_name}
            className="relative group"
            style={{
              width: `${(zone.percent / total) * 100}%`,
              backgroundColor: zone.color,
              minWidth: zone.percent > 0 ? '4px' : '0',
            }}
          >
            {zone.percent >= 10 && (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                {Math.round(zone.percent)}%
              </span>
            )}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {zones.map((zone) => (
          <div key={zone.class_name} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: zone.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {zone.class_name} ({Math.round(zone.percent)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BlockBAnalyse({ data }: BlockBAnalyseProps) {
  const { t } = useTranslation('ai');

  return (
    <div className="space-y-4" data-block="B">
      {/* B1, B2, B3 — Index cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* B1: Vigor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sprout className="h-4 w-4 text-green-500" />
              {t('calibrationReview.blockB.vigor', 'Vigueur v\u00e9g\u00e9tative')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.vigor.valeur_mediane.toFixed(4)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.vigor.indice}
              </span>
            </div>
            <GaugeBar value={data.vigor.gauge.value} color={data.vigor.gauge.color} />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.vigor.position_referentiel} {t('calibrationReview.blockB.ofReferential', 'du r\u00e9f\u00e9rentiel')}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">{data.vigor.phrase}</p>
          </CardContent>
        </Card>

        {/* B2: Hydric */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              {t('calibrationReview.blockB.hydric', '\u00c9tat hydrique')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.hydric.valeur_mediane.toFixed(4)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.hydric.indice}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {data.hydric.cross_diagnosis_text}
            </p>
            <div className="flex flex-wrap gap-1">
              {data.hydric.sources_used.map((src, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {src}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* B3: Nutritional */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-500" />
              {t('calibrationReview.blockB.nutritional', '\u00c9tat nutritionnel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.nutritional.valeur_mediane.toFixed(4)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.nutritional.indice}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {data.nutritional.cross_diagnosis_text}
            </p>
            <div className="flex flex-wrap gap-1">
              {data.nutritional.sources_used.map((src, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {src}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* B4: Heatmap / Zone summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t('calibrationReview.blockB.heatmap', 'Homog\u00e9n\u00e9it\u00e9 spatiale')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.heatmap.available ? (
            <div className="space-y-3">
              <ZoneBar zones={data.heatmap.zone_summary} />
              {data.heatmap.date_image && (
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {t('calibrationReview.blockB.basedOnEVI', 'Bas\u00e9e sur EVI \u2014 image Sentinel-2 du')}{' '}
                  {new Date(data.heatmap.date_image).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-gray-400 dark:text-gray-500">
              <Clock className="h-5 w-5 mr-2" />
              <span className="text-sm">{data.heatmap.blocked_message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* B6: Heterogeneity flag */}
      {data.heterogeneity_flag && (
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
            {t('calibrationReview.blockB.heterogeneity', 'H\u00e9t\u00e9rog\u00e9n\u00e9it\u00e9 significative')}
          </span>
        </div>
      )}

      {/* B11 + B13: Stability and depth */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span>{t('calibrationReview.blockB.stability', 'Stabilit\u00e9 temporelle')} :</span>
          <Badge
            variant="outline"
            className={cn(
              data.temporal_stability.label === 'stable'
                ? 'border-green-300 text-green-600 dark:border-green-700 dark:text-green-400'
                : data.temporal_stability.label === 'moderee'
                  ? 'border-yellow-300 text-yellow-600 dark:border-yellow-700 dark:text-yellow-400'
                  : 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400',
            )}
          >
            {data.temporal_stability.label === 'stable'
              ? t('calibrationReview.blockB.stable', 'Stable')
              : data.temporal_stability.label === 'moderee'
                ? t('calibrationReview.blockB.moderate', 'Mod\u00e9r\u00e9e')
                : t('calibrationReview.blockB.strong', 'Forte')}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Info className="h-3 w-3" />
          {t('calibrationReview.blockB.historyDepth', 'Calibrage bas\u00e9 sur')} {data.history_depth.months}{' '}
          {t('calibrationReview.blockB.monthsHistory', "mois d'historique satellite")}
        </div>
      </div>
    </div>
  );
}
