import React from 'react';
import { useExperienceLevel } from '@/contexts/ExperienceLevelContext';
import type { ExperienceLevelConfig } from '@/types/experience-level';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdaptiveSectionProps {
  children: React.ReactNode;
  requiredFeature?: keyof ExperienceLevelConfig['features'];
  title?: string;
  description?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * AdaptiveSection - Shows/hides content based on experience level
 *
 * In basic mode: Hidden by default or collapsed behind "Advanced" toggle
 * In medium mode: Visible but may be collapsible
 * In expert mode: Always visible and expanded
 */
export const AdaptiveSection: React.FC<AdaptiveSectionProps> = ({
  children,
  requiredFeature,
  title = 'Options avancées',
  description,
  collapsible = true,
  defaultExpanded = false,
  className = '',
}) => {
  const { level, hasFeature } = useExperienceLevel();
  const [isExpanded, setIsExpanded] = React.useState(
    level === 'expert' ? true : defaultExpanded
  );

  // Check if feature is available at current level
  if (requiredFeature && !hasFeature(requiredFeature)) {
    return null;
  }

  // Expert mode: always expanded, not collapsible
  if (level === 'expert') {
    return <div className={className}>{children}</div>;
  }

  // Basic/Medium mode: collapsible section
  if (collapsible) {
    return (
      <div className={`border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">{title}</div>
            {description && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {description}
              </div>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {isExpanded && <div className="px-4 pb-4">{children}</div>}
      </div>
    );
  }

  // Non-collapsible but with title
  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{title}</div>
          {description && (
            <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
