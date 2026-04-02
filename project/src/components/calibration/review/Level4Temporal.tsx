import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { Level4Temporal as Level4TemporalType } from '@/types/calibration-review';

interface Level4TemporalProps {
  data: Level4TemporalType;
}

export function Level4Temporal({ data }: Level4TemporalProps) {
  const { t } = useTranslation('ai');

  const timelineEvents = [
    { key: 'dormancy_exit', label: t('calibrationReview.level4.dormancyExit'), date: data.phenology_timeline.dormancy_exit },
    { key: 'peak', label: t('calibrationReview.level4.peak'), date: data.phenology_timeline.peak },
    { key: 'plateau_start', label: t('calibrationReview.level4.plateauStart'), date: data.phenology_timeline.plateau_start },
    { key: 'decline_start', label: t('calibrationReview.level4.declineStart'), date: data.phenology_timeline.decline_start },
    { key: 'dormancy_entry', label: t('calibrationReview.level4.dormancyEntry'), date: data.phenology_timeline.dormancy_entry },
  ];

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-500" />
          {t('calibrationReview.level4.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phenology Timeline */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level4.phenologyTimeline')}</h3>
          <div className="relative pt-2 pb-4">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-muted" />
            <div className="relative flex justify-between">
              {timelineEvents.map((event) => (
                <div key={event.key} className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 border-2 border-background z-10" />
                  <div className="mt-2 text-xs font-medium text-center max-w-[80px]">
                    {event.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {event.date || t('calibrationReview.level4.pending')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('calibrationReview.level4.confidence')}
          </h3>
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{Math.round(data.confidence.normalized_score * 100)}%</span>
              <span className="text-sm text-muted-foreground">{t('calibrationReview.level4.totalScore')}: {data.confidence.total_score} pts</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full", getConfidenceColor(data.confidence.normalized_score))} 
                style={{ width: `${data.confidence.normalized_score * 100}%` }}
              />
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {Object.entries(data.confidence.components).map(([key, comp]) => (
                <div key={key} className="text-xs">
                  <div className="text-muted-foreground mb-1 capitalize">{key.replace(/_/g, ' ')}</div>
                  <div className="font-medium">{comp.score} / {comp.max_score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calibration History */}
        {data.calibration_history && data.calibration_history.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('calibrationReview.level4.calibrationHistory')}
            </h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('calibrationReview.level4.date')}</TableHead>
                    <TableHead>{t('calibrationReview.level4.phase')}</TableHead>
                    <TableHead>{t('calibrationReview.level4.health')}</TableHead>
                    <TableHead>{t('calibrationReview.level4.confidencePct')}</TableHead>
                    <TableHead>{t('calibrationReview.level4.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.calibration_history.slice(0, 5).map((history) => (
                    <TableRow key={history.id}>
                      <TableCell className="text-xs">{new Date(history.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs capitalize">{history.maturity_phase.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-xs">{history.health_score != null ? `${history.health_score}%` : '-'}</TableCell>
                      <TableCell className="text-xs">{history.confidence_score != null ? `${Math.round(history.confidence_score * 100)}%` : '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {history.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
