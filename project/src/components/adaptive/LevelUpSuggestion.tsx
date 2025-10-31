import React from 'react';
import { TrendingUp, X } from 'lucide-react';
import { useExperienceLevel } from '@/contexts/ExperienceLevelContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EXPERIENCE_LEVELS } from '@/types/experience-level';

/**
 * LevelUpSuggestion - Smart toast that suggests upgrading experience level
 *
 * Shows when user has accumulated enough usage to benefit from higher level
 * Can be dismissed permanently per session
 */
export const LevelUpSuggestion: React.FC = () => {
  const { level, setLevel, shouldSuggestUpgrade, dismissHint } = useExperienceLevel();
  const [isDismissed, setIsDismissed] = React.useState(false);

  const suggestedLevel = shouldSuggestUpgrade();

  // Don't show if no suggestion or already dismissed
  if (!suggestedLevel || isDismissed) {
    return null;
  }

  const suggestedConfig = EXPERIENCE_LEVELS[suggestedLevel];

  const handleUpgrade = async () => {
    await setLevel(suggestedLevel);
    setIsDismissed(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Track dismissal so we don't show again this session
    dismissHint(`level-upgrade-${suggestedLevel}`);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4">
      <Card className="shadow-lg border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                Prêt pour le niveau suivant ?
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Vous maîtrisez déjà bien l'application. Passez au niveau{' '}
                <strong>{suggestedConfig.label}</strong> pour débloquer plus de fonctionnalités.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500 mb-3 pl-3 border-l-2 border-green-200 dark:border-green-800">
                {suggestedConfig.description}
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleUpgrade}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Passer au niveau {suggestedConfig.label}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDismiss}>
                  Plus tard
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
