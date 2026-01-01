import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS, ACTIONS, TooltipRenderProps } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { supabase } from '@/lib/supabase';

export type TourId = 
  | 'welcome'
  | 'full-app'
  | 'dashboard'
  | 'farm-management'
  | 'parcels'
  | 'tasks'
  | 'workers'
  | 'inventory'
  | 'harvests'
  | 'infrastructure'
  | 'billing'
  | 'accounting'
  | 'satellite'
  | 'reports'
  | 'settings';

interface TourState {
  completedTours: TourId[];
  currentTour: TourId | null;
  isRunning: boolean;
  stepIndex: number;
}

interface TourContextValue {
  startTour: (tourId: TourId) => void;
  endTour: () => void;
  completedTours: TourId[];
  isRunning: boolean;
  currentTour: TourId | null;
  isTourCompleted: (tourId: TourId) => boolean;
  resetTour: (tourId: TourId) => Promise<void>;
  resetAllTours: () => Promise<void>;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

const TOUR_STORAGE_KEY = 'agritech_completed_tours';

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
    zIndex: 10000,
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
}) => {
  return (
    <div
      {...tooltipProps}
      style={{
        backgroundColor: '#fff',
        borderRadius: '0.75rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        maxWidth: 'min(420px, calc(100vw - 2rem))',
        width: '100%',
        padding: '0.875rem',
        margin: '0 auto',
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
      target: '[data-tour="dashboard-weather"]',
      title: t('tour.dashboard.step3.title'),
      content: t('tour.dashboard.step3.content'),
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

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tourState, setTourState] = useState<TourState>({
    completedTours: [],
    currentTour: null,
    isRunning: false,
    stepIndex: 0,
  });

  const tourDefinitions = useMemo(() => getTourDefinitions(t), [t]);

  useEffect(() => {
    loadCompletedTours();
  }, [user?.id]);

  const loadCompletedTours = async () => {
    if (!user) {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      if (stored) {
        try {
          setTourState(prev => ({ ...prev, completedTours: JSON.parse(stored) }));
        } catch {
          console.error('Failed to parse stored tours');
        }
      }
      return;
    }

    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('completed_tours')
        .eq('id', user.id)
        .single();

      if (data?.completed_tours) {
        setTourState(prev => ({ ...prev, completedTours: data.completed_tours as TourId[] }));
      }
    } catch (error) {
      console.error('Failed to load completed tours:', error);
    }
  };

  const saveCompletedTours = async (tours: TourId[]) => {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(tours));

    if (user) {
      try {
        await supabase
          .from('user_profiles')
          .update({ completed_tours: tours })
          .eq('id', user.id);
      } catch (error) {
        console.error('Failed to save completed tours:', error);
      }
    }
  };

  const startTour = useCallback((tourId: TourId) => {
    const targetRoute = TOUR_ROUTES[tourId];
    
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
  }, [navigate]);

  const endTour = useCallback(() => {
    setTourState(prev => ({
      ...prev,
      currentTour: null,
      isRunning: false,
      stepIndex: 0,
    }));
  }, []);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index } = data;

    if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
      setTourState(prev => ({ ...prev, stepIndex: index + 1 }));
    }

    if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
      setTourState(prev => ({ ...prev, stepIndex: index - 1 }));
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      const { currentTour, completedTours } = tourState;
      
      if (currentTour && status === STATUS.FINISHED && !completedTours.includes(currentTour)) {
        const newCompletedTours = [...completedTours, currentTour];
        setTourState(prev => ({
          ...prev,
          completedTours: newCompletedTours,
          currentTour: null,
          isRunning: false,
          stepIndex: 0,
        }));
        saveCompletedTours(newCompletedTours);
      } else {
        endTour();
      }
    }
  }, [tourState, endTour]);

  const isTourCompleted = useCallback((tourId: TourId) => {
    return tourState.completedTours.includes(tourId);
  }, [tourState.completedTours]);

  const resetTour = useCallback(async (tourId: TourId) => {
    const newCompletedTours = tourState.completedTours.filter(t => t !== tourId);
    setTourState(prev => ({ ...prev, completedTours: newCompletedTours }));
    await saveCompletedTours(newCompletedTours);
  }, [tourState.completedTours]);

  const resetAllTours = useCallback(async () => {
    setTourState(prev => ({ ...prev, completedTours: [] }));
    await saveCompletedTours([]);
  }, []);

  const currentSteps = tourState.currentTour ? tourDefinitions[tourState.currentTour] : [];

  return (
    <TourContext.Provider
      value={{
        startTour,
        endTour,
        completedTours: tourState.completedTours,
        isRunning: tourState.isRunning,
        currentTour: tourState.currentTour,
        isTourCompleted,
        resetTour,
        resetAllTours,
      }}
    >
      {children}
      <Joyride
        steps={currentSteps}
        run={tourState.isRunning}
        stepIndex={tourState.stepIndex}
        continuous
        showSkipButton
        scrollToFirstStep
        spotlightClicks
        disableOverlayClose
        callback={handleJoyrideCallback}
        styles={tourStyles}
        tooltipComponent={(props) => <CustomTooltip {...props} t={t} />}
        floaterProps={{
          hideArrow: false,
        }}
      />
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
  const { startTour, isTourCompleted, isRunning } = useTour();

  useEffect(() => {
    if (!isTourCompleted(tourId) && !isRunning) {
      const timer = setTimeout(() => {
        startTour(tourId);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [tourId, startTour, isTourCompleted, isRunning, delay]);
};
