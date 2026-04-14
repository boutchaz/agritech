import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import type { PhenologyDashboardData, SeasonTimelineEntry } from '@/types/calibration-review';

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
  // phase_kc (8-stage) colors
  repos: '#9CA3AF',
  debourrement: '#22C55E',
  croissance: '#10B981',
  floraison: '#F59E0B',
  nouaison: '#EF4444',
  grossissement: '#F97316',
  maturation: '#8B5CF6',
  post_recolte: '#3B82F6',
};

const PHASE_LABELS: Record<string, string> = {
  DORMANCE: 'Dormance',
  DEBOURREMENT: 'Débourrement',
  FLORAISON: 'Floraison',
  NOUAISON: 'Nouaison',
  STRESS_ESTIVAL: 'Stress estival',
  REPRISE_AUTOMNALE: 'Reprise automnale',
  // phase_kc (8-stage) labels
  repos: 'Repos',
  debourrement: 'Débourrement',
  croissance: 'Croissance',
  floraison: 'Floraison',
  nouaison: 'Nouaison',
  grossissement: 'Grossissement',
  maturation: 'Maturation',
  post_recolte: 'Post Récolte',
};

/**
 * Canonical 8-stage phase_kc order (olive agronomic cycle from stades_bbch).
 * This is the ONLY display order — all dashboard components use this.
 */
const CANONICAL_PHASES: string[] = [
  'repos', 'debourrement', 'croissance', 'floraison',
  'nouaison', 'grossissement', 'maturation', 'post_recolte',
];

/**
 * Map 6-phase state machine names → canonical phase_kc names.
 * Allows dashboard to normalize any format to the 8-stage display.
 */
const PHASE_TO_CANONICAL: Record<string, string> = {
  // 6-phase → 8-phase mapping
  DORMANCE: 'repos',
  DEBOURREMENT: 'debourrement',
  FLORAISON: 'floraison',
  NOUAISON: 'nouaison',
  STRESS_ESTIVAL: 'grossissement', // summer stress ≈ fruit growth period
  REPRISE_AUTOMNALE: 'post_recolte', // autumn recovery ≈ post-harvest
};

function toCanonicalPhase(phase: string): string {
  return PHASE_TO_CANONICAL[phase] ?? phase;
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

function formatPhaseLabel(phase: string): string {
  if (PHASE_LABELS[phase]) return PHASE_LABELS[phase];
  return phase
    .toLowerCase()
    .split('_')
    .map((w) => (w ? `${w[0].toUpperCase()}${w.slice(1)}` : w))
    .join(' ');
}

function getPhaseColor(phase: string): string {
  if (PHASE_COLORS[phase]) return PHASE_COLORS[phase];
  const fallback = ['#14B8A6', '#8B5CF6', '#EC4899', '#F97316', '#10B981'];
  const hash = [...phase].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return fallback[hash % fallback.length];
}

/**
 * Filter out incomplete cycles (all transitions crammed within ~15 days = bad data).
 */
function isCompleteCycle(timeline: SeasonTimelineEntry): boolean {
  const dates = timeline.transitions
    .map((t) => t.start_date)
    .filter(Boolean)
    .sort();
  if (dates.length < 3) return false;
  const first = new Date(dates[0]).getTime();
  const last = new Date(dates[dates.length - 1]).getTime();
  const spanDays = (last - first) / (1000 * 60 * 60 * 24);
  return spanDays > 30; // cycle must span at least 30 days
}

// ── Phase Summary Cards ──

function PhaseSummaryCards({ timelines }: { timelines: SeasonTimelineEntry[] }) {
  const summaries = useMemo(() => {
    const validTimelines = timelines.filter(isCompleteCycle);
    const source = validTimelines.length > 0 ? validTimelines : timelines;

    // Accumulate GDD per canonical phase
    const acc = new Map<string, { gddSum: number; count: number }>();
    for (const timeline of source) {
      for (const transition of timeline.transitions) {
        if (!transition.phase || !transition.start_date) continue;
        const canonical = toCanonicalPhase(transition.phase);
        const current = acc.get(canonical) ?? { gddSum: 0, count: 0 };
        current.gddSum += transition.gdd_at_entry;
        current.count += 1;
        acc.set(canonical, current);
      }
    }

    // Always show all 8 canonical phases
    return CANONICAL_PHASES.map((phase) => {
      const data = acc.get(phase);
      return {
        phase,
        gddAvg: data && data.count > 0 ? data.gddSum / data.count : 0,
        validCycles: data?.count ?? 0,
      };
    });
  }, [timelines]);

  if (summaries.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {summaries.map((summary) => (
        <div
          key={summary.phase}
          className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-w-[150px]"
        >
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 text-center">
            {formatPhaseLabel(summary.phase)}
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {summary.validCycles > 0 ? summary.gddAvg.toFixed(1) : '—'}
          </span>
          <div className="flex gap-3 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
            <span>GDD moyen entrée</span>
            <span>{summary.validCycles} cycle{summary.validCycles !== 1 ? 's' : ''}</span>
          </div>
        </div>
      ))}
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
        const canonical = toCanonicalPhase(t.phase);
        return {
          phase: canonical,
          left: (start / 12) * 100,
          width: (width / 12) * 100,
          color: getPhaseColor(canonical),
          label: formatPhaseLabel(canonical),
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
    const validTimelines = timelines.filter(isCompleteCycle);
    const source = validTimelines.length > 0 ? validTimelines : timelines;

    // Accumulate per canonical phase
    const byPhase = new Map<
      string,
      { gddSum: number; count: number; confidenceCount: Record<string, number> }
    >();

    for (const tl of source) {
      for (const transition of tl.transitions) {
        if (!transition.phase || !transition.start_date) continue;
        const canonical = toCanonicalPhase(transition.phase);
        const current = byPhase.get(canonical) ?? { gddSum: 0, count: 0, confidenceCount: {} };
        current.gddSum += transition.gdd_at_entry;
        current.count += 1;
        current.confidenceCount[transition.confidence] =
          (current.confidenceCount[transition.confidence] ?? 0) + 1;
        byPhase.set(canonical, current);
      }
    }

    // Always show all 8 canonical phases
    return CANONICAL_PHASES.map((phase) => {
      const item = byPhase.get(phase);
      const dominantConfidence = item
        ? Object.entries(item.confidenceCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'MODEREE'
        : '—';
      return {
        phaseKey: phase,
        phase: formatPhaseLabel(phase),
        gdd: item && item.count > 0 ? Math.round((item.gddSum / item.count) * 10) / 10 : 0,
        samples: item?.count ?? 0,
        confidence: dominantConfidence,
      };
    });
  }, [timelines]);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="pb-2 pr-4 font-medium">Phase</th>
            <th className="pb-2 pr-4 font-medium">GDD moyen entrée</th>
            <th className="pb-2 pr-4 font-medium">Cycles</th>
            <th className="pb-2 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{row.phase}</td>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{row.gdd}</td>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{row.samples}</td>
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

      {/* Phase Summary Cards */}
      {data.timelines.length > 0 && (
        <div className="mb-6">
          <PhaseSummaryCards timelines={data.timelines} />
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

          {/* Legend — always shows all 8 canonical phases */}
          <div className="flex flex-wrap gap-3 mt-3">
            {CANONICAL_PHASES.map((phase) => (
                <div key={phase} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPhaseColor(phase) }} />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {formatPhaseLabel(phase)}
                  </span>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase Metrics Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {t('calibrationReview.phenology.metrics', 'Phase Metrics')}
        </h3>
        <PhaseMetricsTable timelines={data.timelines} />
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
