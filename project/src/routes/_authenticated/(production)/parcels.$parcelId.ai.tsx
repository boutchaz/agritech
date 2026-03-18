import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { type ReactNode } from 'react'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { BrainCircuit, AlertTriangle, Lightbulb, Calendar, Cloud, Settings } from 'lucide-react'

type AITab = 'dashboard' | 'calibration' | 'alerts' | 'recommendations' | 'plan' | 'weather';

const ParcelAILayout = () => {
  const { parcelId } = Route.useParams();
  const { data: parcel, isLoading } = useParcelById(parcelId);
  const matchRoute = useMatchRoute();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!parcel) return null;

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
      label: 'Dashboard',
      icon: <BrainCircuit className="w-4 h-4" />,
      active: isDashboardActive,
    },
    {
      id: 'calibration',
      to: `/parcels/${parcelId}/ai/calibration`,
      label: 'Calibration',
      icon: <Settings className="w-4 h-4" />,
      active: isCalibrationActive,
    },
    {
      id: 'alerts',
      to: `/parcels/${parcelId}/ai/alerts`,
      label: 'Alerts',
      icon: <AlertTriangle className="w-4 h-4" />,
      active: isAlertsActive,
    },
    {
      id: 'recommendations',
      to: `/parcels/${parcelId}/ai/recommendations`,
      label: 'Recommendations',
      icon: <Lightbulb className="w-4 h-4" />,
      active: isRecommendationsActive,
    },
    {
      id: 'plan',
      to: `/parcels/${parcelId}/ai/plan`,
      label: 'Plan annuel',
      icon: <Calendar className="w-4 h-4" />,
      active: isPlanActive,
    },
    {
      id: 'weather',
      to: `/parcels/${parcelId}/ai/weather`,
      label: 'Weather',
      icon: <Cloud className="w-4 h-4" />,
      active: isWeatherActive,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.to}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab.active
                  ? 'border-green-600 text-green-700 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai')({
  component: ParcelAILayout,
});
