import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS, ACTIONS, TooltipRenderProps } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { useExperienceLevel } from '@/contexts/ExperienceLevelContext';
import {
  tourPreferencesApi,
  retryTourApiCall,
  TOUR_API_CONFIG,
  type TourId as ApiTourId
} from '@/lib/api/tour-preferences';

export type TourId = ApiTourId;

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface TourState {
  completedTours: TourId[];
  dismissedTours: TourId[];
  currentTour: TourId | null;
  isRunning: boolean;
  stepIndex: number;
  isLoading: boolean;
  syncStatus: SyncStatus;
  lastSyncError: string | null;
}

interface TourContextValue {
  startTour: (tourId: TourId) => void;
  endTour: () => void;
  completedTours: TourId[];
  dismissedTours: TourId[];
  isRunning: boolean;
  currentTour: TourId | null;
  isTourCompleted: (tourId: TourId) => boolean;
  isTourDismissed: (tourId: TourId) => boolean;
  dismissTour: (tourId: TourId) => Promise<void>;
  resetTour: (tourId: TourId) => Promise<void>;
  resetAllTours: () => Promise<void>;
  // New properties for sync status
  isLoading: boolean;
  syncStatus: SyncStatus;
  lastSyncError: string | null;
  refetchPreferences: () => Promise<void>;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

// LocalStorage keys for fallback/offline support
const TOUR_STORAGE_KEY = 'agritech_completed_tours';
const DISMISSED_TOURS_KEY = 'agritech_dismissed_tours';
const LAST_SYNC_KEY = 'agritech_tours_last_sync';

const TOUR_ROUTES: Record<TourId, string> = {
  'welcome': '/dashboard',
  'full-app': '/dashboard',
  'dashboard': '/dashboard',
  'farm-management': '/farm-hierarchy',
  'parcels': '/parcels',
  'tasks': '/tasks',
  'workers': '/workers',
  'inventory': '/stock',
  'harvests': '/harvests',
  'infrastructure': '/infrastructure',
  'billing': '/billing',
  'accounting': '/accounting',
  'satellite': '/satellite-analysis',
  'reports': '/reports',
  'settings': '/settings',
};

const tourStyles = {
  options: {
    primaryColor: '#059669',
    zIndex: 9999,
    arrowColor: '#fff',
    backgroundColor: '#fff',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    textColor: '#374151',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  buttonNext: {
    backgroundColor: '#059669',
    borderRadius: '0.5rem',
    padding: '0.5rem 1rem',
  },
  buttonBack: {
    color: '#6b7280',
    marginRight: '0.5rem',
  },
  buttonSkip: {
    color: '#9ca3af',
  },
};

// Custom Tooltip component for translated step counter
interface CustomTooltipProps extends TooltipRenderProps {
  t: TFunction;
  onDismiss?: (tourId: TourId) => void;
  currentTourId?: TourId | null;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  continuous,
  index,
  step,
  size,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  t,
  onDismiss,
  currentTourId,
}) => {
  // Detect mobile for responsive styling
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div
      {...tooltipProps}
      style={{
        backgroundColor: '#fff',
        borderRadius: isMobile ? '0.5rem' : '0.75rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        maxWidth: isMobile ? 'calc(100vw - 2rem)' : 'min(420px, calc(100vw - 2rem))',
        width: '100%',
        padding: isMobile ? '0.75rem' : '0.875rem',
        margin: '0 auto',
        ...(isMobile && {
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          right: '1rem',
          maxWidth: 'none',
        }),
      }}
    >
      {step.title && (
        <h4 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#059669',
          marginBottom: '0.5rem'
        }}>
          {step.title}
        </h4>
      )}
      <div style={{ color: '#374151', marginBottom: '1rem' }}>
        {step.content}
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            {t('tour.buttons.stepCounter', { current: index + 1, total: size })}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {index > 0 && (
              <button
                {...backProps}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {t('tour.buttons.back')}
              </button>
            )}
            <button
              {...skipProps}
              onClick={(e) => {
                if (onDismiss && currentTourId) {
                  onDismiss(currentTourId);
                }
                skipProps.onClick(e);
              }}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {t('tour.buttons.skip')}
            </button>
            {continuous && (
              <button
                {...primaryProps}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#059669',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {isLastStep ? t('tour.buttons.last') : t('tour.buttons.next')}
              </button>
            )}
            {!continuous && (
              <button
                {...closeProps}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#059669',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {t('tour.buttons.close')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const getTourDefinitions = (t: TFunction): Record<TourId, Step[]> => ({
  welcome: [
    {
      target: 'body',
      placement: 'center',
      title: t('tour.welcome.step1.title'),
      content: t('tour.welcome.step1.content'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="sidebar"]',
      title: t('tour.welcome.step2.title'),
      content: t('tour.welcome.step2.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="org-switcher"]',
      title: t('tour.welcome.step3.title'),
      content: t('tour.welcome.step3.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="user-menu"]',
      title: t('tour.welcome.step4.title'),
      content: t('tour.welcome.step4.content'),
      placement: 'bottom-end',
    },
  ],
  'full-app': [
    {
      target: 'body',
      placement: 'center',
      title: t('tour.fullApp.step1.title'),
      content: t('tour.fullApp.step1.content'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="sidebar"]',
      title: t('tour.fullApp.step2.title'),
      content: t('tour.fullApp.step2.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="org-switcher"]',
      title: t('tour.fullApp.step3.title'),
      content: t('tour.fullApp.step3.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="nav-dashboard"]',
      title: t('tour.fullApp.step4.title'),
      content: t('tour.fullApp.step4.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-farms"]',
      title: t('tour.fullApp.step5.title'),
      content: t('tour.fullApp.step5.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-parcels"]',
      title: t('tour.fullApp.step6.title'),
      content: t('tour.fullApp.step6.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-stock"]',
      title: t('tour.fullApp.step7.title'),
      content: t('tour.fullApp.step7.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-infrastructure"]',
      title: t('tour.fullApp.step8.title'),
      content: t('tour.fullApp.step8.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-personnel"]',
      title: t('tour.fullApp.step9.title'),
      content: t('tour.fullApp.step9.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-production"]',
      title: t('tour.fullApp.step10.title'),
      content: t('tour.fullApp.step10.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-billing"]',
      title: t('tour.fullApp.step11.title'),
      content: t('tour.fullApp.step11.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-accounting"]',
      title: t('tour.fullApp.step12.title'),
      content: t('tour.fullApp.step12.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-reports"]',
      title: t('tour.fullApp.step13.title'),
      content: t('tour.fullApp.step13.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-settings"]',
      title: t('tour.fullApp.step14.title'),
      content: t('tour.fullApp.step14.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="user-menu"]',
      title: t('tour.fullApp.step15.title'),
      content: t('tour.fullApp.step15.content'),
      placement: 'bottom',
    },
    {
      target: 'body',
      placement: 'center',
      title: t('tour.fullApp.step16.title'),
      content: t('tour.fullApp.step16.content'),
      disableBeacon: true,
    },
  ],
  dashboard: [
    {
      target: '[data-tour="dashboard-stats"]',
      title: t('tour.dashboard.step1.title'),
      content: t('tour.dashboard.step1.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="dashboard-tasks"]',
      title: t('tour.dashboard.step2.title'),
      content: t('tour.dashboard.step2.content'),
      placement: 'left',
    },
    {
      target: '[data-tour="dashboard-parcels"]',
      title: t('tour.dashboard.step4.title'),
      content: t('tour.dashboard.step4.content'),
      placement: 'top',
    },
  ],
  'farm-management': [
    {
      target: '[data-tour="farm-list"]',
      title: t('tour.farmManagement.step1.title'),
      content: t('tour.farmManagement.step1.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="add-farm"]',
      title: t('tour.farmManagement.step2.title'),
      content: t('tour.farmManagement.step2.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="farm-map"]',
      title: t('tour.farmManagement.step3.title'),
      content: t('tour.farmManagement.step3.content'),
      placement: 'left',
    },
  ],
  parcels: [
    {
      target: '[data-tour="parcel-list"]',
      title: t('tour.parcels.step1.title'),
      content: t('tour.parcels.step1.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="parcel-filters"]',
      title: t('tour.parcels.step2.title'),
      content: t('tour.parcels.step2.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="parcel-actions"]',
      title: t('tour.parcels.step3.title'),
      content: t('tour.parcels.step3.content'),
      placement: 'left',
    },
  ],
  tasks: [
    {
      target: '[data-tour="task-list"]',
      title: t('tour.tasks.step1.title'),
      content: t('tour.tasks.step1.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="task-calendar"]',
      title: t('tour.tasks.step2.title'),
      content: t('tour.tasks.step2.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="task-create"]',
      title: t('tour.tasks.step3.title'),
      content: t('tour.tasks.step3.content'),
      placement: 'bottom',
    },
  ],
  workers: [
    {
      target: '[data-tour="worker-list"]',
      title: t('tour.workers.step1.title'),
      content: t('tour.workers.step1.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="worker-payments"]',
      title: t('tour.workers.step2.title'),
      content: t('tour.workers.step2.content'),
      placement: 'left',
    },
    {
      target: '[data-tour="worker-add"]',
      title: t('tour.workers.step3.title'),
      content: t('tour.workers.step3.content'),
      placement: 'bottom',
    },
  ],
  inventory: [
    {
      target: '[data-tour="stock-overview"]',
      title: t('tour.inventory.step1.title'),
      content: t('tour.inventory.step1.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="stock-items"]',
      title: t('tour.inventory.step2.title'),
      content: t('tour.inventory.step2.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="stock-warehouses"]',
      title: t('tour.inventory.step3.title'),
      content: t('tour.inventory.step3.content'),
      placement: 'left',
    },
    {
      target: '[data-tour="stock-movements"]',
      title: t('tour.inventory.step4.title'),
      content: t('tour.inventory.step4.content'),
      placement: 'top',
    },
  ],
  accounting: [
    {
      target: '[data-tour="accounting-overview"]',
      title: t('tour.accounting.step1.title'),
      content: t('tour.accounting.step1.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="accounting-invoices"]',
      title: t('tour.accounting.step2.title'),
      content: t('tour.accounting.step2.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="accounting-journal"]',
      title: t('tour.accounting.step3.title'),
      content: t('tour.accounting.step3.content'),
      placement: 'left',
    },
    {
      target: '[data-tour="accounting-reports"]',
      title: t('tour.accounting.step4.title'),
      content: t('tour.accounting.step4.content'),
      placement: 'top',
    },
  ],
  satellite: [
    {
      target: '[data-tour="satellite-map"]',
      title: t('tour.satellite.step1.title'),
      content: t('tour.satellite.step1.content'),
      placement: 'left',
    },
    {
      target: '[data-tour="satellite-indices"]',
      title: t('tour.satellite.step2.title'),
      content: t('tour.satellite.step2.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="satellite-timeline"]',
      title: t('tour.satellite.step3.title'),
      content: t('tour.satellite.step3.content'),
      placement: 'top',
    },
  ],
  reports: [
    {
      target: '[data-tour="reports-list"]',
      title: t('tour.reports.step1.title'),
      content: t('tour.reports.step1.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="reports-export"]',
      title: t('tour.reports.step2.title'),
      content: t('tour.reports.step2.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="reports-filters"]',
      title: t('tour.reports.step3.title'),
      content: t('tour.reports.step3.content'),
      placement: 'left',
    },
  ],
  harvests: [
    {
      target: '[data-tour="harvest-stats"]',
      title: t('tour.harvests.step1.title'),
      content: t('tour.harvests.step1.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="harvest-list"]',
      title: t('tour.harvests.step2.title'),
      content: t('tour.harvests.step2.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="harvest-add"]',
      title: t('tour.harvests.step3.title'),
      content: t('tour.harvests.step3.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="harvest-filters"]',
      title: t('tour.harvests.step4.title'),
      content: t('tour.harvests.step4.content'),
      placement: 'left',
    },
  ],
  infrastructure: [
    {
      target: '[data-tour="infrastructure-list"]',
      title: t('tour.infrastructure.step1.title'),
      content: t('tour.infrastructure.step1.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="infrastructure-add"]',
      title: t('tour.infrastructure.step2.title'),
      content: t('tour.infrastructure.step2.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="infrastructure-maintenance"]',
      title: t('tour.infrastructure.step3.title'),
      content: t('tour.infrastructure.step3.content'),
      placement: 'left',
    },
  ],
  billing: [
    {
      target: '[data-tour="billing-stats"]',
      title: t('tour.billing.step1.title'),
      content: t('tour.billing.step1.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="billing-quotes"]',
      title: t('tour.billing.step2.title'),
      content: t('tour.billing.step2.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="billing-orders"]',
      title: t('tour.billing.step3.title'),
      content: t('tour.billing.step3.content'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="billing-invoices"]',
      title: t('tour.billing.step4.title'),
      content: t('tour.billing.step4.content'),
      placement: 'left',
    },
    {
      target: '[data-tour="billing-customers"]',
      title: t('tour.billing.step5.title'),
      content: t('tour.billing.step5.content'),
      placement: 'top',
    },
  ],
  settings: [
    {
      target: '[data-tour="settings-menu"]',
      title: t('tour.settings.step1.title'),
      content: t('tour.settings.step1.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="settings-organization"]',
      title: t('tour.settings.step2.title'),
      content: t('tour.settings.step2.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="settings-users"]',
      title: t('tour.settings.step3.title'),
      content: t('tour.settings.step3.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="settings-subscription"]',
      title: t('tour.settings.step4.title'),
      content: t('tour.settings.step4.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="settings-modules"]',
      title: t('tour.settings.step5.title'),
      content: t('tour.settings.step5.content'),
      placement: 'right',
    },
    {
      target: '[data-tour="settings-preferences"]',
      title: t('tour.settings.step6.title'),
      content: t('tour.settings.step6.content'),
      placement: 'left',
    },
  ],
});

interface TourProviderProps {
  children: React.ReactNode;
}

// Helper functions for localStorage fallback
const getLocalStorageTours = (): { completed: TourId[]; dismissed: TourId[] } => {
  try {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    const dismissed = localStorage.getItem(DISMISSED_TOURS_KEY);
    return {
      completed: completed ? JSON.parse(completed) : [],
      dismissed: dismissed ? JSON.parse(dismissed) : [],
    };
  } catch {
    console.error('[TourContext] Failed to read from localStorage');
    return { completed: [], dismissed: [] };
  }
};

const setLocalStorageTours = (completed: TourId[], dismissed: TourId[]) => {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
    localStorage.setItem(DISMISSED_TOURS_KEY, JSON.stringify(dismissed));
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch {
    console.error('[TourContext] Failed to write to localStorage');
  }
};

const isStale = (): boolean => {
  try {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (!lastSync) return true;
    return Date.now() - parseInt(lastSync, 10) > TOUR_API_CONFIG.staleTimeMs;
  } catch {
    return true;
  }
};

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasFeature } = useExperienceLevel();
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [tourState, setTourState] = useState<TourState>({
    completedTours: [],
    dismissedTours: [],
    currentTour: null,
    isRunning: false,
    stepIndex: 0,
    isLoading: true,
    syncStatus: 'idle',
    lastSyncError: null,
  });

  const tourDefinitions = useMemo(() => getTourDefinitions(t), [t]);

  // Load tour preferences on mount and when user changes
  useEffect(() => {
    loadTourPreferences();

    return () => {
      // Cleanup: abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.id]);

  /**
   * Load tour preferences from backend API with localStorage fallback
   */
  const loadTourPreferences = async () => {
    // If no user, use localStorage only
    if (!user) {
      const local = getLocalStorageTours();
      setTourState(prev => ({
        ...prev,
        completedTours: local.completed,
        dismissedTours: local.dismissed,
        isLoading: false,
        syncStatus: 'idle',
      }));
      return;
    }

    // Start loading
    setTourState(prev => ({
      ...prev,
      isLoading: true,
      syncStatus: 'syncing',
      lastSyncError: null,
    }));

    try {
      // Try to fetch from backend API with retry logic
      const preferences = await retryTourApiCall(
        () => tourPreferencesApi.getTourPreferences()
      );

      // Update state and localStorage with backend data
      setTourState(prev => ({
        ...prev,
        completedTours: preferences.completed_tours as TourId[],
        dismissedTours: preferences.dismissed_tours as TourId[],
        isLoading: false,
        syncStatus: 'synced',
        lastSyncError: null,
      }));

      // Update localStorage for offline fallback
      setLocalStorageTours(
        preferences.completed_tours as TourId[],
        preferences.dismissed_tours as TourId[]
      );

      console.log('[TourContext] Loaded preferences from backend:', preferences);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tour preferences';
      console.error('[TourContext] Failed to load from backend, using localStorage fallback:', errorMessage);

      // Fall back to localStorage
      const local = getLocalStorageTours();
      setTourState(prev => ({
        ...prev,
        completedTours: local.completed,
        dismissedTours: local.dismissed,
        isLoading: false,
        syncStatus: 'error',
        lastSyncError: errorMessage,
      }));
    }
  };

  /**
   * Save completed tours to backend with localStorage fallback
   */
  const saveCompletedTours = async (tours: TourId[]): Promise<boolean> => {
    // Always update localStorage immediately for responsiveness
    setLocalStorageTours(tours, tourState.dismissedTours);

    if (!user) {
      return true; // No user, localStorage-only mode
    }

    setTourState(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      await retryTourApiCall(
        () => tourPreferencesApi.updateTourPreferences({ completed_tours: tours })
      );

      setTourState(prev => ({
        ...prev,
        syncStatus: 'synced',
        lastSyncError: null,
      }));

      console.log('[TourContext] Saved completed tours to backend');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save completed tours';
      console.error('[TourContext] Failed to save completed tours:', errorMessage);

      setTourState(prev => ({
        ...prev,
        syncStatus: 'error',
        lastSyncError: errorMessage,
      }));

      // Return false to indicate save failed, but state is already updated locally
      return false;
    }
  };

  /**
   * Save dismissed tours to backend with localStorage fallback
   */
  const saveDismissedTours = async (tours: TourId[]): Promise<boolean> => {
    // Always update localStorage immediately for responsiveness
    setLocalStorageTours(tourState.completedTours, tours);

    if (!user) {
      return true; // No user, localStorage-only mode
    }

    setTourState(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      await retryTourApiCall(
        () => tourPreferencesApi.updateTourPreferences({ dismissed_tours: tours })
      );

      setTourState(prev => ({
        ...prev,
        syncStatus: 'synced',
        lastSyncError: null,
      }));

      console.log('[TourContext] Saved dismissed tours to backend');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save dismissed tours';
      console.error('[TourContext] Failed to save dismissed tours:', errorMessage);

      setTourState(prev => ({
        ...prev,
        syncStatus: 'error',
        lastSyncError: errorMessage,
      }));

      return false;
    }
  };

  const startTour = useCallback((tourId: TourId) => {
    if (isOnboardingRoute) {
      return;
    }

    const targetRoute = TOUR_ROUTES[tourId];

    // Tours that target sidebar nav items - expand sidebar if collapsed
    const sidebarTours: TourId[] = ['welcome', 'full-app'];
    if (sidebarTours.includes(tourId)) {
      // Expand sidebar by setting localStorage and dispatching event
      const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      if (isCollapsed) {
        localStorage.setItem('sidebarCollapsed', 'false');
        window.dispatchEvent(new CustomEvent('sidebarCollapse', { detail: { collapsed: false } }));
      }
    }

    if (targetRoute) {
      navigate({ to: targetRoute });
      setTimeout(() => {
        setTourState(prev => ({
          ...prev,
          currentTour: tourId,
          isRunning: true,
          stepIndex: 0,
        }));
      }, 500);
    } else {
      setTourState(prev => ({
        ...prev,
        currentTour: tourId,
        isRunning: true,
        stepIndex: 0,
      }));
    }
  }, [isOnboardingRoute, navigate]);

  const endTour = useCallback(() => {
    setTourState(prev => ({
      ...prev,
      currentTour: null,
      isRunning: false,
      stepIndex: 0,
    }));
  }, []);

  const isTourCompleted = useCallback((tourId: TourId) => {
    return tourState.completedTours.includes(tourId);
  }, [tourState.completedTours]);

  const isTourDismissed = useCallback((tourId: TourId) => {
    return tourState.dismissedTours.includes(tourId);
  }, [tourState.dismissedTours]);

  /**
   * Dismiss a tour - uses dedicated backend endpoint for atomic operation
   */
  const dismissTour = useCallback(async (tourId: TourId) => {
    if (tourState.dismissedTours.includes(tourId)) return;

    const newDismissed = [...tourState.dismissedTours, tourId];

    // Optimistically update state
    setTourState(prev => ({
      ...prev,
      dismissedTours: newDismissed,
      syncStatus: 'syncing',
    }));

    // End the tour immediately
    endTour();

    // Update localStorage for immediate fallback
    setLocalStorageTours(tourState.completedTours, newDismissed);

    if (user) {
      try {
        // Use dedicated dismiss endpoint for atomic backend operation
        const result = await retryTourApiCall(
          () => tourPreferencesApi.dismissTour(tourId)
        );

        // Update state with backend response to ensure consistency
        setTourState(prev => ({
          ...prev,
          completedTours: result.completed_tours as TourId[],
          dismissedTours: result.dismissed_tours as TourId[],
          syncStatus: 'synced',
          lastSyncError: null,
        }));

        // Update localStorage with backend data
        setLocalStorageTours(
          result.completed_tours as TourId[],
          result.dismissed_tours as TourId[]
        );

        console.log(`[TourContext] Tour '${tourId}' dismissed and synced to backend`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to dismiss tour';
        console.error('[TourContext] Failed to sync dismiss to backend:', errorMessage);

        setTourState(prev => ({
          ...prev,
          syncStatus: 'error',
          lastSyncError: errorMessage,
        }));

        // State is already updated locally, so user experience is preserved
      }
    }
  }, [tourState.dismissedTours, tourState.completedTours, endTour, user]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index } = data;

    if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
      setTourState(prev => ({ ...prev, stepIndex: index + 1 }));
    }

    if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
      setTourState(prev => ({ ...prev, stepIndex: index - 1 }));
    }

    if (status === STATUS.SKIPPED) {
      const currentTour = tourState.currentTour;

      if (!currentTour) {
        endTour();
        return;
      }

      if (!tourState.dismissedTours.includes(currentTour)) {
        dismissTour(currentTour);
        return;
      }

      endTour();
      return;
    }

    if (status === STATUS.FINISHED) {
      setTourState(prev => {
        const { currentTour, completedTours } = prev;

        if (!currentTour) {
          endTour();
          return prev;
        }

        if (!completedTours.includes(currentTour)) {
          const newCompletedTours = [...completedTours, currentTour];
          saveCompletedTours(newCompletedTours);
          return {
            ...prev,
            completedTours: newCompletedTours,
            currentTour: null,
            isRunning: false,
            stepIndex: 0,
          };
        }

        endTour();
        return {
          ...prev,
          currentTour: null,
          isRunning: false,
          stepIndex: 0,
        };
      });
    }
  }, [dismissTour, endTour, saveCompletedTours, tourState.currentTour, tourState.dismissedTours]);

  /**
   * Reset a specific tour - allows tour to show again
   */
  const resetTour = useCallback(async (tourId: TourId) => {
    const newCompletedTours = tourState.completedTours.filter(t => t !== tourId);
    const newDismissedTours = tourState.dismissedTours.filter(t => t !== tourId);

    // Optimistically update state
    setTourState(prev => ({
      ...prev,
      completedTours: newCompletedTours,
      dismissedTours: newDismissedTours,
      syncStatus: 'syncing',
    }));

    // Update localStorage immediately
    setLocalStorageTours(newCompletedTours, newDismissedTours);

    if (user) {
      try {
        // Use dedicated reset endpoint
        const result = await retryTourApiCall(
          () => tourPreferencesApi.resetTour(tourId)
        );

        setTourState(prev => ({
          ...prev,
          completedTours: result.completed_tours as TourId[],
          dismissedTours: result.dismissed_tours as TourId[],
          syncStatus: 'synced',
          lastSyncError: null,
        }));

        setLocalStorageTours(
          result.completed_tours as TourId[],
          result.dismissed_tours as TourId[]
        );

        console.log(`[TourContext] Tour '${tourId}' reset and synced to backend`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to reset tour';
        console.error('[TourContext] Failed to sync reset to backend:', errorMessage);

        setTourState(prev => ({
          ...prev,
          syncStatus: 'error',
          lastSyncError: errorMessage,
        }));
      }
    }
  }, [tourState.completedTours, tourState.dismissedTours, user]);

  /**
   * Reset all tours - clear all completed and dismissed
   */
  const resetAllTours = useCallback(async () => {
    // Optimistically update state
    setTourState(prev => ({
      ...prev,
      completedTours: [],
      dismissedTours: [],
      syncStatus: 'syncing',
    }));

    // Clear localStorage immediately
    setLocalStorageTours([], []);

    if (user) {
      try {
        // Use dedicated reset-all endpoint
        const result = await retryTourApiCall(
          () => tourPreferencesApi.resetAllTours()
        );

        setTourState(prev => ({
          ...prev,
          completedTours: result.completed_tours as TourId[],
          dismissedTours: result.dismissed_tours as TourId[],
          syncStatus: 'synced',
          lastSyncError: null,
        }));

        setLocalStorageTours(
          result.completed_tours as TourId[],
          result.dismissed_tours as TourId[]
        );

        console.log('[TourContext] All tours reset and synced to backend');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to reset all tours';
        console.error('[TourContext] Failed to sync reset-all to backend:', errorMessage);

        setTourState(prev => ({
          ...prev,
          syncStatus: 'error',
          lastSyncError: errorMessage,
        }));
      }
    }
  }, [user]);

  /**
   * Manually refetch preferences from backend
   */
  const refetchPreferences = useCallback(async () => {
    await loadTourPreferences();
  }, [user?.id]);

  const currentSteps = tourState.currentTour ? tourDefinitions[tourState.currentTour] : [];

  useEffect(() => {
    if (isOnboardingRoute && tourState.isRunning) {
      endTour();
    }
  }, [endTour, isOnboardingRoute, tourState.isRunning]);

  return (
    <TourContext.Provider
      value={{
        startTour,
        endTour,
        completedTours: tourState.completedTours,
        dismissedTours: tourState.dismissedTours,
        isRunning: tourState.isRunning,
        currentTour: tourState.currentTour,
        isTourCompleted,
        isTourDismissed,
        dismissTour,
        resetTour,
        resetAllTours,
        // New sync status properties
        isLoading: tourState.isLoading,
        syncStatus: tourState.syncStatus,
        lastSyncError: tourState.lastSyncError,
        refetchPreferences,
      }}
    >
      {children}
      {!isOnboardingRoute && (
        <Joyride
          steps={currentSteps}
          run={tourState.isRunning}
          stepIndex={tourState.stepIndex}
          continuous
          showSkipButton
          scrollToFirstStep={false}
          disableScrolling={true}
          spotlightClicks
          disableOverlayClose
          callback={handleJoyrideCallback}
          styles={tourStyles}
          tooltipComponent={(props) => (
            <CustomTooltip
              {...props}
              t={t}
              onDismiss={dismissTour}
              currentTourId={tourState.currentTour}
            />
          )}
          floaterProps={{
            hideArrow: false,
          }}
        />
      )}
    </TourContext.Provider>
  );
};

export const useTour = (): TourContextValue => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
};

export const useAutoStartTour = (tourId: TourId, delay: number = 1000) => {
  const { startTour, isTourCompleted, isRunning, dismissedTours, isLoading } = useTour();
  const { hasFeature } = useExperienceLevel();
  const location = useLocation();
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');

  useEffect(() => {
    // Don't auto-start while still loading preferences from backend
    if (isLoading) return;

    // Only auto-start if:
    // 1. Tour not completed
    // 2. Tour not dismissed
    // 3. Not already running
    // 4. User has enabledGuidedTours feature (basic level only)
    if (
      !isOnboardingRoute
      && !isTourCompleted(tourId)
      && !dismissedTours.includes(tourId)
      && !isRunning
      && hasFeature('enableGuidedTours')
    ) {
      const timer = setTimeout(() => {
        startTour(tourId);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [tourId, startTour, isTourCompleted, dismissedTours, isRunning, delay, hasFeature, isLoading, isOnboardingRoute]);
};
