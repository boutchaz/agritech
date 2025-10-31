import React from 'react';
import { Check, GraduationCap } from 'lucide-react';
import { useExperienceLevel } from '@/contexts/ExperienceLevelContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EXPERIENCE_LEVELS, type ExperienceLevel } from '@/types/experience-level';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * ExperienceLevelSelector - Allows users to change their UI complexity level
 *
 * Shows all available levels with feature comparison
 * Users can upgrade or downgrade at any time
 */
export const ExperienceLevelSelector: React.FC = () => {
  const { level: currentLevel, setLevel, config } = useExperienceLevel();
  const [selectedLevel, setSelectedLevel] = React.useState(currentLevel);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    if (selectedLevel === currentLevel) return;

    setIsSaving(true);
    try {
      await setLevel(selectedLevel);

      // Show success toast
      const levelConfig = EXPERIENCE_LEVELS[selectedLevel];
      toast.success('Niveau d\'expérience mis à jour', {
        description: `Vous êtes maintenant au niveau ${levelConfig.label}. Les fonctionnalités de l'interface ont été ajustées.`,
        duration: 4000,
      });
    } catch (error) {
      // Show error toast
      toast.error('Erreur lors de la mise à jour', {
        description: 'Impossible de sauvegarder votre niveau d\'expérience. Veuillez réessayer.',
        duration: 4000,
      });
      console.error('Failed to update experience level:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Niveau d'expérience
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choisissez le niveau de complexité de l'interface qui vous convient le mieux.
          Vous pouvez le modifier à tout moment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(EXPERIENCE_LEVELS).map(([key, levelConfig]) => {
          const isSelected = selectedLevel === key;
          const isCurrent = currentLevel === key;

          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-green-500 dark:border-green-600 ring-2 ring-green-200 dark:ring-green-800'
                  : 'hover:border-gray-400 dark:hover:border-gray-600'
              }`}
              onClick={() => setSelectedLevel(key as ExperienceLevel)}
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
                      {levelConfig.label}
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="flex items-center space-x-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                      <Check className="h-3 w-3" />
                      <span>Actuel</span>
                    </div>
                  )}
                  {isSelected && !isCurrent && (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {levelConfig.description}
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500 dark:text-gray-500">
                    Fonctionnalités :
                  </Label>
                  <ul className="space-y-1">
                    {levelConfig.features.showAdvancedFilters && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        Filtres avancés
                      </li>
                    )}
                    {levelConfig.features.showAnalytics && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        Analyses détaillées
                      </li>
                    )}
                    {levelConfig.features.showBulkActions && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        Actions en masse
                      </li>
                    )}
                    {levelConfig.features.enableGuidedTours && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-blue-500" />
                        Visites guidées
                      </li>
                    )}
                    {levelConfig.features.showContextualHelp && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-blue-500" />
                        Aide contextuelle
                      </li>
                    )}
                    {levelConfig.features.showDataExport && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        Export de données
                      </li>
                    )}
                    {levelConfig.features.enableKeyboardShortcuts && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-purple-500" />
                        Raccourcis clavier
                      </li>
                    )}
                    {levelConfig.features.showApiAccess && (
                      <li className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                        <Check className="h-3 w-3 mr-1 text-purple-500" />
                        Accès API
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
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      )}
    </div>
  );
};
