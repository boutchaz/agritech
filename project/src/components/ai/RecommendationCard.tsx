import React from 'react';
import { Check, X, Play } from 'lucide-react';
import type { AIRecommendation } from '@/lib/api/ai-recommendations';
import { Button } from '@/components/ui/button';

interface RecommendationCardProps {
  recommendation: AIRecommendation;
  onValidate?: (id: string) => void;
  onReject?: (id: string) => void;
  onExecute?: (id: string) => void;
  isValidating?: boolean;
  isRejecting?: boolean;
  isExecuting?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onValidate,
  onReject,
  onExecute,
  isValidating,
  isRejecting,
  isExecuting,
}) => {
  const getPriorityColor = () => {
    switch (recommendation.priority) {
      case 'high': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      case 'medium': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20';
      case 'low': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  const getStatusColor = () => {
    switch (recommendation.status) {
      case 'validated': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
      case 'rejected': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      case 'executed': return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="flex space-x-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getPriorityColor()}`}>
            {recommendation.priority} Priority
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor()}`}>
            {recommendation.status}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(recommendation.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Constat</h4>
          <p className="text-gray-900 dark:text-white text-sm">{recommendation.constat}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Diagnostic</h4>
          <p className="text-gray-900 dark:text-white text-sm">{recommendation.diagnostic}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4 border border-green-100 dark:border-green-900/30">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-400 uppercase tracking-wider mb-1">Recommended Action</h4>
          <p className="text-green-900 dark:text-green-300 font-medium">{recommendation.action}</p>
        </div>
      </div>

      {recommendation.status === 'pending' && (
        <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          {onValidate && (
            <Button variant="green"
              type="button"
              onClick={() => onValidate(recommendation.id)}
              disabled={isValidating}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Validate</span>
            </Button>
          )}
          {onReject && (
            <Button
              type="button"
              onClick={() => onReject(recommendation.id)}
              disabled={isRejecting}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              <span>Reject</span>
            </Button>
          )}
        </div>
      )}

      {recommendation.status === 'validated' && onExecute && (
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button variant="purple"
            type="button"
            onClick={() => onExecute(recommendation.id)}
            disabled={isExecuting}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Execute Action</span>
          </Button>
        </div>
      )}
    </div>
  );
};
