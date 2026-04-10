import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info } from 'lucide-react';
import type { HeatmapData, SpatialPatterns } from '@/types/calibration-review';

interface ZoneMapProps {
  heatmap: HeatmapData;
  spatialPatterns: SpatialPatterns | null;
  heterogeneityFlag: boolean;
}

const ZONE_DESCRIPTIONS: Record<string, string> = {
  A: 'très vigoureuse, vert foncé',
  B: 'vigoureuse, vert moyen',
  C: 'normale, vert clair',
  D: 'faible, orange',
  E: 'problématique, rouge',
};

export function ZoneMap({ heatmap, spatialPatterns, heterogeneityFlag }: ZoneMapProps) {
  const { t } = useTranslation('ai');

  const sortedZones = useMemo(
    () => [...heatmap.zone_summary].sort((a, b) => {
      const order = ['A', 'B', 'C', 'D', 'E'];
      return order.indexOf(a.class_name) - order.indexOf(b.class_name);
    }),
    [heatmap.zone_summary],
  );

  const totalPercent = sortedZones.reduce((sum, z) => sum + z.percent, 0);

  if (!heatmap.available) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="zones">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          3. {t('calibrationReview.zones.title', 'ZONAGE INTRA-PARCELLAIRE')}
        </h2>
        <div className="flex items-center justify-center h-40 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-gray-400">
          <Info className="h-5 w-5 mr-2" />
          <span className="text-sm">{heatmap.blocked_message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="zones">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        3. {t('calibrationReview.zones.title', 'ZONAGE INTRA-PARCELLAIRE')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Map placeholder / zones visual */}
        <div className="relative bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden min-h-[220px] flex items-center justify-center">
          {heatmap.zones_geojson ? (
            <div className="w-full h-full p-4">
              {/* Zone blocks as a simplified grid representation */}
              <div className="grid grid-cols-5 gap-1 h-full">
                {sortedZones.map((zone) => {
                  const cells = Math.max(1, Math.round((zone.percent / 100) * 25));
                  return Array.from({ length: cells }).map((_, i) => (
                    <div
                      key={`${zone.class_name}-${i}`}
                      className="rounded-sm min-h-[20px]"
                      style={{ backgroundColor: zone.color }}
                    />
                  ));
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 dark:text-gray-500">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm">{t('calibrationReview.zones.mapPlaceholder', 'Carte de zonage')}</p>
            </div>
          )}

          {/* Pattern detected overlay */}
          {spatialPatterns?.detected && (
            <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium">Pattern detected:</span> {spatialPatterns.message}
            </div>
          )}
        </div>

        {/* Right: Legend + details */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('calibrationReview.zones.rasterPixels', 'Raster pixels :')}
            </h3>
            <div className="space-y-2">
              {sortedZones.map((zone) => (
                <div key={zone.class_name} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: zone.color }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    Classe {zone.class_name} ({ZONE_DESCRIPTIONS[zone.class_name] ?? zone.label})
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {Math.round(zone.percent)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Heterogeneity flag */}
          {heterogeneityFlag && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                {t('calibrationReview.blockB.heterogeneity', 'Hétérogénéité significative')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Zone distribution bar */}
      {sortedZones.length > 0 && totalPercent > 0 && (
        <div className="mt-5">
          <div className="flex h-8 rounded-lg overflow-hidden">
            {sortedZones.map((zone) => (
              <div
                key={zone.class_name}
                className="relative flex items-center justify-center text-white text-xs font-bold"
                style={{
                  width: `${(zone.percent / totalPercent) * 100}%`,
                  backgroundColor: zone.color,
                  minWidth: zone.percent > 0 ? '24px' : '0',
                }}
              >
                {zone.percent >= 8 && `${Math.round(zone.percent)}%`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date image info */}
      {heatmap.date_image && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
          <Info className="h-3 w-3" />
          {t('calibrationReview.blockB.basedOnEVI', 'Basée sur EVI — image Sentinel-2 du')}{' '}
          {new Date(heatmap.date_image).toLocaleDateString('fr-FR')}
        </p>
      )}
    </div>
  );
}
