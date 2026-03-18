import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { Calendar, FileText } from 'lucide-react'

const AIPlanLayout = () => {
  const { parcelId } = Route.useParams();
  const search = Route.useSearch();
  const matchRoute = useMatchRoute();

  const isCalendarActive = !!matchRoute({ to: '/parcels/$parcelId/ai/plan', params: { parcelId } });
  const isSummaryActive = !!matchRoute({ to: '/parcels/$parcelId/ai/plan/summary', params: { parcelId } });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plan annuel</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Calendrier des interventions et taches generees par l'IA.</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <Link
            to="/parcels/$parcelId/ai/plan"
            params={{ parcelId }}
            search={{ farmId: search.farmId }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isCalendarActive
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendrier</span>
          </Link>
          <Link
            to="/parcels/$parcelId/ai/plan/summary"
            params={{ parcelId }}
            search={{ farmId: search.farmId }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isSummaryActive
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Synthese</span>
          </Link>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/plan')({
  component: AIPlanLayout,
});
