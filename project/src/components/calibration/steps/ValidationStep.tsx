import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calibrationV2Api } from '@/lib/api/calibration-v2';
import { useAuth } from '@/hooks/useAuth';

interface ReadinessCheck {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

interface ReadinessResponse {
  ready: boolean;
  confidence_preview: number;
  checks: ReadinessCheck[];
  improvements: string[];
}

interface ValidationStepProps {
  parcelId: string;
  onLaunchCalibration: () => Promise<void>;
  canLaunch: boolean;
  isLaunching: boolean;
}

const COMPONENT_WEIGHTS: Array<{ key: string; label: string; weight: number }> = [
  { key: 'satellite', label: 'Satellite', weight: 30 },
  { key: 'soil', label: 'Sol', weight: 20 },
  { key: 'water', label: 'Eau', weight: 15 },
  { key: 'yield', label: 'Rendements', weight: 20 },
  { key: 'profile', label: 'Profil', weight: 10 },
  { key: 'coherence', label: 'Coherence', weight: 5 },
];

function mapCheckToComponent(check: string): string {
  const normalized = check.toLowerCase();
  if (normalized.includes('satellite')) return 'satellite';
  if (normalized.includes('soil') || normalized.includes('sol')) return 'soil';
  if (normalized.includes('water') || normalized.includes('eau')) return 'water';
  if (normalized.includes('yield') || normalized.includes('harvest') || normalized.includes('rendement')) return 'yield';
  if (normalized.includes('profile') || normalized.includes('complet')) return 'profile';
  return 'coherence';
}

function statusMultiplier(statuses: Array<'pass' | 'fail' | 'warning'>): number {
  if (statuses.length === 0) {
    return 0.6;
  }

  if (statuses.some((status) => status === 'fail')) {
    return 0.2;
  }

  if (statuses.some((status) => status === 'warning')) {
    return 0.6;
  }

  return 1;
}

export function ValidationStep({ parcelId, onLaunchCalibration, canLaunch, isLaunching }: ValidationStepProps) {
  const { currentOrganization } = useAuth();
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReadiness = useCallback(async () => {
    if (!currentOrganization?.id) {
      setError('Aucune organisation selectionnee');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await calibrationV2Api.checkReadiness(parcelId, currentOrganization.id);
      setReadiness(response);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Impossible de verifier le niveau de preparation');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, parcelId]);

  useEffect(() => {
    fetchReadiness();
  }, [fetchReadiness]);

  const confidenceComponents = useMemo(() => {
    const groupedStatuses = new Map<string, Array<'pass' | 'fail' | 'warning'>>();

    readiness?.checks.forEach((check) => {
      const componentKey = mapCheckToComponent(check.check);
      const existingStatuses = groupedStatuses.get(componentKey) ?? [];
      groupedStatuses.set(componentKey, [...existingStatuses, check.status]);
    });

    return COMPONENT_WEIGHTS.map((component) => {
      const statuses = groupedStatuses.get(component.key) ?? [];
      const multiplier = statusMultiplier(statuses);
      const score = Math.round(component.weight * multiplier);

      return {
        ...component,
        score,
      };
    });
  }, [readiness]);

  const hasSatelliteBackgroundSyncNotice = useMemo(
    () =>
      readiness?.checks?.some(
        (check) =>
          check.check === 'satellite_data' &&
          check.status === 'warning',
      ) ?? false,
    [readiness],
  );

  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800"
        data-testid="calibration-readiness-loading"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">Calcul du niveau de confiance en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 dark:border-red-700 p-4 bg-red-50 dark:bg-red-900/20 space-y-3"
        data-testid="calibration-readiness-error"
      >
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <Button type="button" variant="outline" onClick={fetchReadiness}>
          <RefreshCw className="w-4 h-4" />
          Reessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="calibration-readiness-panel">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Niveau de confiance estime</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{Math.min(Math.round(readiness?.confidence_preview ?? 0), 100)}%</p>
          </div>
          <Button type="button" variant="outline" onClick={fetchReadiness}>
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Ce score reflete la qualite des donnees disponibles et ne prejuge pas de la qualite du calibrage.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Composantes du score</h4>
        {confidenceComponents.map((component) => {
          const pct = component.weight === 0 ? 0 : (component.score / component.weight) * 100;
          return (
            <div key={component.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-300">{component.label}</span>
                <span className="text-gray-500 dark:text-gray-400">{component.score}/{component.weight}</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Controles disponibilite donnees</h4>
          {readiness?.checks?.map((check) => {
            const icon = check.status === 'pass'
              ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              : check.status === 'warning'
                ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                : <XCircle className="w-4 h-4 text-red-500 mt-0.5" />;

            return (
              <div key={`${check.check}-${check.message}`} className="flex items-start gap-2 text-sm">
                {icon}
                <div>
                  <p className="text-gray-800 dark:text-gray-200">{check.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Suggestions d'amelioration</h4>
          {(readiness?.improvements?.length ?? 0) > 0 ? (
            readiness?.improvements?.map((improvement) => (
              <div key={improvement} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                <span>{improvement}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune action immediate recommandee.</p>
          )}
        </div>
      </div>

      {hasSatelliteBackgroundSyncNotice && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-700 p-4 bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            L'absence de donnees satellite en cache ne bloque pas le calibrage initial. Si necessaire,
            la synchronisation satellite sera declenchee automatiquement en arriere-plan apres le lancement.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onLaunchCalibration}
          disabled={!canLaunch || isLaunching || !readiness?.ready}
          className="bg-green-600 hover:bg-green-700 text-white"
          data-testid="calibration-readiness-launch"
        >
          {isLaunching ? 'Lancement en cours...' : 'Lancer le calibrage'}
        </Button>
      </div>
    </div>
  );
}
