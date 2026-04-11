import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import type { PhenologyDashboardData, PhenologyMeanStage, SeasonTimelineEntry } from '@/types/calibration-review';

interface PhenologyDashboardProps {
  data: PhenologyDashboardData;
}

const PHASE_COLORS: Record<string, string> = {
  DORMANCE: '#9CA3AF',
  DEBOURREMENT: '#22C55E',
  FLORAISON: '#F59E0B',
  NOUAISON: '#EF4444',
  STRESS_ESTIVAL: '#DC2626',
  REPRISE_AUTOMNALE: '#3B82F6',
};

const PHASE_LABELS: Record<string, string> = {
  DORMANCE: 'Dormance',
  DEBOURREMENT: 'Débourrement',
  FLORAISON: 'Floraison',
  NOUAISON: 'Nouaison',
  STRESS_ESTIVAL: 'Stress Estival',
  REPRISE_AUTOMNALE: 'Reprise Automnale',
};

const STAGE_LABELS: Record<string, string> = {
  dormancy_exit: 'Dormancy Exit',
  plateau_start: 'Plateau Start',
  peak: 'Peak',
  decline_start: 'Decline Start',
  dormancy_entry: 'Dormancy Entry',
};

function formatDateLong(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Month labels for the timeline header */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Convert a date string to a fractional month position (0-12) */
function dateToMonthPosition(dateStr: string): number {
  try {
    const d = new Date(dateStr);
    return d.getMonth() + d.getDate() / 31;
  } catch {
    return 0;
  }
}

// ── Stage Cards Row ──

function StageCard({ stage }: { stage: PhenologyMeanStage }) {
  return (
    <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-w-[120px]">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {STAGE_LABELS[stage.key] ?? stage.label}
      </span>
      <span className="text-lg font-bold text-gray-900 dark:text-white">
        {formatDateLong(stage.date)}
      </span>
      <div className="flex gap-3 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        <span>Var: {stage.variability_days > 0 ? `\u00B1${Math.round(stage.variability_days)} days` : '0 days'}</span>
        <span>GDD: {stage.gdd_correlation !== 0 ? stage.gdd_correlation.toFixed(2) : '0'}</span>
      </div>
    </div>
  );
}

// ── Timeline Bar ──

function TimelineBar({ timeline }: { timeline: SeasonTimelineEntry }) {
  const segments = useMemo(() => {
    return timeline.transitions
      .filter((t) => t.start_date)
      .map((t) => {
        const start = dateToMonthPosition(t.start_date);
        const end = t.end_date ? dateToMonthPosition(t.end_date) : start + 1;
        const width = Math.max(end - start, 0.3);
        return {
          phase: t.phase,
          left: (start / 12) * 100,
          width: (width / 12) * 100,
          color: PHASE_COLORS[t.phase] ?? '#9CA3AF',
          label: PHASE_LABELS[t.phase] ?? t.phase,
        };
      });
  }, [timeline.transitions]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-right shrink-0">
        {timeline.year}
      </span>
      <div className="relative flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="absolute top-0 h-full rounded-full"
            style={{
              left: `${seg.left}%`,
              width: `${Math.min(seg.width, 100 - seg.left)}%`,
              backgroundColor: seg.color,
            }}
            title={`${seg.label}: ${timeline.transitions[i]?.start_date ?? ''} → ${timeline.transitions[i]?.end_date ?? ''}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Phase Metrics Table ──

function PhaseMetricsTable({ timelines }: { timelines: SeasonTimelineEntry[] }) {
  const rows = useMemo(() => {
    const result: Array<{
      year: number;
      phase: string;
      gdd: number;
      confidence: string;
      variability: string;
    }> = [];

    for (const tl of timelines) {
      // Pick the most representative transition per year (skip DORMANCE)
      const main = tl.transitions.find(
        (t) => t.phase !== 'DORMANCE' && t.phase !== 'DEBOURREMENT',
      ) ?? tl.transitions[tl.transitions.length - 1];
      if (!main) continue;
      result.push({
        year: tl.year,
        phase: PHASE_LABELS[main.phase] ?? main.phase,
        gdd: Math.round(main.gdd_at_entry * 10) / 10,
        confidence: main.confidence,
        variability: '—',
      });
    }
    return result;
  }, [timelines]);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="pb-2 pr-4 font-medium">Year</th>
            <th className="pb-2 pr-4 font-medium">Phase</th>
            <th className="pb-2 pr-4 font-medium">GDD at Entry</th>
            <th className="pb-2 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{row.year}</td>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{row.phase}</td>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{row.gdd}</td>
              <td className="py-2">
                <ConfidenceBadge level={row.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    ELEVEE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    MODEREE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    FAIBLE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    TRES_FAIBLE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] ?? colors.MODEREE}`}>
      {level === 'ELEVEE' ? 'Elevée' : level === 'MODEREE' ? 'Modérée' : level === 'FAIBLE' ? 'Faible' : 'Très faible'}
    </span>
  );
}

// ── Summary Insight Cards ──

function InsightCards({ meanStages }: { meanStages: PhenologyMeanStage[] }) {
  const insights = useMemo(() => {
    if (meanStages.length === 0) return null;

    const withVariability = meanStages.filter((s) => s.variability_days > 0);
    const mostVariable = withVariability.length > 0
      ? withVariability.reduce((a, b) => (a.variability_days > b.variability_days ? a : b))
      : null;

    const mostStable = meanStages.reduce((a, b) => (a.variability_days < b.variability_days ? a : b));

    const withCorrelation = meanStages.filter((s) => s.gdd_correlation !== 0);
    const strongestCorr = withCorrelation.length > 0
      ? withCorrelation.reduce((a, b) => (Math.abs(a.gdd_correlation) > Math.abs(b.gdd_correlation) ? a : b))
      : null;

    return { mostVariable, mostStable, strongestCorr };
  }, [meanStages]);

  if (!insights) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {insights.mostVariable && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <Activity className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Most Variable Stage</p>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {STAGE_LABELS[insights.mostVariable.key] ?? insights.mostVariable.label}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {'\u00B1'} {Math.round(insights.mostVariable.variability_days)} days
            </p>
          </div>
        </div>
      )}

      {insights.strongestCorr && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <TrendingDown className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Strongest GDD Correlation</p>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              {STAGE_LABELS[insights.strongestCorr.key] ?? insights.strongestCorr.label}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              {insights.strongestCorr.gdd_correlation.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-green-800 dark:text-green-300">Most Stable Stage</p>
          <p className="text-sm font-semibold text-green-900 dark:text-green-200">
            {STAGE_LABELS[insights.mostStable.key] ?? insights.mostStable.label}
          </p>
          <p className="text-xs text-green-700 dark:text-green-400">
            {insights.mostStable.variability_days > 0
              ? `${Math.round(insights.mostStable.variability_days)} days`
              : '0 days'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export function PhenologyDashboard({ data }: PhenologyDashboardProps) {
  const { t } = useTranslation('ai');

  if (!data.available) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="phenology">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {t('calibrationReview.phenology.title', 'Crop Phenology Dashboard')}
        </h2>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
          {data.year_range && (
            <span>
              Year Range: <span className="font-medium text-gray-700 dark:text-gray-300">{data.year_range}</span>
            </span>
          )}
          {data.mode && (
            <span>
              Mode:{' '}
              <span className={`font-semibold ${data.mode === 'AMORCAGE' ? 'text-amber-600' : 'text-green-600'}`}>
                {data.mode === 'AMORCAGE' ? 'AMORCAGE' : 'NORMAL'}
              </span>
            </span>
          )}
          {data.referential_cycle_used && (
            <span>
              Cycle: <span className="font-medium text-gray-700 dark:text-gray-300">Referential</span>
            </span>
          )}
        </div>
      </div>

      {/* Mean Stage Cards */}
      {data.mean_stages.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
          {data.mean_stages
            .filter((s) => s.date)
            .map((stage) => (
              <StageCard key={stage.key} stage={stage} />
            ))}
        </div>
      )}

      {/* Timeline */}
      {data.timelines.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('calibrationReview.phenology.timeline', 'Phenological Stages Timeline')}
            {data.year_range && (
              <span className="ml-2 text-xs font-normal text-gray-400">({data.year_range})</span>
            )}
          </h3>

          {/* Month header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12" />
            <div className="flex-1 flex">
              {MONTHS.map((m) => (
                <span key={m} className="flex-1 text-center text-[10px] text-gray-400 dark:text-gray-500">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Year bars */}
          <div className="space-y-2">
            {data.timelines.map((tl) => (
              <TimelineBar key={tl.year} timeline={tl} />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(PHASE_COLORS)
              .filter(([phase]) => phase !== 'DORMANCE')
              .map(([phase, color]) => (
                <div key={phase} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {PHASE_LABELS[phase] ?? phase}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Phase Metrics Table + Insight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('calibrationReview.phenology.metrics', 'Phase Metrics')}
          </h3>
          <PhaseMetricsTable timelines={data.timelines} />
        </div>

        <div className="space-y-3">
          <InsightCards meanStages={data.mean_stages} />
        </div>
      </div>

      {/* Mode note */}
      {data.mode === 'AMORCAGE' && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-4 flex items-center gap-1">
          <Info className="h-3 w-3" />
          {t('calibrationReview.phenology.amorcageNote', 'Mode AMORCAGE: fewer than 3 complete cycles available — confidence levels are downgraded.')}
        </p>
      )}
    </div>
  );
}
