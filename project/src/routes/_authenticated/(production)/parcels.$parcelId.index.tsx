import { calculateHealthStatus, calculateIrrigationIndex, useLatestSatelliteIndices } from '@/hooks/useLatestSatelliteIndices'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { useTasks } from '@/hooks/useTasks'
import { useHarvests } from '@/hooks/useHarvests'
import { useAICalibration } from '@/hooks/useAICalibration'
import { useAIDiagnostics } from '@/hooks/useAIDiagnostics'
import { useActiveAIAlerts } from '@/hooks/useAIAlerts'
import { useAIRecommendations } from '@/hooks/useAIRecommendations'
import { useAuth } from '@/hooks/useAuth'
import { useIsModuleActive } from '@/hooks/useIsModuleActive'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Compass,
  Droplets,
  Flower,
  Lightbulb,
  MapPin,
  RefreshCw,
  Satellite,
  Sprout,
  TrendingUp,
  Wheat,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { satelliteIndicesApi } from '@/lib/api/satellite-indices'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { cn } from '@/lib/utils'

const ParcelOverview = () => {
  const { t } = useTranslation();
  const { parcelId } = Route.useParams();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;
  const isAgromindActive = useIsModuleActive('agromind_advisor');
  const { data: parcel, isLoading: isLoadingParcel } = useParcelById(parcelId);
  const { data: indices, isLoading: _isLoadingIndices, refetch: refetchIndices } = useLatestSatelliteIndices(parcelId);

  // Memoize filters to prevent unnecessary refetches
  const parcelFilters = useMemo(() => ({ parcel_id: parcelId }), [parcelId]);
  const { data: parcelTasks, isLoading: isLoadingTasks } = useTasks(organizationId || '', parcelFilters);

  // Richer context — AI cockpit state, alerts, pending recs, harvest history
  const { data: calibration } = useAICalibration(parcelId);
  const { data: diagnostics } = useAIDiagnostics(parcelId, parcel?.ai_phase === 'active');
  const { data: activeAlerts } = useActiveAIAlerts(parcelId);
  const { data: recommendations } = useAIRecommendations(parcelId);
  const { data: harvests } = useHarvests(organizationId || '', { parcel_id: parcelId });

  // NDVI 90-day history for the sparkline — lightweight inline query, cached 5 min.
  const ndviHistoryRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return {
      date_from: start.toISOString().split('T')[0],
      date_to: end.toISOString().split('T')[0],
    };
  }, []);
  const { data: ndviHistory } = useQuery({
    queryKey: ['satellite-indices', 'ndvi-history', parcelId, ndviHistoryRange],
    queryFn: () =>
      satelliteIndicesApi.getAll(
        { parcel_id: parcelId, index_name: 'NDVI', ...ndviHistoryRange, limit: 30 },
        organizationId,
      ),
    enabled: !!parcelId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // NDVI sparkline data ready for recharts (oldest → newest).
  // Hooks must be called unconditionally — computed before the early return.
  const ndviSparklineData = useMemo(() => {
    if (!ndviHistory || ndviHistory.length === 0) return [];
    return ndviHistory
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r) => ({
        date: r.date,
        value: Number((r as unknown as { mean_value?: number }).mean_value ?? 0),
      }))
      .filter((d) => Number.isFinite(d.value) && d.value !== 0);
  }, [ndviHistory]);

  const ndviDelta = useMemo(() => {
    if (ndviSparklineData.length < 2) return null;
    const first = ndviSparklineData[0].value;
    const last = ndviSparklineData[ndviSparklineData.length - 1].value;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
  }, [ndviSparklineData]);

  // Only block on parcel data — satellite indices are supplementary and load asynchronously
  if (isLoadingParcel) {
    return <DetailPageSkeleton />;
  }

  if (!parcel) return null;

  // Calculate derived values from real satellite data
  const ndviValue = indices?.ndvi;
  const irrigationIndex = calculateIrrigationIndex(indices?.ndmi ?? null);
  const healthStatus = calculateHealthStatus(ndviValue ?? null);

  // Format NDVI for display
  const formatNdvi = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(2);
  };

  // Parcel age from planting year
  const parcelAge = parcel.planting_year
    ? new Date().getFullYear() - Number(parcel.planting_year)
    : null;

  // Aggregate counts + derived stats for the richness row
  const openTasks = (parcelTasks ?? []).filter(
    (ts) => ts.status === 'pending' || ts.status === 'assigned' || ts.status === 'in_progress',
  ).length;
  const completedTasks = (parcelTasks ?? []).filter((ts) => ts.status === 'completed').length;
  const activeAlertsCount = activeAlerts?.length ?? 0;
  const pendingRecsCount =
    (recommendations ?? []).filter((r) => r.status === 'pending').length ?? 0;
  const latestHarvest = (harvests ?? [])
    .slice()
    .sort((a, b) => {
      const ad = new Date(a.harvest_date || a.created_at || 0).getTime();
      const bd = new Date(b.harvest_date || b.created_at || 0).getTime();
      return bd - ad;
    })[0];
  const totalSeasonHarvestKg = (harvests ?? [])
    .filter((h) => {
      const d = new Date(h.harvest_date || h.created_at || 0);
      return d.getFullYear() === new Date().getFullYear();
    })
    .reduce((sum, h) => sum + (Number(h.quantity) || 0), 0);

  // AI confidence 0-100 normalized
  const aiConfidence = ((): number | null => {
    const raw = (calibration as { confidence_score?: number } | null | undefined)?.confidence_score;
    if (raw == null || !Number.isFinite(Number(raw))) return null;
    const n = Number(raw);
    return Math.round(n <= 1 ? n * 100 : n);
  })();

  // Compact identity row for the hero strip
  const identityChips = [
    parcel.variety ? { icon: Sprout, label: parcel.variety } : null,
    parcelAge != null
      ? { icon: Calendar, label: `${parcelAge} ${t('parcels.index.years', 'ans')}` }
      : null,
    parcel.planting_system
      ? { icon: Flower, label: parcel.planting_system }
      : parcel.irrigation_type
      ? { icon: Droplets, label: parcel.irrigation_type }
      : null,
    parcel.density_per_hectare
      ? {
          icon: MapPin,
          label: `${parcel.density_per_hectare} ${t('parcels.index.treesPerHa', 'arbres/ha')}`,
        }
      : null,
  ].filter(Boolean) as Array<{ icon: typeof Sprout; label: string }>;

  // Check if we have satellite data (hide banner while loading or when data exists)
  const hasSatelliteData = _isLoadingIndices || (indices?.ndvi != null || indices?.ndmi != null);

  const data = {
    irrigation: irrigationIndex,
    yield: 12.5, // This would come from production intelligence module
    ndvi: ndviValue,
    health: healthStatus.status,
    healthColor: healthStatus.color,
    lastUpdate: indices?.lastUpdate
      ? new Date(indices.lastUpdate).toLocaleDateString('fr-FR')
      : new Date().toLocaleDateString('fr-FR')
  };

  return (
    <div className="space-y-6">
      {/* Identity hero — parcel at a glance with emoji, name, chips */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-sky-50/60 p-6 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-gray-900 dark:to-sky-950/20">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-4xl shadow-md ring-1 ring-emerald-200 dark:bg-gray-800 dark:ring-emerald-800">
              {parcel.tree_type === 'olivier' || (parcel.crop_type || '').toLowerCase().includes('oliv')
                ? '🫒'
                : parcel.tree_type === 'avocatier' || (parcel.crop_type || '').toLowerCase().includes('avoc')
                ? '🥑'
                : (parcel.crop_type || '').toLowerCase().includes('palm')
                ? '🌴'
                : (parcel.crop_type || '').toLowerCase().includes('agrum') || (parcel.crop_type || '').toLowerCase().includes('citrus')
                ? '🍊'
                : '🌱'}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {parcel.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {parcel.calculated_area || parcel.area
                  ? `${parcel.calculated_area || parcel.area} ha`
                  : t('parcels.index.notDefined')}
                {parcel.crop_type ? ` · ${parcel.crop_type}` : ''}
              </p>
              {identityChips.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {identityChips.map((chip, i) => {
                    const Icon = chip.icon;
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                      >
                        <Icon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        {chip.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                healthStatus.status === 'Excellente' || healthStatus.status === 'Bonne'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : healthStatus.status === 'Moyenne'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                  : healthStatus.status === 'Faible' || healthStatus.status === 'Critique'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              <span className="h-2 w-2 rounded-full bg-current opacity-75" />
              {healthStatus.status}
            </span>
            {isAgromindActive && parcel.ai_phase && parcel.ai_phase !== 'awaiting_data' && (
              <Link
                to="/parcels/$parcelId/ai"
                params={{ parcelId }}
                search={{ farmId: undefined }}
                className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-950/60"
              >
                <BrainCircuit className="h-3.5 w-3.5" aria-hidden />
                {t('parcels.index.aiBadge', 'AgromindIA')} · {parcel.ai_phase}
                <ChevronRight className="h-3 w-3 opacity-70" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* AI Compass teaser — scenario + confidence + CTA to the hub */}
      {isAgromindActive && (calibration || diagnostics) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                <Compass className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  {t('parcels.index.aiTeaser.label', 'Boussole AgromindIA')}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                  {(diagnostics as { scenario?: string } | null | undefined)?.scenario
                    ?? t('parcels.index.aiTeaser.awaiting', 'Calibration en cours')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(diagnostics as { description?: string } | null | undefined)?.description ??
                    t(
                      'parcels.index.aiTeaser.hint',
                      'La parcelle passera en surveillance active dès la fin de la calibration.',
                    )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {aiConfidence != null && (
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('parcels.index.aiTeaser.confidence', 'Confiance')}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-purple-700 dark:text-purple-300">
                    {aiConfidence}
                    <span className="ml-0.5 text-xs font-medium text-slate-500">/100</span>
                  </p>
                </div>
              )}
              <Link
                to="/parcels/$parcelId/ai"
                params={{ parcelId }}
                search={{ farmId: undefined }}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
              >
                {t('parcels.index.aiTeaser.open', 'Ouvrir la boussole')}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Stats row — 4 counts (alerts, pending recs, open tasks, latest harvest) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {isAgromindActive ? (
          <Link
            to="/parcels/$parcelId/ai/alerts"
            params={{ parcelId }}
            search={{ farmId: undefined }}
            className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-orange-400/60 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
          >
            <div className="mb-2 flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {activeAlertsCount > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                  {activeAlertsCount}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {activeAlertsCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('parcels.index.stats.alerts', 'Alertes actives')}
            </p>
          </Link>
        ) : null}
        {isAgromindActive ? (
          <Link
            to="/parcels/$parcelId/ai/recommendations"
            params={{ parcelId }}
            search={{ farmId: undefined }}
            className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-amber-400/60 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
          >
            <div className="mb-2 flex items-center justify-between">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              {pendingRecsCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {pendingRecsCount}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {pendingRecsCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('parcels.index.stats.recs', 'Recommandations')}
            </p>
          </Link>
        ) : null}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="mb-2 flex items-center justify-between">
            <Clock className="h-5 w-5 text-blue-500" />
            {completedTasks > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                {completedTasks} {t('parcels.index.stats.done', 'faites')}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {openTasks}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('parcels.index.stats.openTasks', 'Tâches ouvertes')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="mb-2 flex items-center justify-between">
            <Wheat className="h-5 w-5 text-emerald-500" />
            {totalSeasonHarvestKg > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {totalSeasonHarvestKg.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {t('parcels.index.stats.thisSeason', 'kg saison')}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {latestHarvest
              ? `${Number(latestHarvest.quantity ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`
              : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {latestHarvest
              ? `${latestHarvest.unit ?? 'kg'} · ${latestHarvest.harvest_date || latestHarvest.created_at
                  ? new Date(latestHarvest.harvest_date || latestHarvest.created_at || '').toLocaleDateString('fr-FR')
                  : '—'}`
              : t('parcels.index.stats.noHarvest', 'Aucune récolte')}
          </p>
        </div>
      </div>

      {/* No Satellite Data Banner */}
      {!hasSatelliteData && parcel.boundary && parcel.boundary.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t('parcels.index.noSatelliteData')}
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {t('parcels.index.noSatelliteDataDesc')}
              </p>
              <Link
                to="/parcels/$parcelId/satellite"
                params={{ parcelId }}
                search={{ farmId: undefined }}
                className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline"
              >
                <Satellite className="h-4 w-4" />
                {t('parcels.index.goToSatellite')}
              </Link>
            </div>
            <Button
              onClick={() => refetchIndices()}
              className="p-2 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
              title={t('parcels.index.refreshData')}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Parcel Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Droplets className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('parcels.index.irrigationIndex')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.irrigation !== null ? `${data.irrigation}%` : '--'}
          </div>
          {data.irrigation === null && (
            <p className="text-xs text-gray-500 mt-1">{t('parcels.index.basedOnNdmi')}</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('parcels.index.expectedYield')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.yield} t/ha
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Satellite className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('parcels.index.ndvi')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNdvi(data.ndvi)}
          </div>
          {data.ndvi !== null && data.ndvi !== undefined && (
            <div className="mt-1">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, ((data.ndvi + 1) / 2) * 100))}%` }}
                />
              </div>
            </div>
          )}
          {indices?.lastUpdate && (
            <p className="text-xs text-gray-500 mt-2">
              {t('parcels.index.updatedOn')} {data.lastUpdate}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              data.health === 'Excellente' ? 'bg-green-500' :
              data.health === 'Bonne' ? 'bg-green-400' :
              data.health === 'Moyenne' ? 'bg-yellow-500' :
              data.health === 'Faible' ? 'bg-orange-500' :
              data.health === 'Critique' ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('parcels.index.vegetationHealth')}
            </span>
          </div>
          <div className={`text-lg font-medium ${data.healthColor}`}>
            {data.health}
          </div>
          <p className="text-xs text-gray-500 mt-1">{healthStatus.description}</p>
        </div>
      </div>

      {/* NDVI 90-day sparkline + recent harvests — a visual rhythm of health + production */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('parcels.index.ndviTrend.label', 'Vigueur végétative · 90 jours')}
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatNdvi(data.ndvi)}
                {ndviDelta != null && (
                  <span
                    className={cn(
                      'ml-2 text-xs font-semibold',
                      ndviDelta > 1
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : ndviDelta < -1
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-500',
                    )}
                  >
                    {ndviDelta > 0 ? '↗' : ndviDelta < 0 ? '↘' : '→'} {Math.abs(ndviDelta).toFixed(1)}%
                  </span>
                )}
              </p>
            </div>
            <Satellite className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="h-24 w-full">
            {ndviSparklineData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ndviSparklineData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 6, padding: '4px 8px' }}
                    labelFormatter={(label) => new Date(label as string).toLocaleDateString('fr-FR')}
                    formatter={(value) => Number(value ?? 0).toFixed(3)}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-md bg-slate-50 text-xs text-slate-400 dark:bg-slate-900/40">
                {t('parcels.index.ndviTrend.empty', 'Pas assez de passages satellite')}
              </div>
            )}
          </div>
          {ndviSparklineData.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {ndviSparklineData.length}{' '}
              {t('parcels.index.ndviTrend.readings', 'passages enregistrés')} ·{' '}
              {new Date(ndviSparklineData[0].date).toLocaleDateString('fr-FR')} →{' '}
              {new Date(ndviSparklineData[ndviSparklineData.length - 1].date).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('parcels.index.harvests.label', 'Récoltes récentes')}
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {totalSeasonHarvestKg > 0
                  ? `${totalSeasonHarvestKg.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kg`
                  : '—'}
                <span className="ml-1 text-xs font-medium text-slate-500">
                  {t('parcels.index.harvests.thisSeason', 'cette saison')}
                </span>
              </p>
            </div>
            <Wheat className="h-5 w-5 text-amber-500" />
          </div>
          {harvests && harvests.length > 0 ? (
            <ul className="space-y-2">
              {harvests.slice(0, 4).map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      {(h as unknown as { lot_number?: string }).lot_number ?? `Lot ${h.id.slice(0, 6)}`}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {h.harvest_date || h.created_at
                        ? new Date(h.harvest_date || h.created_at || '').toLocaleDateString('fr-FR')
                        : '—'}
                      {h.quality_grade ? ` · ${h.quality_grade}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {Number(h.quantity ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}{' '}
                      {h.unit ?? 'kg'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
              <Wheat className="mx-auto mb-1 h-6 w-6 text-slate-300" />
              {t('parcels.index.harvests.empty', 'Aucune récolte enregistrée')}
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
        <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('parcels.index.summary')}</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
            <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.area')}:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {parcel.calculated_area || parcel.area ? `${parcel.calculated_area || parcel.area} ha` : t('parcels.index.notDefined')}
            </span>
          </div>
          {parcel.soil_type && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.soilType')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.soil_type}</span>
            </div>
          )}
          {parcel.irrigation_type && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.irrigation')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.irrigation_type}</span>
            </div>
          )}
          {parcel.tree_type && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.treeType')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.tree_type}</span>
            </div>
          )}
          {parcel.variety && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.variety')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.variety}</span>
            </div>
          )}
          {parcel.planting_year && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.plantingYear')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.planting_year}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.lastUpdate')}:</span>
            <span className="font-medium text-gray-900 dark:text-white">{data.lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* Parcel Description */}
      {parcel.description && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
          <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{t('parcels.index.description')}</h4>
          <p className="text-gray-600 dark:text-gray-400">{parcel.description}</p>
        </div>
      )}

      {/* Tasks History */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Historique des tâches</h4>
          </div>
          {parcelTasks && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {parcelTasks.length} tâche{parcelTasks.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoadingTasks ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 3 }).map((_, skIdx) => (
              <Skeleton key={"sk-" + skIdx} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : parcelTasks && parcelTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tâche</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priorité</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                {parcelTasks.map((task) => {
                  const statusIcon =
                    task.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                    task.status === 'in_progress' ? <Clock className="h-4 w-4 text-blue-500" /> :
                    <Circle className="h-4 w-4 text-gray-400" />;
                  const statusLabel =
                    task.status === 'completed' ? 'Terminée' :
                    task.status === 'in_progress' ? 'En cours' :
                    task.status === 'cancelled' ? 'Annulée' : 'Planifiée';
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {task.scheduled_start
                          ? new Date(task.scheduled_start).toLocaleDateString('fr-FR')
                          : task.due_date
                            ? new Date(task.due_date).toLocaleDateString('fr-FR')
                            : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium max-w-xs">
                        {task.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {task.task_type || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          task.priority === 'high' || task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {task.priority === 'urgent' ? 'Urgent' : task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1.5">
                          {statusIcon}
                          <span className={
                            task.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                            task.status === 'in_progress' ? 'text-blue-600 dark:text-blue-400' :
                            task.status === 'cancelled' ? 'text-red-500 dark:text-red-400' :
                            'text-gray-500 dark:text-gray-400'
                          }>{statusLabel}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucune tâche liée à cette parcelle</p>
          </div>
        )}
      </div>

    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/')({
  component: ParcelOverview,
});
