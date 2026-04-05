import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { Level2Diagnostic as Level2DiagnosticType } from '@/types/calibration-review';

interface Level2DiagnosticProps {
  data: Level2DiagnosticType;
}

export function Level2Diagnostic({ data }: Level2DiagnosticProps) {
  const { t } = useTranslation('ai');

  const getSignalStateColor = (state: string) => {
    switch (state) {
      case 'SIGNAL_PUR': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'MIXTE_MODERE': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case 'DOMINE_ADVENTICES': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case 'NON_DISPONIBLE': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const getHealthColor = (value: number) => {
    if (value >= 70) return 'bg-green-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const healthComponents = [
    { key: 'vigor', label: t('calibrationReview.level2.vigor'), value: data.health_components.vigor },
    { key: 'temporal_stability', label: t('calibrationReview.level2.temporalStability'), value: data.health_components.temporal_stability },
    { key: 'stability', label: t('calibrationReview.level2.stability'), value: data.health_components.stability },
    { key: 'hydric', label: t('calibrationReview.level2.hydric'), value: data.health_components.hydric },
    { key: 'nutritional', label: t('calibrationReview.level2.nutritional'), value: data.health_components.nutritional },
  ];

  return (
    <Card className="border-l-4 border-l-indigo-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-500" />
          {t('calibrationReview.level2.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Signal State & Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level2.signalState')}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("px-2 py-1", getSignalStateColor(data.signal_state))}>
                {data.signal_state.replace(/_/g, ' ')}
              </Badge>
            </div>
            {data.signal_state_note && (
              <p className="text-xs text-muted-foreground mt-1">{data.signal_state_note}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level2.mode')}</h3>
            <div className="flex items-center gap-2">
              {data.mode === 'NORMAL' ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : data.mode === 'AMORCAGE' ? (
                <Info className="h-4 w-4 text-blue-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="font-medium">{data.mode === 'NORMAL' ? t('calibrationReview.level2.modeNormal') : data.mode === 'AMORCAGE' ? t('calibrationReview.level2.modeAmorcage') : data.mode}</span>
            </div>
            <p className="text-xs text-muted-foreground">{data.mode_detail}</p>
          </div>
        </div>

        {/* Health Components */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level2.healthComponents')}</h3>
          <div className="space-y-3">
            {healthComponents.map((comp) => (
              <div key={comp.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{comp.label}</span>
                  <span className="font-medium">{comp.value}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", getHealthColor(comp.value))} 
                    style={{ width: `${comp.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alternance */}
        {data.alternance && data.alternance.detected && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border/50">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-500" />
              {t('calibrationReview.level2.alternance')}
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('calibrationReview.level2.currentYear')}: </span>
                <Badge variant="outline" className={data.alternance.current_year_type === 'on' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'}>
                  {data.alternance.current_year_type === 'on' ? t('calibrationReview.level2.onYear') : data.alternance.current_year_type === 'off' ? t('calibrationReview.level2.offYear') : t('calibrationReview.level2.unknown')}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t('calibrationReview.level4.confidence')}: </span>
                <span className="font-medium">{Math.round(data.alternance.confidence * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Annotations */}
        {data.annotations && data.annotations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level2.annotations')}</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {data.annotations.map((note, noteIdx) => (
                <li key={`annotation-${noteIdx}-${note.substring(0, 10)}`}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
