import React from 'react';
import { Check, GraduationCap } from 'lucide-react';
import { useExperienceLevel } from '@/contexts/ExperienceLevelContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EXPERIENCE_LEVELS, type ExperienceLevel } from '@/types/experience-level';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * ExperienceLevelSelector - Allows users to change their UI complexity level
 *
 * Shows all available levels with feature comparison
 * Users can upgrade or downgrade at any time
 */
export const ExperienceLevelSelector: React.FC = () => {
  const { level: currentLevel, setLevel, config } = useExperienceLevel();
  const { t } = useTranslation();
  const [selectedLevel, setSelectedLevel] = React.useState(currentLevel);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    if (selectedLevel === currentLevel) return;

    setIsSaving(true);
    try {
      await setLevel(selectedLevel);

      // Show success toast
      const levelLabel = t(`preferences.experienceLevel.levels.${selectedLevel}.label`);
      toast.success(t('preferences.experienceLevel.success'), {
        description: t('preferences.experienceLevel.successDescription', { level: levelLabel }),
        duration: 4000,
      });
    } catch (error) {
      // Show error toast
      toast.error(t('preferences.experienceLevel.error'), {
        description: t('preferences.experienceLevel.errorDescription'),
        duration: 4000,
      });
      console.error('Failed to update experience level:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getLevelLabel = (level: ExperienceLevel) => {
    return t(`preferences.experienceLevel.levels.${level}.label`);
  };

  const getLevelDescription = (level: ExperienceLevel) => {
    return t(`preferences.experienceLevel.levels.${level}.description`);
  };

  const getFeatureLabel = (featureKey: string) => {
    return t(`preferences.experienceLevel.features.${featureKey}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('preferences.experienceLevel.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('preferences.experienceLevel.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(EXPERIENCE_LEVELS).map(([key, levelConfig]) => {
          const isSelected = selectedLevel === key;
          const isCurrent = currentLevel === key;
          const level = key as ExperienceLevel;

          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-green-500 dark:border-green-600 ring-2 ring-green-200 dark:ring-green-800'
                  : 'hover:border-gray-400 dark:hover:border-gray-600'
              }`}
              onClick={() => setSelectedLevel(level)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <GraduationCap
                      className={`h-5 w-5 ${
                        isSelected ? 'text-green-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {getLevelLabel(level)}
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="flex items-center space-x-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                      <Check className="h-3 w-3" />
                      <span>{t('preferences.experienceLevel.current')}</span>
                    </div>
                  )}
                  {isSelected && !isCurrent && (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {getLevelDescription(level)}
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500 dark:text-gray-500">
                    {t('preferences.experienceLevel.featuresLabel')} :
                  </Label>
                  <ul className="space-y-1">
                    {levelConfig.features.showAdvancedFilters && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        {getFeatureLabel('advancedFilters')}
                      </li>
                    )}
                    {levelConfig.features.showAnalytics && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        {getFeatureLabel('analytics')}
                      </li>
                    )}
                    {levelConfig.features.showBulkActions && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        {getFeatureLabel('bulkActions')}
                      </li>
                    )}
                    {levelConfig.features.enableGuidedTours && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-blue-500" />
                        {getFeatureLabel('guidedTours')}
                      </li>
                    )}
                    {levelConfig.features.showContextualHelp && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-blue-500" />
                        {getFeatureLabel('contextualHelp')}
                      </li>
                    )}
                    {levelConfig.features.showDataExport && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        {getFeatureLabel('dataExport')}
                      </li>
                    )}
                    {levelConfig.features.enableKeyboardShortcuts && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-purple-500" />
                        {getFeatureLabel('keyboardShortcuts')}
                      </li>
                    )}
                    {levelConfig.features.showApiAccess && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-purple-500" />
                        {getFeatureLabel('apiAccess')}
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedLevel !== currentLevel && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
            {isSaving ? t('preferences.saving') : t('preferences.save')}
          </Button>
        </div>
      )}
    </div>
  );
};
