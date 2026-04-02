import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CloudOff, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Level5QualityAudit as Level5QualityAuditType } from '@/types/calibration-review';

interface Level5QualityAuditProps {
  data: Level5QualityAuditType;
}

export function Level5QualityAudit({ data }: Level5QualityAuditProps) {
  const { t } = useTranslation('ai');

  return (
    <Card className="border-l-4 border-l-slate-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-500" />
          {t('calibrationReview.level5.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtering Stats */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level5.filtering')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-1">{t('calibrationReview.level5.totalImages')}</div>
              <div className="text-lg font-semibold">{data.filtering.total_images_input}</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
              <div className="text-xs text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {t('calibrationReview.level5.retained')}
              </div>
              <div className="text-lg font-semibold text-green-800 dark:text-green-300">
                {data.filtering.images_retained}
              </div>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/30">
              <div className="text-xs text-orange-700 dark:text-orange-400 mb-1 flex items-center gap-1">
                <CloudOff className="h-3 w-3" /> {t('calibrationReview.level5.rejected')}
              </div>
              <div className="text-lg font-semibold text-orange-800 dark:text-orange-300">
                {data.filtering.images_rejected_cloud}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-1">{t('calibrationReview.level5.cloudCoverage')}</div>
              <div className="text-lg font-semibold">{data.filtering.average_cloud_coverage.toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-1">{t('calibrationReview.level5.outliersRemoved')}</div>
              <div className="text-lg font-semibold">{data.filtering.outliers_removed}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-1">{t('calibrationReview.level5.interpolatedDates')}</div>
              <div className="text-lg font-semibold">{data.filtering.interpolated_dates.length}</div>
            </div>
          </div>
        </div>

        {/* Quality Flags */}
        {data.data_quality_flags && data.data_quality_flags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level5.qualityFlags')}</h3>
            <div className="flex flex-wrap gap-2">
              {data.data_quality_flags.map((flag) => (
                <Badge key={`flag-${flag}`} variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {flag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Excluded Cycles */}
        {data.excluded_cycles && data.excluded_cycles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level5.excludedCycles')}</h3>
            <div className="flex flex-wrap gap-2">
              {data.excluded_cycles.map((cycle) => (
                <Badge key={`cycle-${cycle}`} variant="secondary">
                  {cycle}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {data.notes && data.notes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level5.notes')}</h3>
            <ul className="space-y-2">
              {data.notes.map((note) => (
                <li key={`note-${note.substring(0, 20)}`} className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md border">
                  <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
