import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParcelById } from '@/hooks/useParcelsQuery'
import {
  BrainCircuit,
  AlertTriangle,
  Lightbulb,
  Calendar,
  Cloud,
  Settings,
  Lock,
} from 'lucide-react'
import { SectionLoader } from '@/components/ui/loader'
import { cn } from '@/lib/utils'


type AITab = 'dashboard' | 'calibration' | 'alerts' | 'recommendations' | 'plan' | 'weather';

type AIPhase =
  | 'awaiting_data'
  | 'ready_calibration'
  | 'calibrating'
  | 'calibrated'
  | 'awaiting_nutrition_option'
  | 'active'
  | 'archived'
  | string
  | null
  | undefined;

/**
 * Given a parcel's AI phase, compute what's unlocked per tab. Tabs stay
 * visible so the user sees the full shape of the flow — the disabled
 * ones carry a lock icon and a tooltip explaining what still needs to
 * happen before they light up.
 */
function tabAvailability(phase: AIPhase, tabId: AITab): { locked: boolean; reason: string | null } {
  // Always-on tabs — the hub itself, the setup path, and weather which is
  // independent of the AI workflow.
  if (tabId === 'dashboard' || tabId === 'calibration' || tabId === 'weather') {
    return { locked: false, reason: null };
  }

  const isActive = phase === 'active';
  const hasNutritionOption =
    phase === 'awaiting_nutrition_option' || phase === 'active' || phase === 'archived';
  const hasCalibration = hasNutritionOption || phase === 'calibrated';

  if (tabId === 'plan') {
    if (isActive || hasNutritionOption) return { locked: false, reason: null };
    if (hasCalibration) {
      return {
        locked: true,
        reason: 'Choisissez une option de nutrition pour générer le calendrier.',
      };
    }
    return {
      locked: true,
      reason: 'Disponible après validation de la calibration et sélection de la nutrition.',
    };
  }

  if (tabId === 'alerts' || tabId === 'recommendations') {
    if (isActive) return { locked: false, reason: null };
    if (hasNutritionOption) {
      return {
        locked: true,
        reason: 'Disponible dès que la parcelle passe en surveillance active (plan généré).',
      };
    }
    if (hasCalibration) {
      return {
        locked: true,
        reason: 'Disponible après sélection de la nutrition et génération du plan.',
      };
    }
    return {
      locked: true,
      reason: 'Disponible après calibration, nutrition, et génération du plan.',
    };
  }

  return { locked: false, reason: null };
}

const ParcelAILayout = () => {
  const { t } = useTranslation('ai')
  const { parcelId } = Route.useParams();
  const { data: parcel, isLoading } = useParcelById(parcelId);
  const matchRoute = useMatchRoute();

  if (isLoading) {
    return (
      <SectionLoader />
    );
  }

  if (!parcel) return null;

  const aiPhase = (parcel.ai_phase ?? null) as AIPhase;

  const isDashboardActive = !!matchRoute({ to: '/parcels/$parcelId/ai', params: { parcelId } });
  const isCalibrationActive = !!matchRoute({ to: '/parcels/$parcelId/ai/calibration', params: { parcelId } });
  const isAlertsActive = !!matchRoute({ to: '/parcels/$parcelId/ai/alerts', params: { parcelId } });
  const isRecommendationsActive = !!matchRoute({ to: '/parcels/$parcelId/ai/recommendations', params: { parcelId } });
  const isPlanActive = !!matchRoute({ to: '/parcels/$parcelId/ai/plan', params: { parcelId } }) || !!matchRoute({ to: '/parcels/$parcelId/ai/plan/summary', params: { parcelId } });
  const isWeatherActive = !!matchRoute({ to: '/parcels/$parcelId/ai/weather', params: { parcelId } });

  const tabs: { id: AITab; to: string; label: string; icon: ReactNode; active: boolean }[] = [
    {
      id: 'dashboard',
      to: `/parcels/${parcelId}/ai`,
      label: t('tabs.compass'),
      icon: <BrainCircuit className="w-4 h-4" />,
      active: isDashboardActive,
    },
    {
      id: 'calibration',
      to: `/parcels/${parcelId}/ai/calibration`,
      label: t('tabs.calibration'),
      icon: <Settings className="w-4 h-4" />,
      active: isCalibrationActive,
    },
    {
      id: 'alerts',
      to: `/parcels/${parcelId}/ai/alerts`,
      label: t('tabs.alerts'),
      icon: <AlertTriangle className="w-4 h-4" />,
      active: isAlertsActive,
    },
    {
      id: 'recommendations',
      to: `/parcels/${parcelId}/ai/recommendations`,
      label: t('tabs.recommendations'),
      icon: <Lightbulb className="w-4 h-4" />,
      active: isRecommendationsActive,
    },
    {
      id: 'plan',
      to: `/parcels/${parcelId}/ai/plan`,
      label: t('tabs.plan'),
      icon: <Calendar className="w-4 h-4" />,
      active: isPlanActive,
    },
    {
      id: 'weather',
      to: `/parcels/${parcelId}/ai/weather`,
      label: t('tabs.weather'),
      icon: <Cloud className="w-4 h-4" />,
      active: isWeatherActive,
    },
  ];

  // Find the first locked tab to drive a banner explaining what's still
  // missing — prevents users from clicking around looking for data that
  // hasn't been generated yet.
  const firstLocked = tabs
    .map((tab) => ({ tab, ...tabAvailability(aiPhase, tab.id) }))
    .find((t) => t.locked);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto" aria-label="AI tabs">
          {tabs.map((tab) => {
            const { locked, reason } = tabAvailability(aiPhase, tab.id);
            const baseClass =
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap';
            const activeClass = 'border-green-600 text-green-700 dark:text-green-400';
            const inactiveClass =
              'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300';
            const lockedClass =
              'border-transparent text-gray-400 cursor-not-allowed opacity-60 dark:text-gray-500';

            if (locked) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled
                  aria-disabled
                  title={reason ?? undefined}
                  className={cn(baseClass, lockedClass)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <Lock className="h-3 w-3" aria-hidden />
                </button>
              );
            }

            return (
              <Link
                key={tab.id}
                to={tab.to}
                className={cn(baseClass, tab.active ? activeClass : inactiveClass)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Gentle banner explaining what's still locked — only shown when at
          least one tab is gated. Surfaces the single most-advanced lock
          reason so the user knows exactly what unlocks the rest. */}
      {firstLocked && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">Certaines sections ne sont pas encore disponibles</p>
            <p className="mt-0.5 text-[13px] opacity-90">{firstLocked.reason}</p>
          </div>
        </div>
      )}

      <Outlet />
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai')({
  component: ParcelAILayout,
});
