import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CloudOff, Droplets, ThermometerSun, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockCAnomalies as BlockCData } from '@/types/calibration-review';

interface BlockCAnomaliesProps {
  data: BlockCData;
}

function AnomalyIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'heat_stress':
      return <ThermometerSun className={className} />;
    case 'drought':
      return <Droplets className={className} />;
    case 'cloud_contamination':
      return <CloudOff className={className} />;
    case 'sudden_drop':
      return <Activity className={className} />;
    default:
      return <AlertTriangle className={className} />;
  }
}

export function BlockCAnomalies({ data }: BlockCAnomaliesProps) {
  const { t } = useTranslation('ai');

  if (!data.anomalies.length && !data.ruptures.length) {
    return null;
  }

  return (
    <Card data-block="C" className="overflow-hidden">
      <CardHeader className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            {t('calibrationReview.blockC.title', 'Anomalies détectées')}
          </CardTitle>
          <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
            {data.anomalies.length}
          </Badge>
        </div>
        {data.calibrage_limite && (
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            {t('calibrationReview.blockC.limitedWarning', 'Les anomalies limitent la fiabilité de la calibration.')}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {data.anomalies.map((anomaly, idx) => {
          return (
            <div key={`${anomaly.period}-${anomaly.type}-${idx}`} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <AnomalyIcon type={anomaly.type} className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{anomaly.period}</span>
                  <Badge variant="secondary" className="text-xs">
                    {anomaly.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{anomaly.impact}</p>
                {anomaly.sources.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {anomaly.sources.map((source, i) => (
                      <span key={i} className="text-[10px] text-muted-foreground bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {source}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {data.ruptures.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('calibrationReview.blockC.ruptures', 'Ruptures de données')}
            </p>
            {data.ruptures.map((rupture, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                <CloudOff className="h-3.5 w-3.5 shrink-0" />
                <span>{rupture.date}</span>
                <span className="text-xs">— {rupture.detail}</span>
              </div>
            ))}
          </div>
        )}

        {data.total_excluded_percent > 0 && (
          <div className={cn(
            "text-xs text-center py-2 rounded-md mt-2",
            data.total_excluded_percent > 30
              ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
              : "bg-gray-100 dark:bg-gray-800 text-muted-foreground"
          )}>
            {t('calibrationReview.blockC.excludedPercent', '{{percent}}% des données exclues', { percent: Math.round(data.total_excluded_percent) })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
