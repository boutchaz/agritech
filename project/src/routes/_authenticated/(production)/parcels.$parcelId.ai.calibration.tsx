import React, { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAICalibration } from '@/hooks/useAICalibration';
import { useAIDiagnostics } from '@/hooks/useAIDiagnostics';
import { useUpdateParcel, useParcelById } from '@/hooks/useParcelsQuery';
import { useCalibrationReport,
useCalibrationPhase,
useCalibrationHistory,
useValidateCalibration,
useNutritionSuggestion,
useConfirmNutritionOption, } from '@/hooks/useCalibrationReport';
import { useCalibrationProgress, type CalibrationProgressEvent } from '@/hooks/useCalibrationSocket';
import { useAIPlan } from '@/hooks/useAIPlan';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';
import type { CalibrationHistoryRecord } from '@/lib/api/calibration-output';
import type {
  CalibrationOutput,
  AnomalyRecord,
  Recommendation,
  SeverityLevel,
  CalibrationMaturityPhase,
  NutritionOption,
  IndexTimePoint,
  SpectralPercentiles,
  ZoneSummary,
  MonthlyWeatherAggregate,
  ExtremeEvent,
  ConfidenceComponent,
} from '@/types/calibration-output';
import type { CalibrationPhase } from '@/lib/api/calibration-output';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import {
  BrainCircuit,
  Play,
  AlertCircle,
  Satellite,
  CloudOff,
  CloudRain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Target,
  Leaf,
  Activity,
  BarChart3,
  Shield,
  Calendar,
  Thermometer,
  AlertTriangle,
  Info,
  Zap,
  TrendingUp,
  TreePine,
  Save,
  GitCompareArrows,
  Eye,
  ArrowRight,
  Lightbulb,
  FileText,
  Sparkles,
} from 'lucide-react';
import { SelectionCard } from '@/components/onboarding';
import { ButtonLoader, SectionLoader } from '@/components/ui/loader';
import { CalibrationWizard } from '@/components/calibration/CalibrationWizard';
import { RecalibrationWizard } from '@/components/calibration/RecalibrationWizard';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AnnualRecalibrationWizard } from '@/components/calibration/AnnualRecalibrationWizard';
import { CalibrationRunInputsPanel } from '@/components/calibration/CalibrationRunInputsPanel';
import { CalibrationReviewSection } from '@/components/calibration/review/CalibrationReviewSection';
import { useAnnualEligibility } from '@/hooks/useAnnualRecalibration';
import { annualPlanStatusLabel } from '@/lib/farmerFriendlyLabels';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const CollapsibleSection = ({
  title,
  icon,
  defaultOpen = true,
  badge,
  children,
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {icon}
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          {badge}
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </Button>
      {isOpen && <div className="p-4 bg-white dark:bg-gray-800">{children}</div>}
    </div>
  );
};

const MATURITY_LABELS: Record<CalibrationMaturityPhase, string> = {
  juvenile: 'Juvenile',
  entree_production: 'Early Production',
  pleine_production: 'Full Production',
  maturite_avancee: 'Advanced Maturity',
  senescence: 'Senescence',
  unknown: 'Unknown',
};

const SEVERITY_COLORS: Record<SeverityLevel, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', dot: 'bg-blue-500' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', dot: 'bg-yellow-500' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', dot: 'bg-orange-500' },
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', dot: 'bg-red-500' },
};

const ZONE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  E: '#ef4444',
};

const CHART_COLORS = {
  ndvi: '#22c55e',
  ndmi: '#3b82f6',
  ndre: '#eab308',
  precip: '#3b82f6',
  gdd: '#f59e0b',
  band: '#22c55e',
};

const DATA_QUALITY_FLAG_LABELS: Record<string, string> = {
  insufficient_satellite_data: 'Limited satellite observations — results may be less reliable',
  single_pixel_zones: 'Zone analysis uses parcel-level summary (per-pixel rasters not yet available)',
  evergreen_phenology_approximate: 'Phenological stages are approximate for this evergreen crop',
};

const HEALTH_COMPONENT_LABELS: Record<string, string> = {
  vigor: 'Vigor',
  temporal_stability: 'Temporal Stability',
  homogeneity: 'Temporal Stability',
  stability: 'Stability',
  hydric: 'Hydric Status',
  nutritional: 'Nutritional Status',
};

function healthScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function healthBarColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toSeverityLevel(value: string): SeverityLevel {
  if (value === 'high' || value === 'medium' || value === 'low' || value === 'critical') {
    return value;
  }
  return 'low';
}

