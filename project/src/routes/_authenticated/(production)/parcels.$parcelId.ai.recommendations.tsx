import { createFileRoute } from '@tanstack/react-router'
import { useAIRecommendations, useValidateAIRecommendation, useRejectAIRecommendation, useExecuteAIRecommendation } from '@/hooks/useAIRecommendations'
import { RecommendationCard } from '@/components/ai/RecommendationCard'
import { Lightbulb } from 'lucide-react'

const AIRecommendationsPage = () => {
  const { parcelId } = Route.useParams();
  const { data: recommendations, isLoading } = useAIRecommendations(parcelId);
  const { mutate: validateRecommendation, isPending: isValidating } = useValidateAIRecommendation();
  const { mutate: rejectRecommendation, isPending: isRejecting } = useRejectAIRecommendation();
  const { mutate: executeRecommendation, isPending: isExecuting } = useExecuteAIRecommendation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Recommendations</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Actionable insights to improve crop health and yield.</p>
      </div>

      {!recommendations || recommendations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-yellow-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Recommendations</h3>
          <p className="text-gray-500 dark:text-gray-400">The AI model has no new recommendations for this parcel at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onValidate={(id) => validateRecommendation(id)}
              onReject={(id) => rejectRecommendation(id)}
              onExecute={(id) => executeRecommendation({ id })}
              isValidating={isValidating}
              isRejecting={isRejecting}
              isExecuting={isExecuting}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/recommendations')({
  component: AIRecommendationsPage,
});
