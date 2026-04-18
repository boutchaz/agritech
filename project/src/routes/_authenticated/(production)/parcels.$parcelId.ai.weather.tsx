import { createFileRoute } from '@tanstack/react-router';
import { ContentSkeleton } from '@/components/ui/page-skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense, lazy } from 'react';
import { useParcelById } from '@/hooks/useParcelsQuery';
import { useAuth } from '@/hooks/useAuth';
import { useDiseaseRisk } from '@/hooks/usePestAlerts';
import {
  Activity,
  AlertTriangle,
  Cloud,
  Droplets,

  Shield,
  Thermometer,
} from 'lucide-react';
import { SectionLoader } from '@/components/ui/loader';

const WeatherAnalyticsView = lazy(() => import('../../../components/WeatherAnalytics/WeatherAnalyticsView'));

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
};

const DiseaseRiskPanel = ({
  parcelId,
  organizationId,
}: {
  parcelId: string;
  organizationId: string | null;
}) => {
  const { data, isLoading, error } = useDiseaseRisk(organizationId, parcelId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Skeleton className="h-5 w-48 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800/30 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Risk analysis unavailable</h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Weather analytics remain available, but the crop disease risk model could not be loaded for this parcel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const activeRisks = data.risks.filter((risk) => risk.risk_active);
  const currentTemperature = data.weather.temperature;
  const currentHumidity = data.weather.humidity;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            AI Weather Risk Brief
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Crop-specific disease exposure inferred from the latest parcel weather conditions.
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
          Crop: {data.crop_type || 'Unknown'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <Activity className="h-4 w-4 text-red-500" />
            Active Risks
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{activeRisks.length}</div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activeRisks.length > 0 ? 'Conditions currently match one or more disease profiles.' : 'No active disease signals from the latest weather sample.'}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <Thermometer className="h-4 w-4 text-orange-500" />
            Latest Temperature
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {currentTemperature != null ? `${currentTemperature.toFixed(1)}°C` : 'N/A'}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {data.weather.date ? `Measured on ${data.weather.date}` : 'No recent parcel weather reading.'}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <Droplets className="h-4 w-4 text-cyan-500" />
            Latest Humidity
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {currentHumidity != null ? `${currentHumidity.toFixed(0)}%` : 'N/A'}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Used to evaluate crop-specific humidity thresholds.
          </p>
        </div>
      </div>

      {data.risks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
          No disease models are configured yet for this crop, so only weather analytics are shown below.
        </div>
      ) : activeRisks.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-200">
          Current temperature and humidity do not activate any configured disease risk profile for this crop.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {activeRisks.map((risk) => (
            <div
              key={`${risk.disease_name}-${risk.humidity_threshold ?? 'na'}-${risk.temperature_range.min ?? 'na'}-${risk.temperature_range.max ?? 'na'}`}
              className="rounded-lg border border-red-200 bg-red-50/70 p-4 dark:border-red-800/30 dark:bg-red-900/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {risk.disease_name_fr || risk.disease_name}
                  </h4>
                  {risk.pathogen_name && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{risk.pathogen_name}</p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SEVERITY_STYLES[risk.severity ?? ''] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                  {risk.severity ?? 'unknown'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  Temperature window: {risk.temperature_range.min ?? 'N/A'}°C to {risk.temperature_range.max ?? 'N/A'}°C
                </p>
                <p>
                  Humidity threshold: {risk.humidity_threshold != null ? `${risk.humidity_threshold}%` : 'N/A'}
                </p>
                {risk.treatment_product && (
                  <p>Suggested treatment: {risk.treatment_product}{risk.treatment_dose ? ` • ${risk.treatment_dose}` : ''}</p>
                )}
                {risk.treatment_timing && <p>Timing: {risk.treatment_timing}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AIWeatherPage = () => {
  const { parcelId } = Route.useParams();
  const { currentOrganization } = useAuth();
  const { data: parcel, isLoading } = useParcelById(parcelId);

  if (isLoading) {
    return <SectionLoader className="h-64 py-0" />;
  }

  if (!parcel) {
    return null;
  }

  const hasBoundary = Array.isArray(parcel.boundary) && parcel.boundary.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Weather Analysis</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Weather analytics, forecast trends, and crop risk signals for this parcel.
        </p>
      </div>

      {hasBoundary ? (
        <>
          <DiseaseRiskPanel
            parcelId={parcelId}
            organizationId={currentOrganization?.id ?? null}
          />

          <Suspense
            fallback={<ContentSkeleton lines={6} className="p-6" />}
          >
            <WeatherAnalyticsView
              parcelId={parcelId}
              parcelBoundary={parcel.boundary}
              parcelName={parcel.name}
              cropType={parcel.planting_type}
              treeType={parcel.tree_type}
              variety={parcel.variety}
            />
          </Suspense>
        </>
      ) : (
        <div className="rounded-xl bg-white py-12 text-center dark:bg-gray-800">
          <Cloud className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <p className="mb-2 text-gray-600 dark:text-gray-400">
            Parcel location data is required for weather analysis.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Add or correct the parcel boundary to enable forecast, climate, and risk analysis.
          </p>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/weather')({
  component: AIWeatherPage,
});
