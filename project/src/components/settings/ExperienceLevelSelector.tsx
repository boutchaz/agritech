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
export const ExperienceLevelSelector = () => {
  const { level: currentLevel, setLevel } = useExperienceLevel();
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

  const featureRow = (iconClass: string, featureKey: string) => (
    <li className="flex min-w-0 items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
      <Check className={`mt-0.5 h-3 w-3 shrink-0 ${iconClass}`} />
      <span className="min-w-0 break-normal leading-snug">{getFeatureLabel(featureKey)}</span>
    </li>
  );

  return (
    <div className="min-w-0 max-w-full space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h3 className="mb-1.5 text-balance text-base font-semibold text-gray-900 dark:text-white sm:mb-2 sm:text-lg">
          {t('preferences.experienceLevel.title')}
        </h3>
        <p className="text-pretty text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:text-sm">
          {t('preferences.experienceLevel.subtitle')}
        </p>
      </div>

      {/* Single column until md (~768px): sm:2-col was ~158px/card and broke titles letter-by-letter */}
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {Object.entries(EXPERIENCE_LEVELS).map(([key, levelConfig]) => {
          const isSelected = selectedLevel === key;
          const isCurrent = currentLevel === key;
          const level = key as ExperienceLevel;

          return (
            <Card
              key={key}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedLevel(level);
                }
              }}
              className={`min-w-0 cursor-pointer overflow-hidden transition-all ${
                isSelected
                  ? 'border-green-500 ring-2 ring-green-200 dark:border-green-600 dark:ring-green-800'
                  : 'hover:border-gray-400 dark:hover:border-gray-600'
              }`}
              onClick={() => setSelectedLevel(level)}
            >
              <CardContent className="p-3 sm:p-4">
                {/* Always stack title row vs badges — never squeeze title beside badges in a narrow track */}
                <div className="mb-3 flex flex-col gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <GraduationCap
                      className={`h-5 w-5 shrink-0 ${
                        isSelected ? 'text-green-600' : 'text-gray-400'
                      }`}
                    />
                    <span className="min-w-0 flex-1 text-base font-semibold leading-tight text-gray-900 break-normal dark:text-white">
                      {getLevelLabel(level)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 ps-0 md:ps-[1.75rem]">
                    {isCurrent && (
                      <div className="flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                        <Check className="h-3 w-3 shrink-0" />
                        <span className="whitespace-nowrap">{t('preferences.experienceLevel.current')}</span>
                      </div>
                    )}
                    {isSelected && !isCurrent && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                <p className="mb-3 text-pretty text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mb-4 sm:text-sm">
                  {getLevelDescription(level)}
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500 dark:text-gray-500">
                    {t('preferences.experienceLevel.featuresLabel')} :
                  </Label>
                  <ul className="space-y-1.5">
                    {levelConfig.features.showAdvancedFilters &&
                      featureRow('text-green-500', 'advancedFilters')}
                    {levelConfig.features.showAnalytics && featureRow('text-green-500', 'analytics')}
                    {levelConfig.features.showBulkActions && featureRow('text-green-500', 'bulkActions')}
                    {levelConfig.features.enableGuidedTours && featureRow('text-blue-500', 'guidedTours')}
                    {levelConfig.features.showContextualHelp &&
                      featureRow('text-blue-500', 'contextualHelp')}
                    {levelConfig.features.showDataExport && featureRow('text-green-500', 'dataExport')}
                    {levelConfig.features.enableKeyboardShortcuts &&
                      featureRow('text-purple-500', 'keyboardShortcuts')}
                    {levelConfig.features.showApiAccess && featureRow('text-purple-500', 'apiAccess')}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedLevel !== currentLevel && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="default"
            onClick={handleSave}
            disabled={isSaving}
            className="h-11 w-full sm:h-10 sm:w-auto sm:min-w-32"
          >
            {isSaving ? t('preferences.saving') : t('preferences.save')}
          </Button>
        </div>
      )}
    </div>
  );
};