const PhaseBanner = ({ phase }: { phase: CalibrationPhase }) => {
  if (phase === 'calibrated') {
    return (
      <div
        className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30 p-4"
        data-testid="calibration-phase-banner"
        data-phase="calibrated"
      >
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Awaiting Validation</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Review the calibration report below and validate to activate AI diagnostics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'awaiting_nutrition_option') {
    return (
      <div
        className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30 p-4"
        data-testid="calibration-phase-banner"
        data-phase="awaiting_nutrition_option"
      >
        <div className="flex items-center space-x-3">
          <Leaf className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Select Nutrition Option</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Choose a nutrition management option to complete calibration setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'active') {
    return (
      <div
        className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800/30 p-4"
        data-testid="calibration-phase-banner"
        data-phase="active"
      >
        <div className="flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100">Calibration Active</h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              AI diagnostics and monitoring are fully operational for this parcel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Normalize confidence score to 0-1 range.
 * Handles both decimal (0.4) and percentage (40) formats from the API.
 */
function normalizeConfidenceScore(score: number): number {
  if (score > 1) {
    return score / 100;
  }
  return score;
}

const ExecutiveSummary = ({ output, t }: { output: CalibrationOutput; t: (key: string) => string }) => {
  const health = output.step8?.health_score;
  const confidence = output.confidence;
  const normalizedConfidence = confidence ? normalizeConfidenceScore(confidence.normalized_score) : 0;
  const yieldPotential = output.step6?.yield_potential;
  const alternance = output.step6?.alternance;
  const zones = output.step7?.zone_summary;

  if (!health) return null;

  return (
    <div className="space-y-6" data-testid="calibration-executive-summary">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Health Score</div>
          <div className="flex items-end space-x-3">
            <span className={`text-5xl font-bold ${healthScoreColor(health.total)}`}>
              {health.total}
            </span>
            <span className="text-lg text-gray-400 dark:text-gray-500 mb-1">/100</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-3">
            <div
              className={`h-2.5 rounded-full transition-all ${healthBarColor(health.total)}`}
              style={{ width: `${health.total}%` }}
            />
          </div>

          <div className="mt-4 space-y-2">
            {Object.entries(health.components ?? {}).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-24">{HEALTH_COMPONENT_LABELS[key] ?? key}</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${healthBarColor(value)}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Confidence</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {(normalizedConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${normalizedConfidence * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Maturity Phase</div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {MATURITY_LABELS[output.phase_age]}
            </span>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Yield Potential</div>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {yieldPotential.minimum} – {yieldPotential.maximum}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">t/ha</span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Method: {yieldPotential.method.replace(/_/g, ' ')} · Bracket: {yieldPotential.reference_bracket.replace(/_/g, ' ')}
            </div>
            {yieldPotential.historical_average != null && (
              <div className="text-xs text-gray-400 dark:text-gray-500">
                Historical avg: {yieldPotential.historical_average} t/ha
              </div>
            )}
            {alternance?.detected && (
              <div className="mt-2 inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                Alternance detected - {alternance.current_year_type === 'on' ? 'ON' : 'OFF'} year (confidence:{' '}
                {(alternance.confidence * 100).toFixed(0)}%)
              </div>
            )}
          </div>
        </div>
      </div>

      {zones.length > 1 && (
        <div>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('calibrationZones.zoneDistribution')}</div>
          <div className="flex items-center space-x-2">
            {zones.map((zone) => (
              <div
                key={zone.class_name}
                className="flex-1 text-center"
                style={{ flex: zone.surface_percent }}
              >
                <div
                  className="h-4 rounded-sm"
                  style={{ backgroundColor: ZONE_COLORS[zone.class_name] ?? '#6b7280' }}
                />
                <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                  {t(`calibrationZones.${zone.class_name}`)} ({zone.surface_percent.toFixed(0)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface IndexChartProps {
  title: string;
  data: IndexTimePoint[];
  color: string;
  percentiles?: SpectralPercentiles;
}

const IndexTimeSeriesChart = ({ title, data, color, percentiles }: IndexChartProps) => {
  const chartData = data.map((pt) => ({
    date: new Date(pt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: Number(pt.value.toFixed(3)),
    ...(percentiles ? { p25: percentiles.p25, p75: percentiles.p75 } : {}),
  }));

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip />
          {percentiles && (
            <Area
              type="monotone"
              dataKey="p75"
              stroke="none"
              fill={color}
              fillOpacity={0.1}
              name="P75"
            />
          )}
          {percentiles && (
            <Area
              type="monotone"
              dataKey="p25"
              stroke="none"
              fill="#ffffff"
              fillOpacity={1}
              name="P25"
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 2 }}
            name={title}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const ZonePieChart = ({ zones, t }: { zones: ZoneSummary[]; t: (key: string) => string }) => {
  const data = zones.map((z) => ({
    name: t(`calibrationZones.${z.class_name}`),
    value: z.surface_percent,
    color: ZONE_COLORS[z.class_name] ?? '#6b7280',
  }));

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('calibrationZones.spatialHomogeneity')}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({ name, value }: { name: string; value: number }) => `${name}: ${value.toFixed(0)}%`}
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const PhenologyTimeline = ({ dates }: { dates: Record<string, string> }) => {
  const stages = [
    { key: 'dormancy_exit', label: 'Dormancy Exit', icon: <Zap className="w-3 h-3" /> },
    { key: 'peak', label: 'Peak', icon: <TrendingUp className="w-3 h-3" /> },
    { key: 'plateau_start', label: 'Plateau', icon: <Activity className="w-3 h-3" /> },
    { key: 'decline_start', label: 'Decline', icon: <AlertTriangle className="w-3 h-3" /> },
    { key: 'dormancy_entry', label: 'Dormancy', icon: <Calendar className="w-3 h-3" /> },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Phenological Timeline</h4>
      <div className="flex items-center justify-between">
        {stages.map((stage, i) => {
          const dateStr = dates[stage.key];
          return (
            <div key={stage.key} className="flex flex-col items-center text-center flex-1">
              <div className="flex items-center w-full">
                {i > 0 && <div className="flex-1 h-0.5 bg-green-300 dark:bg-green-700" />}
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                  {stage.icon}
                </div>
                {i < stages.length - 1 && <div className="flex-1 h-0.5 bg-green-300 dark:bg-green-700" />}
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">{stage.label}</span>
              {dateStr && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MonthlyWeatherChart = ({ aggregates }: { aggregates: MonthlyWeatherAggregate[] }) => {
  const data = aggregates.map((m) => ({
    month: m.month,
    precipitation: Number(m.precipitation_total.toFixed(1)),
    gdd: Number(m.gdd_total.toFixed(0)),
  }));

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Monthly Weather</h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="precip" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="gdd" orientation="right" tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="precip" dataKey="precipitation" fill={CHART_COLORS.precip} name="Precipitation (mm)" />
          <Bar yAxisId="gdd" dataKey="gdd" fill={CHART_COLORS.gdd} name="GDD" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const DetailedAnalysis = ({ output, t }: { output: CalibrationOutput; t: (key: string) => string }) => {
  const step1 = output.step1;
  const step2 = output.step2;
  const step3 = output.step3;
  const step4 = output.step4;
  const step7 = output.step7;

  const ndviData = step1?.index_time_series?.NDVI;
  const ndmiData = step1?.index_time_series?.NDMI;
  const ndreData = step1?.index_time_series?.NDRE;
  const ndviPercentiles = step3?.global_percentiles?.NDVI;
  const ndmiPercentiles = step3?.global_percentiles?.NDMI;
  const ndrePercentiles = step3?.global_percentiles?.NDRE;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ndviData && ndviData.length > 0 && (
          <IndexTimeSeriesChart
            title="NDVI - Vegetative Vigor"
            data={ndviData}
            color={CHART_COLORS.ndvi}
            percentiles={ndviPercentiles}
          />
        )}
        {ndmiData && ndmiData.length > 0 && (
          <IndexTimeSeriesChart
            title="NDMI - Hydric State"
            data={ndmiData}
            color={CHART_COLORS.ndmi}
            percentiles={ndmiPercentiles}
          />
        )}
        {ndreData && ndreData.length > 0 && (
          <IndexTimeSeriesChart
            title="NDRE - Nutritional State"
            data={ndreData}
            color={CHART_COLORS.ndre}
            percentiles={ndrePercentiles}
          />
        )}
        {step7?.zone_summary && step7.zone_summary.length > 1 ? (
          <ZonePieChart zones={step7.zone_summary} t={t} />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('calibrationZones.spatialHomogeneity')}</h4>
            <div className="flex flex-col items-center justify-center h-[188px] text-center">
              <Target className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('calibrationZones.comingSoon')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t('calibrationZones.comingSoonSub')}
              </p>
            </div>
          </div>
        )}
      </div>

      {output?.metadata?.data_quality_flags?.includes('evergreen_phenology_approximate') && (
        <div className="flex items-start space-x-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This crop is evergreen — phenological stages are approximate. Evergreen trees show subtle seasonal variation
            that is difficult to detect from satellite imagery alone.
          </p>
        </div>
      )}
      <PhenologyTimeline dates={step4?.mean_dates as unknown as Record<string, string>} />

      {step2?.monthly_aggregates && step2.monthly_aggregates.length > 0 && (
        <MonthlyWeatherChart aggregates={step2.monthly_aggregates} />
      )}
    </div>
  );
};

const AnomalyList = ({
  anomalies,
  extremeEvents,
}: { anomalies: AnomalyRecord[]; extremeEvents: ExtremeEvent[] }) => {
  if (anomalies.length === 0 && extremeEvents.length === 0) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-700 dark:text-green-300">No anomalies detected during the analysis period.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {anomalies.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Spectral Anomalies</h4>
          {anomalies.map((anomaly) => {
            const sev = SEVERITY_COLORS[anomaly.severity];
            return (
              <div
                key={`anomaly-${anomaly.date}-${anomaly.anomaly_type}`}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${sev.bg} border-gray-200 dark:border-gray-700`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${sev.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(anomaly.date)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.text}`}>
                      {anomaly.anomaly_type.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.text}`}>
                      {anomaly.severity}
                    </span>
                    {anomaly.index_name && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {anomaly.index_name}
                      </span>
                    )}
                  </div>
                  {(anomaly.value != null || anomaly.deviation != null) && (
                    <div className="flex items-center space-x-3 mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                      {anomaly.value != null && (
                        <span>
                          Value: <span className="font-medium text-gray-800 dark:text-gray-200">{anomaly.value.toFixed(3)}</span>
                        </span>
                      )}
                      {anomaly.previous_value != null && (
                        <span>
                          Prev: <span className="font-medium text-gray-800 dark:text-gray-200">{anomaly.previous_value.toFixed(3)}</span>
                        </span>
                      )}
                      {anomaly.deviation != null && (
                        <span>
                          Deviation: <span className="font-medium text-gray-800 dark:text-gray-200">{(anomaly.deviation * 100).toFixed(1)}%</span>
                        </span>
                      )}
                    </div>
                  )}
                  {anomaly.weather_reference && (
                    <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <CloudRain className="w-3 h-3" />
                      <span>Weather ref: {anomaly.weather_reference}</span>
                    </div>
                  )}
                  {anomaly.excluded_from_reference && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">Excluded from reference baseline</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {extremeEvents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Extreme Weather Events</h4>
          {extremeEvents.map((event) => {
            const sev = SEVERITY_COLORS[event.severity];
            return (
              <div
                key={`event-${event.date}-${event.event_type}`}
                className={`flex items-center space-x-3 p-3 rounded-lg ${sev.bg}`}
              >
                <Thermometer className={`w-4 h-4 ${sev.text}`} />
                <span className="text-sm text-gray-900 dark:text-white">{formatDate(event.date)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.text}`}>
                  {event.event_type.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs font-medium ${sev.text}`}>{event.severity}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RecommendationsList = ({ recommendations }: { recommendations: Recommendation[] }) => {
  if (recommendations.length === 0) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-700 dark:text-green-300">No immediate actions recommended.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((recommendation) => {
        const severity = toSeverityLevel(recommendation.severity);
        const sev = SEVERITY_COLORS[severity];

        return (
          <div
            key={`recommendation-${recommendation.type}-${recommendation.component ?? 'none'}-${recommendation.message}`}
            className={`p-4 rounded-lg border ${sev.bg} border-gray-200 dark:border-gray-700`}
          >
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.text}`}>
                {recommendation.type.replace(/_/g, ' ')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.text}`}>
                {severity}
              </span>
              {recommendation.component && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {recommendation.component.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200">{recommendation.message}</p>
          </div>
        );
      })}
    </div>
  );
};

const ConfidenceBreakdown = ({ components }: { components: Record<string, ConfidenceComponent> }) => {
  return (
    <div className="space-y-2">
      {Object.entries(components ?? {}).map(([name, comp]) => {
        const pct = comp.max_score > 0 ? (comp.score / comp.max_score) * 100 : 0;
        return (
          <div key={name} className="flex items-center space-x-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 w-28 capitalize">{name.replace(/_/g, ' ')}</span>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-16 text-right">
              {comp.score}/{comp.max_score}
            </span>
          </div>
        );
      })}
    </div>
  );
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function getRunSatelliteImages(report: Record<string, unknown> | null | undefined): Array<Record<string, unknown>> {
  if (!report || !isRecord(report)) {
    return [];
  }

  const inputs = isRecord(report.inputs) ? report.inputs : null;
  const satelliteImages = inputs?.satellite_images;
  if (!Array.isArray(satelliteImages)) {
    return [];
  }

  return satelliteImages.filter(isRecord);
}

const CalibrationImprovement = ({ output, report }: { output: CalibrationOutput;
  report?: Record<string, unknown> | null; }) => {
  const flags = output?.metadata?.data_quality_flags;
  const conf = output.confidence;
  const step1 = output.step1;

  if (!conf || !step1) return null;

  const satelliteImages = getRunSatelliteImages(report);
  const runCloudValues = satelliteImages
    .map((image) => toFiniteNumber(image.cloud_coverage))
    .filter((value): value is number => value !== null);
  const averageInputCloudCoverage = runCloudValues.length > 0
    ? runCloudValues.reduce((sum, value) => sum + value, 0) / runCloudValues.length
    : null;
  const retainedImageCount = satelliteImages.length > 0
    ? Math.max(0, satelliteImages.length - (step1.filtered_image_count ?? 0))
    : step1.index_time_series?.NDVI?.filter((point) => !point.interpolated).length ?? 0;
  const allCloudValuesAreZero = runCloudValues.length > 0 && runCloudValues.every((value) => value === 0);
  const hasFlatCloudMetrics = satelliteImages.length > 0 && allCloudValuesAreZero && (step1.filtered_image_count ?? 0) === 0;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
          Confidence Score Breakdown
        </h4>
        <ConfidenceBreakdown components={conf.components} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Satellite className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg Input Cloud</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {(averageInputCloudCoverage ?? step1.cloud_coverage_mean).toFixed(1)}%
          </span>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Across cached satellite readings used for this run
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <BarChart3 className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Usable Images</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {retainedImageCount}
          </span>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Retained after cloud filtering
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <CloudOff className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Rejected for Clouds</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {step1.filtered_image_count ?? 0}
          </span>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Images above the 20% cloud threshold
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Outliers Removed</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {step1.outlier_count ?? 0}
          </span>
        </div>
      </div>

      {hasFlatCloudMetrics && (
        <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Cloud metrics are flat for this run because the cached satellite inputs only contain 0% cloud metadata, so the cloud filter had nothing to reject.
          </span>
        </div>
      )}

      {flags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
            Data Quality Notes
          </h4>
          <div className="space-y-1">
            {flags.map((flag) => (
              <div key={flag} className="flex items-center space-x-2 text-sm">
                <Info className="w-4 h-4 text-yellow-500 shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{DATA_QUALITY_FLAG_LABELS[flag] ?? flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {flags.length === 0 && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700 dark:text-green-300">No data quality issues detected.</span>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>Version: {output?.metadata?.version}</span>
          <span>Generated: {formatDate(output?.metadata?.generated_at)}</span>
        </div>
      </div>
    </div>
  );
};

const CalibrationHistoryList = ({ records }: { records: CalibrationHistoryRecord[] }) => {
  if (records.length === 0) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <Info className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">No previous calibration runs.</span>
      </div>
    );
  }

  const statusStyles: Record<string, { bg: string; text: string }> = {
    completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
    in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    pending: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  };

  return (
    <div className="space-y-2">
      {records.map((record, index) => {
        const style = statusStyles[record.status] ?? statusStyles.pending;
        const isLatest = index === 0;

        return (
          <div
            key={record.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              isLatest
                ? 'border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(record.created_at)}
                  </span>
                  {isLatest && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
                      Current
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                    {record.status}
                  </span>
                </div>
                {record.phase_age && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {MATURITY_LABELS[record.phase_age as CalibrationMaturityPhase] ?? record.phase_age}
                  </span>
                )}
                {record.status === 'failed' && record.error_message && (
                  <span className="text-xs text-red-500 dark:text-red-400 mt-0.5 truncate max-w-xs">
                    {record.error_message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4 shrink-0">
              {record.health_score != null && (
                <div className="text-right">
                  <div className="text-xs text-gray-400 dark:text-gray-500">Health</div>
                  <div className={`text-sm font-bold ${healthScoreColor(record.health_score)}`}>
                    {record.health_score}
                  </div>
                </div>
              )}
              {record.confidence_score != null && (
                <div className="text-right">
                  <div className="text-xs text-gray-400 dark:text-gray-500">Confidence</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {(normalizeConfidenceScore(record.confidence_score) * 100).toFixed(0)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CalibrationReport = ({ output, report, t, phase }: { output: CalibrationOutput;
  report?: Record<string, unknown> | null;
  t: (key: string) => string;
  phase?: string; }) => {
  const hasInsufficientData = output?.metadata?.data_quality_flags?.includes('insufficient_satellite_data');

  return (
      <div className="space-y-4" data-testid="calibration-report">
      {hasInsufficientData && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-300 dark:border-amber-700 p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-900 dark:text-amber-100">Limited Satellite Data</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                This calibration was computed with fewer than 6 satellite observations. Results may be unreliable —
                consider re-calibrating once more imagery is available.
              </p>
            </div>
          </div>
        </div>
      )}

      <CollapsibleSection
        title="Executive Summary"
        icon={<Target className="w-5 h-5 text-green-600 dark:text-green-400" />}
        defaultOpen={true}
      >
        <ExecutiveSummary output={output} t={t} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Detailed Analysis"
        icon={<BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
        defaultOpen={false}
      >
        <DetailedAnalysis output={output} t={t} />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Detected Anomalies (${output.step5?.anomalies?.length ?? 0})`}
        icon={<AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
        defaultOpen={false}
      >
        <AnomalyList anomalies={output.step5?.anomalies ?? []} extremeEvents={output.step2?.extreme_events ?? []} />
      </CollapsibleSection>

      {phase === 'active' && (output.recommendations ?? []).length > 0 && (
        <CollapsibleSection
          title="Recommendations"
          icon={<Leaf className="w-5 h-5 text-green-600 dark:text-green-400" />}
          badge={(
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
              {(output.recommendations ?? []).length}
            </span>
          )}
          defaultOpen={false}
        >
          <RecommendationsList recommendations={output.recommendations ?? []} />
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Calibration Improvement"
        icon={<Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
        defaultOpen={false}
      >
        <CalibrationImprovement output={output} report={report} />
      </CollapsibleSection>
    </div>
  );
};

const NUTRITION_OPTION_LABELS: Record<NutritionOption, { name: string; description: string }> = {
  A: {
    name: 'Option A — Standard',
    description: 'Balanced fertigation with standard foliar applications.',
  },
  B: {
    name: 'Option B — Enhanced',
    description: 'Enhanced fertigation with biostimulant mix for improved vigor.',
  },
  C: {
    name: 'Option C — Intensive',
    description: 'Intensive program with leaching management and soil amendments.',
  },
};

const NUTRITION_OPTION_ICONS: Record<
  NutritionOption,
  React.ReactNode
> = {
  A: <Leaf className="w-5 h-5" aria-hidden />,
  B: <Sparkles className="w-5 h-5" aria-hidden />,
  C: <TreePine className="w-5 h-5" aria-hidden />,
};

const ValidationPanel = ({ calibrationId, parcelId, healthScore, confidence, onReCalibrate }: { calibrationId: string;
  parcelId: string;
  healthScore: number;
  confidence: number;
  onReCalibrate: () => void; }) => {
  const { mutate: validate, isPending: isValidating } = useValidateCalibration(parcelId);

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-300 dark:border-amber-700 p-6">
      <div className="flex items-start space-x-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg shrink-0">
          <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
            Validate Calibration Baseline
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Review the report above. If the results look correct for this parcel, validate to proceed.
          </p>

          <div className="flex items-center space-x-6 mt-4 text-sm">
            <div>
              <span className="text-amber-600 dark:text-amber-400">Health Score:</span>{' '}
              <span className="font-bold text-amber-900 dark:text-amber-100">{healthScore}/100</span>
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-400">Confidence:</span>{' '}
              <span className="font-bold text-amber-900 dark:text-amber-100">{(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-5">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="amber" type="button" disabled={isValidating} className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg transition-colors font-medium" >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isValidating ? 'Validating...' : 'Validate & Activate'}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Validate this calibration?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will lock in the current baseline (health score: {healthScore}/100, confidence: {(confidence * 100).toFixed(0)}%).
                    You will then be asked to select a nutrition management option.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => validate(calibrationId)}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Validate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              type="button"
              onClick={onReCalibrate}
              className="inline-flex items-center space-x-2 px-4 py-2.5 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Re-run Calibration</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NutritionOptionSelector = ({ parcelId, calibrationId }: {
  parcelId: string;
  calibrationId: string;
}) => {
  const { data: suggestion, isLoading: isSuggestionLoading } = useNutritionSuggestion(parcelId);
  const { mutate: confirm, isPending: isConfirming } = useConfirmNutritionOption(parcelId);
  const [selectedOption, setSelectedOption] = useState<NutritionOption | null>(null);

  const effectiveSelection = selectedOption ?? suggestion?.suggested_option ?? null;

  if (isSuggestionLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <ButtonLoader className="h-6 w-6 text-blue-600" />
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <span className="text-sm text-yellow-700 dark:text-yellow-300">
            Unable to load nutrition suggestions. Please try re-calibrating.
          </span>
        </div>
      </div>
    );
  }

  const options: NutritionOption[] = ['A', 'B', 'C'];

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700 p-6">
      <div className="flex items-start space-x-4 mb-5">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg shrink-0">
          <Leaf className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Select Nutrition Option
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Choose a nutrition management program for this parcel.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 mb-5 min-w-0">
        {options.map((opt) => {
          const alt = suggestion.alternatives.find((a) => a.option === opt);
          const isEligible = alt?.eligible ?? true;
          const isSuggested = suggestion.suggested_option === opt;
          const isSelected = effectiveSelection === opt;
          const label = NUTRITION_OPTION_LABELS[opt];

          return (
            <div key={opt} className="min-w-0">
              <SelectionCard
                title={label.name}
                description={label.description}
                icon={NUTRITION_OPTION_ICONS[opt]}
                selected={isSelected}
                onClick={() => {
                  if (isEligible && !isConfirming) {
                    setSelectedOption(opt);
                  }
                }}
                disabled={!isEligible || isConfirming}
                color="blue"
                badge={isSuggested ? 'Recommended' : undefined}
                descriptionClassName="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-4 break-words"
                footer={
                  alt?.reason ? (
                    <p
                      className={
                        isEligible
                          ? 'text-xs text-gray-500 dark:text-gray-400'
                          : 'text-xs text-red-600 dark:text-red-400'
                      }
                    >
                      {alt.reason}
                    </p>
                  ) : undefined
                }
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center space-x-3">
        <Button variant="blue"
          type="button"
          disabled={!effectiveSelection || isConfirming}
          onClick={() => {
            if (effectiveSelection) {
              confirm({ calibrationId, option: effectiveSelection });
            }
          }}
          className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg transition-colors font-medium"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isConfirming ? 'Confirming...' : 'Confirm Selection'}</span>
        </Button>
        {effectiveSelection && effectiveSelection !== suggestion.suggested_option && (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            Overriding system suggestion ({suggestion.suggested_option})
          </span>
        )}
      </div>
    </div>
  );
};

const PlantingYearPrompt = ({ parcelId, onSaved }: { parcelId: string;
  onSaved: () => void; }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>('');
  const updateParcel = useUpdateParcel();
  const isSaving = updateParcel.isPending;

  const parsedYear = parseInt(year, 10);
  const isValid = !Number.isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= currentYear;

  const handleSave = () => {
    if (!isValid) return;
    updateParcel.mutate(
      { id: parcelId, updates: { planting_year: parsedYear } },
      { onSuccess: onSaved },
    );
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30 p-6">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
          <TreePine className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
            Planting Year Required
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Calibration V2 uses the plantation age to adjust thresholds and maturity models.
            Please specify the year this parcel was planted.
          </p>
          <div className="flex items-end space-x-3 mt-4">
            <div>
              <label htmlFor="planting-year-input" className="block text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
                Year planted
              </label>
              <input
                id="planting-year-input"
                type="number"
                min={1900}
                max={currentYear}
                placeholder={String(currentYear - 10)}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValid) handleSave();
                }}
                className="w-28 px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <Button variant="amber" type="button" onClick={handleSave} disabled={!isValid || isSaving} className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium" >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save & Continue'}</span>
            </Button>
          </div>
          {year && !isValid && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Enter a year between 1900 and {currentYear}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const CALIBRATION_STEPS: Record<string, { icon: React.ReactNode; label: string }> = {
  data_collection: { icon: <Satellite className="w-4 h-4" />, label: 'Collecte des données' },
  satellite_sync: { icon: <Satellite className="w-4 h-4" />, label: 'Synchronisation satellite' },
  weather_sync: { icon: <CloudRain className="w-4 h-4" />, label: 'Synchronisation météo' },
  raster_extraction: { icon: <Target className="w-4 h-4" />, label: 'Extraction pixels NDVI' },
  gdd_precompute: { icon: <Thermometer className="w-4 h-4" />, label: 'Calcul degrés-jours' },
  calibration_engine: { icon: <BrainCircuit className="w-4 h-4" />, label: 'Moteur de calibration' },
  saving_results: { icon: <Save className="w-4 h-4" />, label: 'Sauvegarde résultats' },
  ai_reports: { icon: <Activity className="w-4 h-4" />, label: 'Rapports IA' },
  finalizing: { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Finalisation' },
};

const CalibrationProgressStepper = ({ progress }: { progress: CalibrationProgressEvent | null }) => {
  const currentStep = progress?.step ?? 0;
  const totalSteps = progress?.total_steps ?? 7;
  const percent = progress?.percent ?? 0;
  const stepKey = progress?.step_key ?? '';
  const message = progress?.message ?? 'Initialisation du calibrage...';

  const stepKeys = totalSteps === 5
    ? ['data_collection', 'calibration_engine', 'saving_results', 'ai_reports', 'finalizing']
    : ['data_collection', 'satellite_sync', 'raster_extraction', 'gdd_precompute', 'calibration_engine', 'saving_results', 'ai_reports'];

  return (
    <div
      className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800/30 p-6"
      data-testid="calibration-in-progress"
    >
      <div className="flex items-center space-x-3 mb-5">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
          <BrainCircuit className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Calibration en cours</h3>
          <p className="text-sm text-purple-700 dark:text-purple-300">{message}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{percent}%</span>
        </div>
      </div>

      <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mb-5 overflow-hidden">
        <div
          className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>

      <div className="space-y-2">
        {stepKeys.map((key, index) => {
          const stepNum = index + 1;
          const stepDef = CALIBRATION_STEPS[key];
          const isActive = key === stepKey;
          const isCompleted = currentStep > stepNum;

          return (
            <div
              key={key}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-purple-100 dark:bg-purple-900/40 ring-1 ring-purple-300 dark:ring-purple-700'
                  : isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'opacity-50'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isActive ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                ) : (
                  <span className="text-xs font-medium">{stepNum}</span>
                )}
              </div>

              <div className={`flex items-center space-x-2 ${
                isActive
                  ? 'text-purple-900 dark:text-purple-100'
                  : isCompleted
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-400 dark:text-gray-500'
              }`}>
                {stepDef?.icon}
                <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                  {stepDef?.label ?? key}
                </span>
              </div>

              {isActive && (
                <div className="ml-auto">
                  <div className="w-4 h-4 border-2 border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AICalibrationPage = () => {
  const { parcelId } = Route.useParams();
  const { t } = useTranslation();
  const { t: tAi } = useTranslation('ai');
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const [isPartialWizardOpen, setIsPartialWizardOpen] = useState(false);
  const [isFullWizardOpen, setIsFullWizardOpen] = useState(false);

  const { data: parcelData, refetch: refetchParcel } = useParcelById(parcelId);
  const { data: calibration, isLoading: isCalibrationLoading } = useAICalibration(parcelId);
  const { data: phase } = useCalibrationPhase(parcelId);
  const { data: diagnostics } = useAIDiagnostics(parcelId, phase === 'active');
  const calibrationProgress = useCalibrationProgress(parcelId);

  const { data: reportData, isLoading: isReportLoading } = useCalibrationReport(parcelId);
  const { data: historyRecords } = useCalibrationHistory(parcelId);
  const { data: annualPlan } = useAIPlan(parcelId);
  const { data: aiRecommendations } = useAIRecommendations(parcelId);
  const [showAnnualRecalibrationWizard, setShowAnnualRecalibrationWizard] = useState(false);

  const { data: annualEligibility, isLoading: isAnnualEligibilityLoading } = useAnnualEligibility(
    phase === 'active' ? parcelId : '',
  );

  const v2Output = reportData?.report?.output ?? null;
  const hasV2Report = v2Output !== null;
  const missingPlantingYear = parcelData !== null && parcelData !== undefined && !parcelData.planting_year;

  const isCalibrating = phase === 'calibrating' || calibration?.status === 'in_progress' || calibration?.status === 'provisioning';
  const calibrationCompletedButPhaseStuck = (phase === 'unknown' || !phase) && hasV2Report && calibration?.status !== 'failed' && calibration?.status !== 'in_progress';
  const isBusy = isCalibrating;
  const isFailed = calibration?.status === 'failed';
  const isWizardPhase =
    phase === 'awaiting_data' ||
    phase === 'ready_calibration' ||
    ((phase === 'unknown' || !phase) && !calibration && !hasV2Report);
  const canShowAnnualBanner = phase === 'active' && annualEligibility?.eligible === true;
  const isObservationOnly = phase === 'active' && (reportData?.calibration?.confidence_score ?? 1) < 0.25;
  const estimatedCampaignCount = Math.max(2, historyRecords?.length ?? 1);

  const handleOpenPartialRecalibration = () => {
    setIsPartialWizardOpen(true);
  };

  const handleClosePartialRecalibration = () => {
    setIsPartialWizardOpen(false);
  };

  const handleCancelPartialRecalibration = () => {
    setIsPartialWizardOpen(false);
    navigate({ to: `/parcels/${parcelId}` });
  };

  const handleOpenFullRecalibrationWizard = () => {
    setIsPartialWizardOpen(false);
    setIsFullWizardOpen(true);
  };

  const handleCloseFullWizard = () => {
    setIsFullWizardOpen(false);
  };

  if (isCalibrationLoading || isReportLoading) {
    return <SectionLoader className="h-64 py-0" />;
  }

  return (
    <div className="space-y-6" data-testid="calibration-page">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="calibration-page-title">
            {tAi('calibration.page.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tAi('calibration.page.subtitle')}
          </p>
        </div>
        {(calibration || hasV2Report) && (
          <div className="flex items-center gap-2">
            {phase === 'active' && (
              <Button variant="blue" type="button" onClick={handleOpenPartialRecalibration} className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors" data-testid="calibration-open-partial-recalibration" >
                <GitCompareArrows className="w-4 h-4" />
                <span>{tAi('calibration.page.partialUpdate')}</span>
              </Button>
            )}

            <Button variant="green" type="button" onClick={handleOpenFullRecalibrationWizard} disabled={isBusy || missingPlantingYear} className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors" title={missingPlantingYear ? tAi('calibration.page.plantingYearTitle') : undefined} data-testid="calibration-open-full-recalibration" >
              {isBusy ? (
                <BrainCircuit className="w-4 h-4 animate-pulse" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>
                {isCalibrating ? tAi('calibration.page.calculating') : tAi('calibration.page.fullRecalibration')}
              </span>
            </Button>
          </div>
        )}
      </div>

      {phase && <PhaseBanner phase={phase} />}

      {hasV2Report && reportData?.report && typeof reportData.report === 'object' && (
        <CalibrationRunInputsPanel
          report={reportData.report as Record<string, unknown>}
          onOpenPartialRecalibration={phase === 'active' ? handleOpenPartialRecalibration : undefined}
          onOpenFullRecalibration={handleOpenFullRecalibrationWizard}
          fullRecalibrationDisabled={isBusy || missingPlantingYear}
          fullRecalibrationTitle={missingPlantingYear ? tAi('calibration.page.plantingYearTitle') : undefined}
        />
      )}

      {!isCalibrating && (phase === 'calibrated' || phase === 'awaiting_nutrition_option' || phase === 'active' || calibrationCompletedButPhaseStuck) && (
        <CalibrationReviewSection parcelId={parcelId} />
      )}

      <Dialog open={isPartialWizardOpen} onOpenChange={(open) => (open ? setIsPartialWizardOpen(true) : handleClosePartialRecalibration())}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0"
          data-testid="calibration-partial-recalibration-dialog"
        >
          <div className="p-4 sm:p-6">
            <RecalibrationWizard
              parcelId={parcelId}
              baselineData={reportData}
              confidenceScore={v2Output?.confidence.normalized_score ? normalizeConfidenceScore(v2Output.confidence.normalized_score) : undefined}
              onClose={handleCancelPartialRecalibration}
              onSwitchToFullRecalibration={handleOpenFullRecalibrationWizard}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFullWizardOpen} onOpenChange={(open) => (open ? setIsFullWizardOpen(true) : handleCloseFullWizard())}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0">
          <div className="p-4 sm:p-6">
            <CalibrationWizard parcelId={parcelId} parcelData={parcelData} />
          </div>
        </DialogContent>
      </Dialog>

      {phase === 'active' && !isAnnualEligibilityLoading && canShowAnnualBanner && (
        <div
          className="rounded-xl border border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-900/20 p-4"
          data-testid="calibration-annual-eligibility-banner"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">{tAi('calibration.annualBanner.title')}</h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {tAi('calibration.annualBanner.body')}
              </p>
            </div>
            <Button variant="green"
              type="button"
              onClick={() => setShowAnnualRecalibrationWizard(true)}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              data-testid="calibration-start-annual-recalibration"
            >
              {tAi('calibration.annualBanner.cta')}
            </Button>
          </div>
        </div>
      )}

      {phase === 'active' && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-900/20 p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                {tAi('calibration.nextStep.title')}
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {tAi('calibration.nextStep.body')}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/80 dark:bg-blue-950/40 px-2.5 py-1 text-blue-900 dark:text-blue-100">
                  {tAi('calibration.nextStep.chipCalendar')}:{' '}
                  {annualPlan?.id
                    ? [annualPlan.status, annualPlan.year].every((v) => v !== undefined && v !== null)
                      ? `${annualPlanStatusLabel(annualPlan.status)} (${annualPlan.year})`
                      : tAi('calibration.nextStep.chipCalendarDetail')
                    : tAi('calibration.nextStep.chipCalendarNotReady')}
                </span>
                <span className="rounded-full bg-white/80 dark:bg-blue-950/40 px-2.5 py-1 text-blue-900 dark:text-blue-100">
                  {tAi('calibration.nextStep.chipTips')}: {aiRecommendations?.length ?? 0}
                </span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {annualPlan?.status === 'draft'
                  ? tAi('calibration.nextStep.hintDraft')
                  : aiRecommendations && aiRecommendations.length > 0
                    ? tAi('calibration.nextStep.hintTips')
                    : tAi('calibration.nextStep.hintNoTips')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="blue"
                type="button"
                onClick={() => navigate({ to: '/parcels/$parcelId/ai/plan/summary', params: { parcelId } })}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <FileText className="h-4 w-4" />
                {tAi('calibration.nextStep.openCalendar')}
              </Button>
              <Button
                type="button"
                onClick={() => navigate({ to: '/parcels/$parcelId/ai/recommendations', params: { parcelId } })}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-950/30 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-200 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <Lightbulb className="h-4 w-4" />
                {tAi('calibration.nextStep.openRecommendations')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAnnualRecalibrationWizard && (
        <AnnualRecalibrationWizard
          parcelId={parcelId}
          estimatedCampaignCount={estimatedCampaignCount}
          onClose={() => setShowAnnualRecalibrationWizard(false)}
        />
      )}

      {missingPlantingYear && (
        <PlantingYearPrompt parcelId={parcelId} onSaved={() => refetchParcel()} />
      )}

      {isWizardPhase && !missingPlantingYear && !isFullWizardOpen && (
        <CalibrationWizard parcelId={parcelId} parcelData={parcelData} />
      )}

      {isCalibrating && (
        <CalibrationProgressStepper progress={calibrationProgress} />
      )}

      {isObservationOnly && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30 p-4">
          <div className="flex items-start space-x-3">
            <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">{tAi('calibration.observationMode.title')}</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {tAi('calibration.observationMode.body')}
              </p>
            </div>
          </div>
        </div>
      )}

      {hasV2Report && !isCalibrating && (
        <CalibrationReport
          output={v2Output}
          report={reportData?.report && typeof reportData.report === 'object'
            ? reportData.report as Record<string, unknown>
            : null}
          t={t}
          phase={isObservationOnly ? 'observation' : phase}
        />
      )}

      {historyRecords && historyRecords.length > 1 && !isCalibrating && (
        <CollapsibleSection
          title="Calibration History"
          icon={<Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
          badge={(
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
              {historyRecords.length}
            </span>
          )}
          defaultOpen={false}
        >
          <CalibrationHistoryList records={historyRecords} />
        </CollapsibleSection>
      )}

      {(phase === 'calibrated' || calibrationCompletedButPhaseStuck) && hasV2Report && v2Output && reportData?.calibration?.id && (
        <ValidationPanel
          calibrationId={reportData.calibration.id}
          parcelId={parcelId}
          healthScore={v2Output.step8.health_score.total}
          confidence={normalizeConfidenceScore(v2Output.confidence.normalized_score)}
          onReCalibrate={handleOpenFullRecalibrationWizard}
        />
      )}

      {!isCalibrating && (phase === 'calibrated' || phase === 'awaiting_nutrition_option' || calibrationCompletedButPhaseStuck) && reportData?.calibration?.id && (
        <NutritionOptionSelector
          parcelId={parcelId}
          calibrationId={reportData.calibration.id}
        />
      )}

      {isFailed && !isCalibrating && (
        <div
          className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/30 p-6"
          data-testid="calibration-failed-panel"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Calibration Failed</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                The calibration process encountered an error.
                {calibration?.error_message && (
                  <> Reason: <span className="font-medium">{calibration.error_message}</span></>
                )}
              </p>
              <Button variant="red" type="button" onClick={handleOpenFullRecalibrationWizard} disabled={missingPlantingYear} className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors" >
                <Play className="w-4 h-4" />
                <span>Retry Calibration</span>
              </Button>
            </div>
          </div>
        </div>
      )}



      {phase === 'active' && diagnostics && typeof diagnostics === 'object' && 'scenario_code' in diagnostics && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Diagnostics</h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              <span>Scénario {diagnostics.scenario_code}</span>
              <span>·</span>
              <span>
                Confiance{' '}
                {Math.round(
                  diagnostics.confidence <= 1 ? diagnostics.confidence * 100 : diagnostics.confidence,
                )}
                %
              </span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">{diagnostics.scenario}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{diagnostics.description}</p>
            {diagnostics.observation_only && (
              <p className="text-xs text-amber-700 dark:text-amber-300">Mode observation — suivi prudent.</p>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/calibration')({
  component: AICalibrationPage,
});
