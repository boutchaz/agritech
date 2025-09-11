import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import type { Recommendation } from '../hooks/useRecommendations';

interface RecommendationsProps {
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
}

const Recommendations: React.FC<RecommendationsProps> = ({
  recommendations,
  loading,
  error
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">Aucune recommandation pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((recommendation, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg flex items-start space-x-3 ${
            recommendation.type === 'warning'
              ? 'bg-yellow-50 dark:bg-yellow-900/20'
              : 'bg-blue-50 dark:bg-blue-900/20'
          }`}
        >
          {recommendation.type === 'warning' ? (
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          ) : (
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
          )}
          <div>
            <p
              className={`${
                recommendation.type === 'warning'
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-blue-700 dark:text-blue-300'
              }`}
            >
              {recommendation.message}
            </p>
            <span
              className={`text-sm ${
                recommendation.priority === 'high'
                  ? 'text-red-600 dark:text-red-400'
                  : recommendation.priority === 'medium'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Priorité: {recommendation.priority}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Recommendations;