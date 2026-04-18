import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users';
import { useAuth } from '@/hooks/useAuth';
import type {
  ExperienceLevel,
  ExperienceLevelConfig,
  FeatureUsage,
} from '@/types/experience-level';
import {
  EXPERIENCE_LEVELS,
  hasFeature,
  suggestLevelUpgrade,
  normalizeExperienceLevel,
} from '@/types/experience-level';

interface ExperienceLevelContextValue {
  level: ExperienceLevel;
  config: ExperienceLevelConfig;
  setLevel: (level: ExperienceLevel) => Promise<void>;
  hasFeature: (feature: keyof ExperienceLevelConfig['features']) => boolean;

  // Hints management
  dismissedHints: string[];
  dismissHint: (hintId: string) => Promise<void>;
  isHintDismissed: (hintId: string) => boolean;

  // Feature usage tracking
  trackFeatureUsage: (featureName: string) => Promise<void>;
  shouldSuggestUpgrade: () => ExperienceLevel | null;

  // Loading state
  isLoading: boolean;
}

const ExperienceLevelContext = createContext<ExperienceLevelContextValue | undefined>(undefined);

interface ExperienceLevelProviderProps {
  children: React.ReactNode;
}

export const ExperienceLevelProvider = ({ children }: ExperienceLevelProviderProps) => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const [level, setLevelState] = useState<ExperienceLevel>('basic');
  const [dismissedHints, setDismissedHints] = useState<string[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load user preferences from profile
  useEffect(() => {
    if (profile) {
      const userLevel = profile.experience_level as ExperienceLevel | undefined;
      const safeLevel = normalizeExperienceLevel(userLevel);
      const userHints = profile.dismissed_hints as string[] | undefined;
      const userUsage = profile.feature_usage as FeatureUsage | undefined;

      setLevelState(safeLevel);
      setDismissedHints(userHints || []);
      setFeatureUsage(userUsage || {});
      setIsLoading(false);
    } else if (!user) {
      // No user, use defaults
      setIsLoading(false);
    }
  }, [profile, user]);

  // Update experience level
  const updateLevelMutation = useMutation({
    mutationFn: async (newLevel: ExperienceLevel) => {
      if (!user) throw new Error('User not authenticated');
      await usersApi.updateMe({ experience_level: newLevel });
    },
    onSuccess: (_, newLevel) => {
      setLevelState(newLevel);
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
    },
  });

  const setLevel = useCallback(
    async (newLevel: ExperienceLevel) => {
      await updateLevelMutation.mutateAsync(newLevel);
    },
    [updateLevelMutation]
  );

  // Dismiss hint
  const dismissHintMutation = useMutation({
    mutationFn: async (hintId: string) => {
      if (!user) throw new Error('User not authenticated');

      const updatedHints = [...dismissedHints, hintId];
      await usersApi.updateMe({ dismissed_hints: updatedHints });
      return updatedHints;
    },
    onSuccess: (updatedHints) => {
      setDismissedHints(updatedHints);
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
    },
  });

  const dismissHint = useCallback(
    async (hintId: string) => {
      if (!dismissedHints.includes(hintId)) {
        await dismissHintMutation.mutateAsync(hintId);
      }
    },
    [dismissedHints, dismissHintMutation]
  );

  const isHintDismissed = useCallback(
    (hintId: string) => dismissedHints.includes(hintId),
    [dismissedHints]
  );

  // Track feature usage
  const trackUsageMutation = useMutation({
    mutationFn: async (featureName: string) => {
      if (!user) throw new Error('User not authenticated');

      const now = new Date().toISOString();
      const currentUsage = featureUsage[featureName];

      const updatedUsage: FeatureUsage = {
        ...featureUsage,
        [featureName]: {
          count: (currentUsage?.count || 0) + 1,
          lastUsed: now,
          firstUsed: currentUsage?.firstUsed || now,
        },
      };

      await usersApi.updateMe({ feature_usage: updatedUsage });
      return updatedUsage;
    },
    onSuccess: (updatedUsage) => {
      setFeatureUsage(updatedUsage);
    },
  });

  const trackFeatureUsage = useCallback(
    async (featureName: string) => {
      await trackUsageMutation.mutateAsync(featureName);
    },
    [trackUsageMutation]
  );

  // Check if upgrade should be suggested
  const shouldSuggestUpgrade = useCallback(() => {
    return suggestLevelUpgrade(level, featureUsage);
  }, [level, featureUsage]);

  // Helper to check feature availability
  const checkFeature = useCallback(
    (feature: keyof ExperienceLevelConfig['features']) => {
      return hasFeature(level, feature);
    },
    [level]
  );

  const value: ExperienceLevelContextValue = {
    level,
    config: EXPERIENCE_LEVELS[normalizeExperienceLevel(level)],
    setLevel,
    hasFeature: checkFeature,
    dismissedHints,
    dismissHint,
    isHintDismissed,
    trackFeatureUsage,
    shouldSuggestUpgrade,
    isLoading,
  };

  return (
    <ExperienceLevelContext.Provider value={value}>
      {children}
    </ExperienceLevelContext.Provider>
  );
};

/**
 * Hook to access experience level context
 */
export const useExperienceLevel = (): ExperienceLevelContextValue => {
  const context = useContext(ExperienceLevelContext);
  if (!context) {
    throw new Error('useExperienceLevel must be used within ExperienceLevelProvider');
  }
  return context;
};

/**
 * Hook to check if a specific feature is available
 */
export const useFeatureFlag = (feature: keyof ExperienceLevelConfig['features']): boolean => {
  const { hasFeature } = useExperienceLevel();
  return hasFeature(feature);
};
