import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { Calendar, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { confidenceToFraction, confidenceValueToPercent, formatConfidencePercent } from '@/lib/calibration-confidence';
import {
  defaultPhenologyYear,
  eligiblePhenologyYears,
  parsePhenologyDateValue,
} from '@/lib/calibration-phenology-years';
import { useTranslation } from 'react-i18next';
import type { Level4Temporal as Level4TemporalType } from '@/types/calibration-review';
import type { PhenologyDates, Step1Output } from '@/types/calibration-output';

interface Level4TemporalProps {
  data: Level4TemporalType;
  step1?: Step1Output;
  plantingYear?: number | null;
}

export function Level4Temporal({ data, step1, plantingYear }: Level4TemporalProps) {
  const { t, i18n } = useTranslation('ai');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const yearlyStages = data.phenology_timeline.yearly_stages;

  const eligible = useMemo(
    () =>
      eligiblePhenologyYears(
        yearlyStages as Record<string, PhenologyDates> | undefined,
        step1,
        plantingYear,
      ),
    [yearlyStages, step1, plantingYear],
  );

  const effectiveYear =
    selectedYear != null && eligible.includes(selectedYear)
      ? selectedYear
      : defaultPhenologyYear(eligible);

  const timelineDates = useMemo(() => {
    const mean = data.phenology_timeline;
    if (effectiveYear != null && yearlyStages?.[String(effectiveYear)]) {
      return yearlyStages[String(effectiveYear)];
    }
    return {
      dormancy_exit: mean.dormancy_exit,
      peak: mean.peak,
      plateau_start: mean.plateau_start,
      decline_start: mean.decline_start,
      dormancy_entry: mean.dormancy_entry,
    };
  }, [effectiveYear, yearlyStages, data.phenology_timeline]);

  // Chronological order must match backend step4 (_temporal_order_valid):
  // dormancy_exit < plateau_start <= peak < decline_start < dormancy_entry
  const timelineEvents = [
    { key: 'dormancy_exit', label: t('calibrationReview.level4.dormancyExit'), date: timelineDates.dormancy_exit },
    { key: 'plateau_start', label: t('calibrationReview.level4.plateauStart'), date: timelineDates.plateau_start },
    { key: 'peak', label: t('calibrationReview.level4.peak'), date: timelineDates.peak },
    { key: 'decline_start', label: t('calibrationReview.level4.declineStart'), date: timelineDates.decline_start },
    { key: 'dormancy_entry', label: t('calibrationReview.level4.dormancyEntry'), date: timelineDates.dormancy_entry },
  ];

  const hasMeanDates =
    Boolean(data.phenology_timeline.dormancy_exit) ||
    Boolean(data.phenology_timeline.peak) ||
    Boolean(data.phenology_timeline.plateau_start) ||
    Boolean(data.phenology_timeline.decline_start) ||
    Boolean(data.phenology_timeline.dormancy_entry);

  const getConfidenceColor = (fraction: number) => {
    if (fraction >= 0.8) return 'bg-green-500';
    if (fraction >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const currentConfidenceFrac =
    confidenceToFraction(data.confidence.normalized_score) ?? 0;
  const currentConfidencePct = confidenceValueToPercent(
    data.confidence.normalized_score,
  ) ?? 0;

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('calibrationReview.level4.phenologyTimeline')}
            </h3>
            {eligible.length > 0 && (
              <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[200px]">
                <span className="text-xs text-muted-foreground">
                  {t('calibrationReview.level4.phenologyCampaignYear')}
                </span>
                <Select
                  value={effectiveYear != null ? String(effectiveYear) : undefined}
                  onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
                >
                  <SelectTrigger
                    className="h-9 bg-background"
                    data-testid="calibration-review-phenology-year"
                  >
                    <SelectValue placeholder={t('calibrationReview.level4.pending')} />
                  </SelectTrigger>
                  <SelectContent>
                    {eligible.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {t('calibrationReview.level4.phenologyCampaignYearHint')}
                </p>
              </div>
            )}
          </div>
          {eligible.length === 0 && hasMeanDates && (
            <p className="text-xs text-muted-foreground">
              {t('calibrationReview.level4.phenologyMeanAcrossYears')}
            </p>
          )}
          <div className="relative pt-2 pb-4">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-muted" />
            <div className="relative flex justify-between">
              {timelineEvents.map((event) => {
                const dt = parsePhenologyDateValue(event.date);
                return (
                  <div key={event.key} className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 border-2 border-background z-10" />
                    <div className="mt-2 text-xs font-medium text-center max-w-[80px]">
                      {event.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 text-center max-w-[88px]">
                      {dt
                        ? dt.toLocaleDateString(i18n.language, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : event.date || t('calibrationReview.level4.pending')}
                    </div>
                  </div>
                );
              })}
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
              <span className="text-2xl font-bold">{currentConfidencePct}%</span>
              <span className="text-sm text-muted-foreground">{t('calibrationReview.level4.totalScore')}: {data.confidence.total_score} pts</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', getConfidenceColor(currentConfidenceFrac))}
                style={{ width: `${currentConfidencePct}%` }}
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
                  {data.calibration_history.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell className="text-xs">{new Date(history.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs capitalize">{history.phase_age.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-xs">{history.health_score != null ? `${history.health_score}%` : '-'}</TableCell>
                      <TableCell className="text-xs">
                        {history.confidence_score != null
                          ? formatConfidencePercent(history.confidence_score)
                          : '-'}
                      </TableCell>
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
