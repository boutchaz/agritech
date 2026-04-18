import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2 } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SpectralData } from '@/types/calibration-review';

interface SpectralChartProps {
  data: SpectralData;
}

const INDEX_COLORS: Record<string, string> = {
  NDVI: '#4a7c25',
  NIRv: '#2d5016',
  NDMI: '#2196f3',
  NDRE: '#ff9800',
  EVI: '#8bc34a',
  GCI: '#795548',
};

const AVAILABLE_INDICES = ['NDVI', 'NIRv', 'NDMI', 'NDRE', 'EVI'] as const;

type ChartRow = {
  date: string;
  value: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return months[d.getMonth()];
}

function IndexToggleRow({
  availableIndices,
  activeIndex,
  onSelect,
}: {
  availableIndices: string[];
  activeIndex: string;
  onSelect: (idx: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {availableIndices.map((idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(idx)}
          className={cn(
            'px-3 py-1 rounded text-xs font-semibold transition-colors',
            activeIndex === idx
              ? 'text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
          )}
          style={activeIndex === idx ? { backgroundColor: INDEX_COLORS[idx] ?? '#4a7c25' } : undefined}
        >
          {idx}
        </button>
      ))}
    </div>
  );
}

function SpectralChartPlot({
  chartData,
  activeIndex,
  pBand,
  excludedPeriods,
  heightClassName,
}: {
  chartData: ChartRow[];
  activeIndex: string;
  pBand: SpectralData['percentiles'][string] | undefined;
  excludedPeriods: SpectralData['excluded_periods'];
  heightClassName: string;
}) {
  return (
    <div className={cn('w-full', heightClassName)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(label) => formatDate(String(label))}
            formatter={(value) => [Number(value).toFixed(4), activeIndex]}
          />

          {pBand && (
            <ReferenceArea
              y1={pBand.p10}
              y2={pBand.p90}
              fill={INDEX_COLORS[activeIndex] ?? '#4a7c25'}
              fillOpacity={0.06}
              stroke="none"
            />
          )}

          {pBand && (
            <ReferenceArea
              y1={pBand.p25}
              y2={pBand.p75}
              fill={INDEX_COLORS[activeIndex] ?? '#4a7c25'}
              fillOpacity={0.12}
              stroke="none"
            />
          )}

          {pBand && (
            <ReferenceLine
              y={pBand.p50}
              stroke={INDEX_COLORS[activeIndex] ?? '#4a7c25'}
              strokeDasharray="6 3"
              strokeOpacity={0.4}
            />
          )}

          {/* Vertical markers only — labels moved below chart to avoid overlap */}
          {excludedPeriods.map((ep, i) => (
            <ReferenceLine
              key={i}
              x={ep.date}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
          ))}

          <Area
            type="monotone"
            dataKey="value"
            stroke={INDEX_COLORS[activeIndex] ?? '#4a7c25'}
            strokeWidth={2.5}
            fill={INDEX_COLORS[activeIndex] ?? '#4a7c25'}
            fillOpacity={0.08}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpectralChart({ data }: SpectralChartProps) {
  const { t } = useTranslation('ai');
  const [activeIndex, setActiveIndex] = useState<string>('NDVI');
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const series = data.indices[activeIndex] ?? [];
  const pBand = data.percentiles[activeIndex];

  const chartData = useMemo((): ChartRow[] => {
    if (!series.length) return [];
    return series
      .filter((p) => p.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({
        date: p.date,
        value: p.value,
        p10: pBand?.p10 ?? 0,
        p25: pBand?.p25 ?? 0,
        p50: pBand?.p50 ?? 0,
        p75: pBand?.p75 ?? 0,
        p90: pBand?.p90 ?? 0,
      }));
  }, [series, pBand]);

  const availableIndices = AVAILABLE_INDICES.filter((idx) => (data.indices[idx]?.length ?? 0) > 0);

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="spectral">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          2. {t('calibrationReview.spectral.title', 'SEUILS SPECTRAUX')}
        </h2>
        <p className="text-sm text-gray-400">{t('calibrationReview.spectral.noData', 'Pas de données spectrales disponibles')}</p>
      </div>
    );
  }

  const legendAndExcluded = (
    <>
      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 rounded-sm" style={{ backgroundColor: INDEX_COLORS[activeIndex], opacity: 0.12 }} />
          <span>P25-P75</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 rounded-sm" style={{ backgroundColor: INDEX_COLORS[activeIndex], opacity: 0.06 }} />
          <span>P10-P90</span>
        </div>
        {data.excluded_periods.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t-2 border-dashed border-red-400" />
            <span>{t('calibrationReview.spectral.excluded', 'Périodes exclues')}</span>
          </div>
        )}
      </div>

      {data.excluded_periods.length > 0 && (
        <div className="mt-3 rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 px-3 py-2">
          <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">
            {t('calibrationReview.spectral.excludedListTitle', 'Marqueurs sur le graphique')}
          </p>
          <ul className="space-y-1.5 text-xs text-red-900 dark:text-red-100">
            {data.excluded_periods.map((ep, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <time dateTime={ep.date} className="font-mono tabular-nums shrink-0 text-red-700 dark:text-red-300">
                  {formatDate(ep.date)}
                </time>
                <span className="min-w-0 break-words">{ep.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="spectral">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            2. {t('calibrationReview.spectral.title', 'SEUILS SPECTRAUX')}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <IndexToggleRow availableIndices={availableIndices} activeIndex={activeIndex} onSelect={setActiveIndex} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setFullscreenOpen(true)}
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              {t('calibrationReview.spectral.fullscreen', 'Plein écran')}
            </Button>
          </div>
        </div>

        {data.phenology_phases.length > 0 && (
          <div className="flex gap-0 mb-1 text-[10px] text-gray-400 dark:text-gray-500 overflow-hidden">
            {data.phenology_phases.map((phase, i) => (
              <div
                key={i}
                className="flex-1 text-center border-b border-dashed border-gray-200 dark:border-gray-700 pb-1 truncate px-1"
              >
                {phase.name}
              </div>
            ))}
          </div>
        )}

        <SpectralChartPlot
          chartData={chartData}
          activeIndex={activeIndex}
          pBand={pBand}
          excludedPeriods={data.excluded_periods}
          heightClassName="h-[280px]"
        />

        {legendAndExcluded}
      </div>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="flex max-h-[92dvh] w-[min(96vw,72rem)] max-w-[min(96vw,72rem)] flex-col gap-4 overflow-hidden p-4 sm:p-6">
          <DialogHeader className="shrink-0 space-y-1 text-left">
            <DialogTitle className="text-base sm:text-lg">
              {t('calibrationReview.spectral.fullscreenTitle', 'Seuils spectraux — vue agrandie')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            <IndexToggleRow availableIndices={availableIndices} activeIndex={activeIndex} onSelect={setActiveIndex} />
            <SpectralChartPlot
              chartData={chartData}
              activeIndex={activeIndex}
              pBand={pBand}
              excludedPeriods={data.excluded_periods}
              heightClassName="h-[min(72dvh,720px)] min-h-[280px] shrink-0"
            />
            {legendAndExcluded}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
