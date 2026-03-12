import { createFileRoute } from '@tanstack/react-router'
import { useAIPlan } from '@/hooks/useAIPlan'
import { FileText } from 'lucide-react'

const AIPlanSummaryPage = () => {
  const { parcelId } = Route.useParams();
  const { data: plan, isLoading } = useAIPlan(parcelId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Plan Summary</h3>
        </div>

        {!plan ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No plan summary available.</p>
        ) : (
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              This is a placeholder for the AI-generated plan summary. The backend will provide a detailed text summary of the annual plan, including key objectives, expected outcomes, and major milestones.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Estimated Yield</h4>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">--</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Resource Usage</h4>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">--</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Risk Level</h4>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">--</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/plan/summary')({
  component: AIPlanSummaryPage,
});
