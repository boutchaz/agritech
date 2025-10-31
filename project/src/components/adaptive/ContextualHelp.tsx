import React from 'react';
import { X, HelpCircle, Info, AlertTriangle, Lightbulb, Zap } from 'lucide-react';
import { useExperienceLevel } from '@/contexts/ExperienceLevelContext';
import type { ContextualHint } from '@/types/experience-level';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ContextualHelpProps {
  hint: ContextualHint;
  className?: string;
}

const CATEGORY_ICONS = {
  feature: HelpCircle,
  shortcut: Zap,
  tip: Lightbulb,
  warning: AlertTriangle,
};

const CATEGORY_COLORS = {
  feature: 'text-blue-500',
  shortcut: 'text-purple-500',
  tip: 'text-green-500',
  warning: 'text-yellow-500',
};

/**
 * ContextualHelp - Shows dismissible contextual hints
 *
 * Only shown to users in basic/medium modes
 * Can be permanently dismissed per hint ID
 */
export const ContextualHelp: React.FC<ContextualHelpProps> = ({ hint, className = '' }) => {
  const { level, config, isHintDismissed, dismissHint } = useExperienceLevel();

  // Don't show if contextual help is disabled for this level
  if (!config.features.showContextualHelp) {
    return null;
  }

  // Don't show if not targeted for current level
  if (!hint.targetLevel.includes(level)) {
    return null;
  }

  // Don't show if already dismissed
  if (isHintDismissed(hint.id)) {
    return null;
  }

  const Icon = CATEGORY_ICONS[hint.category];
  const iconColor = CATEGORY_COLORS[hint.category];

  return (
    <Alert className={`relative ${className}`}>
      <div className="flex items-start space-x-3">
        <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
            {hint.title}
          </div>
          <AlertDescription className="text-sm text-gray-600 dark:text-gray-400">
            {hint.content}
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 h-6 w-6 p-0"
          onClick={() => dismissHint(hint.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};

/**
 * HelpTrigger - Inline help icon that shows hint on hover/click
 */
interface HelpTriggerProps {
  content: string;
  className?: string;
}

export const HelpTrigger: React.FC<HelpTriggerProps> = ({ content, className = '' }) => {
  const { config } = useExperienceLevel();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!config.features.showContextualHelp) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg w-64">
          <div className="text-xs">{content}</div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      )}
    </div>
  );
};
