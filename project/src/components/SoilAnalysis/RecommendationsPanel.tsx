import React from 'react';
import { AlertCircle, CheckCircle, Info, Calendar, Package } from 'lucide-react';
import type { Recommendation } from '../../utils/soilRecommendations';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({ recommendations }) => {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <Info className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'low':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Priorité élevée';
      case 'medium':
        return 'Priorité moyenne';
      case 'low':
        return 'Information';
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucune recommandation urgente
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Les paramètres du sol sont dans les normes acceptables
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recommandations
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {recommendations.length} recommandation{recommendations.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 border ${getPriorityBg(rec.priority)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getPriorityIcon(rec.priority)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                    {rec.title}
                  </h4>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    rec.priority === 'high' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
                    rec.priority === 'medium' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                    'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                  }`}>
                    {getPriorityLabel(rec.priority)}
                  </span>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {rec.description}
                </p>

                <div className="bg-white dark:bg-gray-800 rounded-md p-3 space-y-2">
                  <div className="flex items-start space-x-2">
                    <Package className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Action recommandée
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {rec.action}
                      </p>
                    </div>
                  </div>

                  {rec.quantity && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Quantité:
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {rec.quantity}
                      </span>
                    </div>
                  )}

                  {rec.timing && (
                    <div className="flex items-start space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Période d'application
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {rec.timing}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>Note:</strong> Ces recommandations sont basées sur des valeurs standard.
          Consultez un agronome pour un plan de fertilisation personnalisé adapté à votre situation spécifique.
        </p>
      </div>
    </div>
  );
};

export default RecommendationsPanel;