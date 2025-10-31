/**
 * Experience Level Types
 *
 * Defines the adaptive UI system for progressive disclosure.
 * Users can switch between complexity levels as they grow comfortable.
 */

export type ExperienceLevel = 'basic' | 'medium' | 'expert';

export interface ExperienceLevelConfig {
  level: ExperienceLevel;
  label: string;
  description: string;
  features: {
    showAdvancedFilters: boolean;
    showBulkActions: boolean;
    showAnalytics: boolean;
    showContextualHelp: boolean;
    enableGuidedTours: boolean;
    showAllFormFields: boolean;
    showDataExport: boolean;
    showApiAccess: boolean;
    enableKeyboardShortcuts: boolean;
    showDeveloperTools: boolean;
  };
}

export const EXPERIENCE_LEVELS: Record<ExperienceLevel, ExperienceLevelConfig> = {
  basic: {
    level: 'basic',
    label: 'Basique',
    description: 'Interface simplifiée avec guidage et valeurs par défaut intelligentes',
    features: {
      showAdvancedFilters: false,
      showBulkActions: false,
      showAnalytics: false,
      showContextualHelp: true,
      enableGuidedTours: true,
      showAllFormFields: false,
      showDataExport: false,
      showApiAccess: false,
      enableKeyboardShortcuts: false,
      showDeveloperTools: false,
    },
  },
  medium: {
    level: 'medium',
    label: 'Intermédiaire',
    description: 'Fonctionnalités avancées avec aide contextuelle disponible',
    features: {
      showAdvancedFilters: true,
      showBulkActions: true,
      showAnalytics: true,
      showContextualHelp: true,
      enableGuidedTours: false,
      showAllFormFields: true,
      showDataExport: true,
      showApiAccess: false,
      enableKeyboardShortcuts: true,
      showDeveloperTools: false,
    },
  },
  expert: {
    level: 'expert',
    label: 'Expert',
    description: 'Accès complet avec toutes les fonctionnalités avancées',
    features: {
      showAdvancedFilters: true,
      showBulkActions: true,
      showAnalytics: true,
      showContextualHelp: false,
      enableGuidedTours: false,
      showAllFormFields: true,
      showDataExport: true,
      showApiAccess: true,
      enableKeyboardShortcuts: true,
      showDeveloperTools: true,
    },
  },
};

/**
 * Contextual hints that can be dismissed by users
 */
export interface ContextualHint {
  id: string;
  title: string;
  content: string;
  targetLevel: ExperienceLevel[];
  category: 'feature' | 'shortcut' | 'tip' | 'warning';
  priority: 'low' | 'medium' | 'high';
}

/**
 * Feature usage tracking for adaptive suggestions
 */
export interface FeatureUsage {
  [featureName: string]: {
    count: number;
    lastUsed: string;
    firstUsed: string;
  };
}

/**
 * Helper to check if a feature is available at current experience level
 */
export function hasFeature(
  level: ExperienceLevel,
  feature: keyof ExperienceLevelConfig['features']
): boolean {
  return EXPERIENCE_LEVELS[level].features[feature];
}

/**
 * Helper to suggest upgrade to higher level based on usage patterns
 */
export function suggestLevelUpgrade(
  currentLevel: ExperienceLevel,
  featureUsage: FeatureUsage
): ExperienceLevel | null {
  // Don't suggest if already expert
  if (currentLevel === 'expert') return null;

  // Calculate total actions
  const totalActions = Object.values(featureUsage).reduce(
    (sum, usage) => sum + usage.count,
    0
  );

  // Suggest medium after 50 actions at basic
  if (currentLevel === 'basic' && totalActions >= 50) {
    return 'medium';
  }

  // Suggest expert after 200 actions at medium
  if (currentLevel === 'medium' && totalActions >= 200) {
    return 'expert';
  }

  return null;
}
