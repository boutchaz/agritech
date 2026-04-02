import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, Thermometer, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { Level1Decision as Level1DecisionType } from '@/types/calibration-review';

interface Level1DecisionProps {
  data: Level1DecisionType;
}

export function Level1Decision({ data }: Level1DecisionProps) {
  const { t } = useTranslation('ai');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getSeverityLabel = (severity: string) => {
    const key = `calibrationReview.level1.severity${severity.charAt(0).toUpperCase()}${severity.slice(1)}` as const;
    return t(key, severity);
  };

  const getSourceLabel = (source: string) => {
    if (source === 'anomaly') return t('calibrationReview.level1.sourceAnomaly');
    if (source === 'extreme_event') return t('calibrationReview.level1.sourceExtremeEvent');
    return source.replace('_', ' ');
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          {t('calibrationReview.level1.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Phase */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level1.currentPhase')}</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-lg">{data.current_phase.name}</span>
            <Badge 
              variant="outline" 
              className={cn(
                data.current_phase.method === 'heuristic' 
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400' 
                  : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
              )}
            >
              {data.current_phase.method === 'heuristic' ? t('calibrationReview.level1.methodHeuristic') : t('calibrationReview.level1.methodProtocol')}
            </Badge>
            <span className="text-sm text-muted-foreground">{data.current_phase.confidence}</span>
          </div>
          {(data.current_phase.date_start || data.current_phase.estimated_date_end) && (
            <div className="text-sm text-muted-foreground">
              {data.current_phase.date_start && <span>{t('calibrationReview.level1.from')}: {data.current_phase.date_start}</span>}
              {data.current_phase.estimated_date_end && <span className="ml-4">{t('calibrationReview.level1.estEnd')}: {data.current_phase.estimated_date_end}</span>}
            </div>
          )}
        </div>

        {/* Next Phase */}
        {data.next_phase.name && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level1.nextPhase')}</h3>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{data.next_phase.name}</span>
              {data.next_phase.timing_estimate && (
                <span className="text-muted-foreground">({data.next_phase.timing_estimate})</span>
              )}
            </div>
            {data.next_phase.condition && (
              <p className="text-sm text-muted-foreground italic">{t('calibrationReview.level1.condition')}: {data.next_phase.condition}</p>
            )}
          </div>
        )}

        {/* Detected Signals */}
        {data.detected_signals.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level1.detectedSignals')}</h3>
            <div className="space-y-2">
              {data.detected_signals.map((signal, idx) => (
                <Alert key={`${signal.type}-${idx}`} className={cn("py-2 px-3", getSeverityColor(signal.severity))}>
                  <div className="flex items-start gap-3">
                    {signal.source === 'extreme_event' ? (
                      <Thermometer className="h-4 w-4 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{signal.type}</span>
                        <span className="text-xs opacity-80">{signal.date}</span>
                      </div>
                      <AlertDescription className="text-xs mt-1">
                        {signal.message}
                      </AlertDescription>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase bg-background/50">
                          {getSeverityLabel(signal.severity)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase bg-background/50">
                          {getSourceLabel(signal.source)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Operational Alerts */}
        {data.operational_alerts && data.operational_alerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level1.operationalAlerts')}</h3>
            <div className="space-y-2">
              {data.operational_alerts.map((alert, idx) => (
                <Alert key={`${alert.code}-${idx}`} className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <div className="ml-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-red-800 dark:text-red-300">{alert.category}</span>
                      <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 dark:border-red-800 dark:text-red-400">
                        {alert.code}
                      </Badge>
                    </div>
                    <AlertDescription className="text-xs mt-1 text-red-700 dark:text-red-400">
                      {alert.message}
                    </AlertDescription>
                  </div>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
