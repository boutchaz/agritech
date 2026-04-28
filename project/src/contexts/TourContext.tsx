import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Joyride, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import type { Step, EventData, TooltipRenderProps } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useHotkey } from '@tanstack/react-hotkeys';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { useExperienceLevel } from '@/contexts/ExperienceLevelContext';
import {
  tourPreferencesApi,
  retryTourApiCall,
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

// LocalStorage keys for fallback/offline support — scoped per user to prevent
// cross-user contamination when logging out/in on the same browser.
const tourStorageKey = (userId: string) => `agritech_${userId}_completed_tours`;
const dismissedStorageKey = (userId: string) => `agritech_${userId}_dismissed_tours`;
const lastSyncStorageKey = (userId: string) => `agritech_${userId}_tours_last_sync`;

// Keep legacy keys for cleanup on first load
const LEGACY_TOUR_STORAGE_KEY = 'agritech_completed_tours';
const LEGACY_DISMISSED_TOURS_KEY = 'agritech_dismissed_tours';
const LEGACY_LAST_SYNC_KEY = 'agritech_tours_last_sync';

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
  'billing': '/accounting/quotes',
  'accounting': '/accounting',
  'satellite': '/production/satellite-analysis',
  'reports': '/reports',
  'settings': '/settings/account',
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
}

const CustomTooltip = ({
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
}: CustomTooltipProps) => {
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
              onClick={skipProps.onClick}
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

/**
 * Creates a keydown handler that calls endTour on Escape.
 * Exported for testing.
 */
export const handleEscKey = (endTour: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    endTour();
  }
};

/** Joyride behavioral props — exported for testing */
export const JOYRIDE_PROPS = {
  disableOverlayClose: false,
} as const;

/**
 * Filter tour steps to only include those whose target element exists in the DOM.
 * Steps targeting 'body' are always included.
 */
export const filterStepsByDomPresence = (steps: Step[]): Step[] => {
  return steps.filter((step) => {
    if (step.target === 'body') return true;
    if (typeof step.target === 'string') {
      return document.querySelector(step.target) !== null;
    }
    // HTMLElement target — check if it's in the document
    return step.target instanceof HTMLElement && document.contains(step.target);
  });
};

export const getTourDefinitions = (t: TFunction): Record<TourId, Step[]> => ({
  welcome: [
    {
      target: 'body',
      placement: 'center',
      title: t('tour.welcome.step1.title'),
      content: t('tour.welcome.step1.content'),
      skipBeacon: true,
    },
    {
      target: '[data-tour="sidebar"]',
      title: t('tour.welcome.step2.title'),
      content: t('tour.welcome.step2.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="org-switcher"]',
      title: t('tour.welcome.step3.title'),
      content: t('tour.welcome.step3.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="user-menu"]',
      title: t('tour.welcome.step4.title'),
      content: t('tour.welcome.step4.content'),
      placement: 'bottom-end',
      skipBeacon: true,
    },
  ],
  'full-app': [
    {
      target: 'body',
      placement: 'center',
      title: t('tour.fullApp.step1.title'),
      content: t('tour.fullApp.step1.content'),
      skipBeacon: true,
    },
    {
      target: '[data-tour="org-switcher"]',
      title: t('tour.fullApp.step2.title'),
      content: t('tour.fullApp.step2.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="nav-dashboard"]',
      title: t('tour.fullApp.step3.title'),
      content: t('tour.fullApp.step3.content'),
      placement: 'right',
      skipBeacon: true,
    },
    // --- LAYER 1: Define Your Land ---
    {
      target: '[data-tour="nav-farms"]',
      title: t('tour.fullApp.step4.title'),
      content: t('tour.fullApp.step4.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="nav-parcels"]',
      title: t('tour.fullApp.step5.title'),
      content: t('tour.fullApp.step5.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="nav-infrastructure"]',
      title: t('tour.fullApp.step6.title'),
      content: t('tour.fullApp.step6.content'),
      placement: 'right',
      skipBeacon: true,
    },
    // --- LAYER 2: Work the Land ---
    {
      target: '[data-tour="nav-personnel"]',
      title: t('tour.fullApp.step7.title'),
      content: t('tour.fullApp.step7.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="nav-stock"]',
      title: t('tour.fullApp.step8.title'),
      content: t('tour.fullApp.step8.content'),
      placement: 'right',
      skipBeacon: true,
    },
    // --- LAYER 3: Grow & Monitor ---
    {
      target: '[data-tour="nav-production"]',
      title: t('tour.fullApp.step9.title'),
      content: t('tour.fullApp.step9.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="nav-compliance"]',
      title: t('tour.fullApp.step10.title'),
      content: t('tour.fullApp.step10.content'),
      placement: 'right',
      skipBeacon: true,
    },
    // --- LAYER 4: Sell & Account ---
    {
      target: '[data-tour="nav-billing"]',
      title: t('tour.fullApp.step11.title'),
      content: t('tour.fullApp.step11.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="nav-accounting"]',
      title: t('tour.fullApp.step12.title'),
      content: t('tour.fullApp.step12.content'),
      placement: 'right',
      skipBeacon: true,
    },
    // --- LAYER 5: Intelligence ---
    {
      target: '[data-tour="nav-chat"]',
      title: t('tour.fullApp.step13.title'),
      content: t('tour.fullApp.step13.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="nav-reports"]',
      title: t('tour.fullApp.step14.title'),
      content: t('tour.fullApp.step14.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="user-menu"]',
      title: t('tour.fullApp.step15.title'),
      content: t('tour.fullApp.step15.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: 'body',
      placement: 'center',
      title: t('tour.fullApp.step16.title'),
      content: t('tour.fullApp.step16.content'),
      skipBeacon: true,
    },
  ],
  dashboard: [
    {
      target: '[data-tour="dashboard-stats"]',
      title: t('tour.dashboard.step1.title'),
      content: t('tour.dashboard.step1.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="dashboard-parcels"]',
      title: t('tour.dashboard.step2.title'),
      content: t('tour.dashboard.step2.content'),
      placement: 'top',
      skipBeacon: true,
    },
    {
      target: '[data-tour="dashboard-tasks"]',
      title: t('tour.dashboard.step3.title'),
      content: t('tour.dashboard.step3.content'),
      placement: 'left',
      skipBeacon: true,
    },
  ],
  'farm-management': [
    {
      target: '[data-tour="farm-stats"]',
      title: t('tour.farmManagement.step1.title'),
      content: t('tour.farmManagement.step1.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="add-farm"]',
      title: t('tour.farmManagement.step2.title'),
      content: t('tour.farmManagement.step2.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="farm-list"]',
      title: t('tour.farmManagement.step3.title'),
      content: t('tour.farmManagement.step3.content'),
      placement: 'top',
      skipBeacon: true,
    },
  ],
  parcels: [
    {
      target: '[data-tour="parcel-list"]',
      title: t('tour.parcels.step1.title'),
      content: t('tour.parcels.step1.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="parcel-filters"]',
      title: t('tour.parcels.step2.title'),
      content: t('tour.parcels.step2.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="parcel-actions"]',
      title: t('tour.parcels.step3.title'),
      content: t('tour.parcels.step3.content'),
      placement: 'left',
      skipBeacon: true,
    },
  ],
  tasks: [
    {
      target: '[data-tour="task-list"]',
      title: t('tour.tasks.step1.title'),
      content: t('tour.tasks.step1.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="task-calendar"]',
      title: t('tour.tasks.step2.title'),
      content: t('tour.tasks.step2.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="task-create"]',
      title: t('tour.tasks.step3.title'),
      content: t('tour.tasks.step3.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
  ],
  workers: [
    {
      target: '[data-tour="worker-list"]',
      title: t('tour.workers.step1.title'),
      content: t('tour.workers.step1.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="worker-payments"]',
      title: t('tour.workers.step2.title'),
      content: t('tour.workers.step2.content'),
      placement: 'left',
      skipBeacon: true,
    },
    {
      target: '[data-tour="worker-add"]',
      title: t('tour.workers.step3.title'),
      content: t('tour.workers.step3.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
  ],
  inventory: [
    // Each step's `data.stockGroup` makes the Stock layout switch tab groups
    // before that step renders, so sub-tabs are mounted in the DOM and
    // Joyride can find them. See useEffect dispatcher in TourProvider and
    // matching listener in routes/_authenticated/(inventory)/stock.tsx.
    {
      target: '[data-tour="stock-overview"]',
      title: t('tour.inventory.step1.title'),
      content: t('tour.inventory.step1.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="stock-items"]',
      title: t('tour.inventory.step2.title'),
      content: t('tour.inventory.step2.content'),
      placement: 'bottom',
      skipBeacon: true,
      data: { stockGroup: 'catalog' },
    },
    {
      target: '[data-tour="stock-suppliers"]',
      title: t('tour.inventory.step3.title'),
      content: t('tour.inventory.step3.content'),
      placement: 'bottom',
      skipBeacon: true,
      data: { stockGroup: 'catalog' },
    },
    {
      target: '[data-tour="stock-reception"]',
      title: t('tour.inventory.step4.title'),
      content: t('tour.inventory.step4.content'),
      placement: 'bottom',
      skipBeacon: true,
      data: { stockGroup: 'movements' },
    },
    {
      target: '[data-tour="stock-quick"]',
      title: t('tour.inventory.step5.title'),
      content: t('tour.inventory.step5.content'),
      placement: 'bottom',
      skipBeacon: true,
      data: { stockGroup: 'movements' },
    },
    {
      target: '[data-tour="stock-movements"]',
      title: t('tour.inventory.step6.title'),
      content: t('tour.inventory.step6.content'),
      placement: 'bottom',
      skipBeacon: true,
      data: { stockGroup: 'movements' },
    },
    {
      target: '[data-tour="stock-warehouses"]',
      title: t('tour.inventory.step7.title'),
      content: t('tour.inventory.step7.content'),
      placement: 'bottom',
      skipBeacon: true,
      data: { stockGroup: 'operations' },
    },
    {
      target: '[data-tour="stock-take"]',
      title: t('tour.inventory.step8.title'),
      content: t('tour.inventory.step8.content'),
      placement: 'bottom',
      skipBeacon: true,
      data: { stockGroup: 'operations' },
    },
    {
      target: '[data-tour="stock-expiry"]',
      title: t('tour.inventory.step9.title'),
      content: t('tour.inventory.step9.content'),
      placement: 'bottom',
      skipBeacon: true,
      data: { stockGroup: 'operations' },
    },
    {
      target: '[data-tour="stock-aging"]',
      title: t('tour.inventory.step10.title'),
      content: t('tour.inventory.step10.content'),
      placement: 'bottom',
      skipBeacon: true,
      data: { stockGroup: 'insights' },
    },
    {
      target: '[data-tour="stock-overview"]',
      title: t('tour.inventory.step11.title'),
      content: t('tour.inventory.step11.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
  ],
  accounting: [
    {
      target: '[data-tour="accounting-overview"]',
      title: t('tour.accounting.step1.title'),
      content: t('tour.accounting.step1.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="accounting-invoices"]',
      title: t('tour.accounting.step2.title'),
      content: t('tour.accounting.step2.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="accounting-journal"]',
      title: t('tour.accounting.step3.title'),
      content: t('tour.accounting.step3.content'),
      placement: 'left',
      skipBeacon: true,
    },
    {
      target: '[data-tour="accounting-reports"]',
      title: t('tour.accounting.step4.title'),
      content: t('tour.accounting.step4.content'),
      placement: 'top',
      skipBeacon: true,
    },
  ],
  satellite: [
    {
      target: '[data-tour="satellite-map"]',
      title: t('tour.satellite.step1.title'),
      content: t('tour.satellite.step1.content'),
      placement: 'left',
      skipBeacon: true,
    },
    {
      target: '[data-tour="satellite-indices"]',
      title: t('tour.satellite.step2.title'),
      content: t('tour.satellite.step2.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="satellite-timeline"]',
      title: t('tour.satellite.step3.title'),
      content: t('tour.satellite.step3.content'),
      placement: 'top',
      skipBeacon: true,
    },
  ],
  reports: [
    {
      target: '[data-tour="reports-list"]',
      title: t('tour.reports.step1.title'),
      content: t('tour.reports.step1.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="reports-export"]',
      title: t('tour.reports.step2.title'),
      content: t('tour.reports.step2.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="reports-filters"]',
      title: t('tour.reports.step3.title'),
      content: t('tour.reports.step3.content'),
      placement: 'left',
      skipBeacon: true,
    },
  ],
  harvests: [
    {
      target: '[data-tour="harvest-stats"]',
      title: t('tour.harvests.step1.title'),
      content: t('tour.harvests.step1.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="harvest-list"]',
      title: t('tour.harvests.step2.title'),
      content: t('tour.harvests.step2.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="harvest-add"]',
      title: t('tour.harvests.step3.title'),
      content: t('tour.harvests.step3.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="harvest-filters"]',
      title: t('tour.harvests.step4.title'),
      content: t('tour.harvests.step4.content'),
      placement: 'left',
      skipBeacon: true,
    },
  ],
  infrastructure: [
    {
      target: '[data-tour="infrastructure-list"]',
      title: t('tour.infrastructure.step1.title'),
      content: t('tour.infrastructure.step1.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="infrastructure-add"]',
      title: t('tour.infrastructure.step2.title'),
      content: t('tour.infrastructure.step2.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
  ],
  billing: [
    {
      target: '[data-tour="billing-stats"]',
      title: t('tour.billing.step1.title'),
      content: t('tour.billing.step1.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="billing-quotes"]',
      title: t('tour.billing.step2.title'),
      content: t('tour.billing.step2.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="billing-orders"]',
      title: t('tour.billing.step3.title'),
      content: t('tour.billing.step3.content'),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="billing-invoices"]',
      title: t('tour.billing.step4.title'),
      content: t('tour.billing.step4.content'),
      placement: 'left',
      skipBeacon: true,
    },
    {
      target: '[data-tour="billing-customers"]',
      title: t('tour.billing.step5.title'),
      content: t('tour.billing.step5.content'),
      placement: 'top',
      skipBeacon: true,
    },
  ],
  settings: [
    {
      target: '[data-tour="settings-menu"]',
      title: t('tour.settings.step1.title'),
      content: t('tour.settings.step1.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="settings-organization"]',
      title: t('tour.settings.step2.title'),
      content: t('tour.settings.step2.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="settings-users"]',
      title: t('tour.settings.step3.title'),
      content: t('tour.settings.step3.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="settings-subscription"]',
      title: t('tour.settings.step4.title'),
      content: t('tour.settings.step4.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="settings-modules"]',
      title: t('tour.settings.step5.title'),
      content: t('tour.settings.step5.content'),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="settings-account"]',
      title: t('tour.settings.step6.title'),
      content: t('tour.settings.step6.content'),
      placement: 'right',
      skipBeacon: true,
    },
  ],
});

interface TourProviderProps {
  children: React.ReactNode;
}

const getLocalStorageTours = (userId: string | null | undefined): { completed: TourId[]; dismissed: TourId[] } => {
  try {
    const key = userId ? tourStorageKey(userId) : LEGACY_TOUR_STORAGE_KEY;
    const dKey = userId ? dismissedStorageKey(userId) : LEGACY_DISMISSED_TOURS_KEY;
    const completed = localStorage.getItem(key);
    const dismissed = localStorage.getItem(dKey);
    return {
      completed: completed ? JSON.parse(completed) : [],
      dismissed: dismissed ? JSON.parse(dismissed) : [],
    };
  } catch {
    console.error('[TourContext] Failed to read from localStorage');
    return { completed: [], dismissed: [] };
  }
};

const setLocalStorageTours = (userId: string | null | undefined, completed: TourId[], dismissed: TourId[]) => {
  try {
    const key = userId ? tourStorageKey(userId) : LEGACY_TOUR_STORAGE_KEY;
    const dKey = userId ? dismissedStorageKey(userId) : LEGACY_DISMISSED_TOURS_KEY;
    const syncKey = userId ? lastSyncStorageKey(userId) : LEGACY_LAST_SYNC_KEY;
    localStorage.setItem(key, JSON.stringify(completed));
    localStorage.setItem(dKey, JSON.stringify(dismissed));
    localStorage.setItem(syncKey, Date.now().toString());
  } catch {
    console.error('[TourContext] Failed to write to localStorage');
  }
};

// Hook to detect mobile viewport
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
};

export const TourProvider = ({ children }: TourProviderProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasFeature: _hasFeature } = useExperienceLevel();
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  const isMobile = useIsMobile();
  const loadRequestIdRef = useRef(0);
  const mutationVersionRef = useRef(0);
  const startTourTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const loadTourPreferences = useCallback(async () => {
    if (!user) {
      const local = getLocalStorageTours(null);
      setTourState(prev => ({
        ...prev,
        completedTours: local.completed,
        dismissedTours: local.dismissed,
        isLoading: false,
        syncStatus: 'idle',
      }));
      return;
    }

    const requestId = ++loadRequestIdRef.current;
    const mutationVersionAtRequestStart = mutationVersionRef.current;

    setTourState(prev => ({
      ...prev,
      isLoading: true,
      syncStatus: 'syncing',
      lastSyncError: null,
    }));

    try {
      const preferences = await retryTourApiCall(
        () => tourPreferencesApi.getTourPreferences()
      );

      if (
        requestId !== loadRequestIdRef.current
        || mutationVersionAtRequestStart !== mutationVersionRef.current
      ) {
        return;
      }

      setTourState(prev => ({
        ...prev,
        completedTours: preferences.completed_tours as TourId[],
        dismissedTours: preferences.dismissed_tours as TourId[],
        isLoading: false,
        syncStatus: 'synced',
        lastSyncError: null,
      }));

      setLocalStorageTours(user?.id,
        preferences.completed_tours as TourId[],
        preferences.dismissed_tours as TourId[]
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tour preferences';
      console.error('[TourContext] Failed to load from backend, using localStorage fallback:', errorMessage);

      if (
        requestId !== loadRequestIdRef.current
        || mutationVersionAtRequestStart !== mutationVersionRef.current
      ) {
        return;
      }

      const local = getLocalStorageTours(user?.id);
      setTourState(prev => ({
        ...prev,
        completedTours: local.completed,
        dismissedTours: local.dismissed,
        isLoading: false,
        syncStatus: 'error',
        lastSyncError: errorMessage,
      }));
    }
  }, [user]);

  useEffect(() => {
    const id = setTimeout(() => loadTourPreferences(), 0);
    return () => { clearTimeout(id); loadRequestIdRef.current += 1; };
  }, [loadTourPreferences]);

  /**
   * Save completed tours to backend with localStorage fallback
   */
  const saveCompletedTours = async (tours: TourId[]): Promise<boolean> => {
    const mutationVersion = ++mutationVersionRef.current;

    // Always update localStorage immediately for responsiveness
    setLocalStorageTours(user?.id, tours, tourState.dismissedTours);

    if (!user) {
      return true; // No user, localStorage-only mode
    }

    setTourState(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      await retryTourApiCall(
        () => tourPreferencesApi.updateTourPreferences({ completed_tours: tours })
      );

      if (mutationVersion !== mutationVersionRef.current) {
        return true;
      }

      setTourState(prev => ({
        ...prev,
        syncStatus: 'synced',
        lastSyncError: null,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save completed tours';
      console.error('[TourContext] Failed to save completed tours:', errorMessage);

      if (mutationVersion !== mutationVersionRef.current) {
        return false;
      }

      setTourState(prev => ({
        ...prev,
        syncStatus: 'error',
        lastSyncError: errorMessage,
      }));

      // Return false to indicate save failed, but state is already updated locally
      return false;
    }
  };

  const saveCompletedToursRef = useRef(saveCompletedTours);
  useEffect(() => {
    saveCompletedToursRef.current = saveCompletedTours;
  });

  /**
   * Save dismissed tours to backend with localStorage fallback
   */
  const _saveDismissedTours = async (tours: TourId[]): Promise<boolean> => {
    const mutationVersion = ++mutationVersionRef.current;

    // Always update localStorage immediately for responsiveness
    setLocalStorageTours(user?.id, tourState.completedTours, tours);

    if (!user) {
      return true; // No user, localStorage-only mode
    }

    setTourState(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      await retryTourApiCall(
        () => tourPreferencesApi.updateTourPreferences({ dismissed_tours: tours })
      );

      if (mutationVersion !== mutationVersionRef.current) {
        return true;
      }

      setTourState(prev => ({
        ...prev,
        syncStatus: 'synced',
        lastSyncError: null,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save dismissed tours';
      console.error('[TourContext] Failed to save dismissed tours:', errorMessage);

      if (mutationVersion !== mutationVersionRef.current) {
        return false;
      }

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
      const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      if (isCollapsed) {
        localStorage.setItem('sidebarCollapsed', 'false');
        window.dispatchEvent(new CustomEvent('sidebarCollapse', { detail: { collapsed: false } }));
      }
    }

    // Cancel any pending startTour timeout to prevent race conditions
    if (startTourTimeoutRef.current) {
      clearTimeout(startTourTimeoutRef.current);
      startTourTimeoutRef.current = null;
    }

    if (targetRoute) {
      const path = location.pathname.replace(/\/$/, '') || '/';
      const target = targetRoute.replace(/\/$/, '') || '/';
      // Exact match only: /parcels/xyz must still navigate to /parcels for the list tour.
      const alreadyOnTourRoute = path === target;
      // Avoid navigate() when already on the tour route — redundant navigation remounts
      // the tree and feels like a full reload (especially /parcels + useAutoStartTour).
      if (!alreadyOnTourRoute) {
        navigate({ to: targetRoute });
      }
      // Immediately mark as running to block auto-start hooks during navigation delay.
      // currentTour stays null so Joyride doesn't render yet (no steps = shouldRun false).
      setTourState(prev => ({
        ...prev,
        isRunning: true,
        currentTour: null,
        stepIndex: 0,
      }));
      startTourTimeoutRef.current = setTimeout(() => {
        startTourTimeoutRef.current = null;
        setTourState(prev => {
          // Only activate if still in the pending state we set above.
          // If endTour() was called or another startTour replaced us, bail out.
          if (!prev.isRunning || prev.currentTour !== null) return prev;
          return { ...prev, currentTour: tourId, stepIndex: 0 };
        });
      }, 500);
    } else {
      setTourState(prev => ({
        ...prev,
        currentTour: tourId,
        isRunning: true,
        stepIndex: 0,
      }));
    }
  }, [isOnboardingRoute, navigate, location.pathname]);

  const endTour = useCallback(() => {
    // Also cancel any pending delayed start
    if (startTourTimeoutRef.current) {
      clearTimeout(startTourTimeoutRef.current);
      startTourTimeoutRef.current = null;
    }
    setTourState(prev => ({
      ...prev,
      currentTour: null,
      isRunning: false,
      stepIndex: 0,
    }));
  }, []);

  /**
   * Normal completion: mark current tour completed, persist, stop Joyride.
   * In controlled mode, react-joyride ignores internal index bumps, so after the
   * last step `controls.next()` never drives `index >= size` → no STATUS.FINISHED /
   * TOUR_END. We must complete explicitly on STEP_AFTER + NEXT for the final step.
   */
  const completeRunningTour = useCallback(() => {
    setTourState(prev => {
      const { currentTour, completedTours } = prev;
      if (!currentTour) {
        return { ...prev, isRunning: false, stepIndex: 0 };
      }
      if (!completedTours.includes(currentTour)) {
        const newCompletedTours = [...completedTours, currentTour];
        void saveCompletedToursRef.current(newCompletedTours);
        return {
          ...prev,
          completedTours: newCompletedTours,
          currentTour: null,
          isRunning: false,
          stepIndex: 0,
        };
      }
      return { ...prev, currentTour: null, isRunning: false, stepIndex: 0 };
    });
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
    const mutationVersion = ++mutationVersionRef.current;

    // Optimistically update state
    setTourState(prev => ({
      ...prev,
      dismissedTours: newDismissed,
      syncStatus: 'syncing',
    }));

    // End the tour immediately
    endTour();

    // Update localStorage for immediate fallback
    setLocalStorageTours(user?.id, tourState.completedTours, newDismissed);

    if (user) {
      try {
        // Use dedicated dismiss endpoint for atomic backend operation
        const result = await retryTourApiCall(
          () => tourPreferencesApi.dismissTour(tourId)
        );

        if (mutationVersion !== mutationVersionRef.current) {
          return;
        }

        // Update state with backend response to ensure consistency
        setTourState(prev => ({
          ...prev,
          completedTours: result.completed_tours as TourId[],
          dismissedTours: result.dismissed_tours as TourId[],
          syncStatus: 'synced',
          lastSyncError: null,
        }));

        // Update localStorage with backend data
        setLocalStorageTours(user?.id,
          result.completed_tours as TourId[],
          result.dismissed_tours as TourId[]
        );

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to dismiss tour';
        console.error('[TourContext] Failed to sync dismiss to backend:', errorMessage);

        if (mutationVersion !== mutationVersionRef.current) {
          return;
        }

        setTourState(prev => ({
          ...prev,
          syncStatus: 'error',
          lastSyncError: errorMessage,
        }));

        // State is already updated locally, so user experience is preserved
      }
    }
  }, [tourState.dismissedTours, tourState.completedTours, endTour, user]);

  /**
   * react-joyride v3 uses `onEvent` only — the legacy `callback` prop is ignored.
   * Without this handler, controlled `stepIndex` never advances after step 1.
   */
  const handleJoyrideEvent = useCallback((data: EventData) => {
    const { status, type, action, index, size } = data;

    // --- 1. Close button → end immediately ---
    if (action === ACTIONS.CLOSE) {
      endTour();
      return;
    }

    // --- 2. Tour finished (uncontrolled / overlay paths) ---
    if (status === STATUS.FINISHED || type === EVENTS.TOUR_END) {
      completeRunningTour();
      return;
    }

    // --- 3. Tour skipped ---
    if (status === STATUS.SKIPPED) {
      const cur = tourState.currentTour;
      if (cur && !tourState.dismissedTours.includes(cur)) {
        void dismissTour(cur);
      } else {
        endTour();
      }
      return;
    }

    // --- 4. Target not found (controlled mode does not auto-advance) ---
    if (type === EVENTS.TARGET_NOT_FOUND) {
      setTourState(prev => {
        const nextIndex = prev.stepIndex + 1;
        if (nextIndex >= size) {
          void saveCompletedToursRef.current(prev.currentTour ? [...prev.completedTours, prev.currentTour] : prev.completedTours);
          return { ...prev, completedTours: prev.currentTour ? [...prev.completedTours, prev.currentTour] : prev.completedTours, currentTour: null, isRunning: false, stepIndex: 0 };
        }
        return { ...prev, stepIndex: nextIndex };
      });
      return;
    }

    // --- 5. After a step completes — advance controlled index or finish ---
    // Joyride emits `action: lastAction ?? ACTIONS.UPDATE` for STEP_AFTER; if `lastAction`
    // is not set yet, Finir/Next on the last step sends UPDATE — we must still complete or
    // `isRunning` stays true and the overlay remains (seen on /infrastructure).
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.PREV) {
        setTourState(prev => ({ ...prev, stepIndex: Math.max(0, index - 1) }));
      } else if (action === ACTIONS.NEXT || action === ACTIONS.UPDATE) {
        if (index + 1 < size) {
          setTourState(prev => ({ ...prev, stepIndex: index + 1 }));
        } else {
          completeRunningTour();
        }
      }
    }
  }, [completeRunningTour, dismissTour, endTour, tourState.currentTour, tourState.dismissedTours]);

  /**
   * Reset a specific tour - allows tour to show again
   */
  const resetTour = useCallback(async (tourId: TourId) => {
    const newCompletedTours = tourState.completedTours.filter(t => t !== tourId);
    const newDismissedTours = tourState.dismissedTours.filter(t => t !== tourId);
    const mutationVersion = ++mutationVersionRef.current;

    // Optimistically update state
    setTourState(prev => ({
      ...prev,
      completedTours: newCompletedTours,
      dismissedTours: newDismissedTours,
      syncStatus: 'syncing',
    }));

    // Update localStorage immediately
    setLocalStorageTours(user?.id, newCompletedTours, newDismissedTours);

    if (user) {
      try {
        // Use dedicated reset endpoint
        const result = await retryTourApiCall(
          () => tourPreferencesApi.resetTour(tourId)
        );

        if (mutationVersion !== mutationVersionRef.current) {
          return;
        }

        setTourState(prev => ({
          ...prev,
          completedTours: result.completed_tours as TourId[],
          dismissedTours: result.dismissed_tours as TourId[],
          syncStatus: 'synced',
          lastSyncError: null,
        }));

        setLocalStorageTours(user?.id,
          result.completed_tours as TourId[],
          result.dismissed_tours as TourId[]
        );

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to reset tour';
        console.error('[TourContext] Failed to sync reset to backend:', errorMessage);

        if (mutationVersion !== mutationVersionRef.current) {
          return;
        }

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
    const mutationVersion = ++mutationVersionRef.current;

    // Optimistically update state
    setTourState(prev => ({
      ...prev,
      completedTours: [],
      dismissedTours: [],
      syncStatus: 'syncing',
    }));

    // Clear localStorage immediately
    setLocalStorageTours(user?.id, [], []);

    if (user) {
      try {
        // Use dedicated reset-all endpoint
        const result = await retryTourApiCall(
          () => tourPreferencesApi.resetAllTours()
        );

        if (mutationVersion !== mutationVersionRef.current) {
          return;
        }

        setTourState(prev => ({
          ...prev,
          completedTours: result.completed_tours as TourId[],
          dismissedTours: result.dismissed_tours as TourId[],
          syncStatus: 'synced',
          lastSyncError: null,
        }));

        setLocalStorageTours(user?.id,
          result.completed_tours as TourId[],
          result.dismissed_tours as TourId[]
        );

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to reset all tours';
        console.error('[TourContext] Failed to sync reset-all to backend:', errorMessage);

        if (mutationVersion !== mutationVersionRef.current) {
          return;
        }

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
  }, [loadTourPreferences]);

  const rawSteps = tourState.currentTour ? tourDefinitions[tourState.currentTour] : [];
  // Do not filter steps here: a filtered array changes length/order vs. `stepIndex` and breaks
  // controlled mode. Missing targets are handled via EVENTS.TARGET_NOT_FOUND above.
  const shouldRun = tourState.isRunning && rawSteps.length > 0;

  // Per-step side effects: when a step has data.stockGroup, dispatch a window
  // event so the Stock layout can switch its active tab group before the next
  // sub-tab step renders. Decouples tour from layout state.
  useEffect(() => {
    if (!tourState.isRunning || !tourState.currentTour) return;
    const step = rawSteps[tourState.stepIndex];
    const data = step?.data as { stockGroup?: string } | undefined;
    if (data?.stockGroup) {
      window.dispatchEvent(new CustomEvent('tour:set-stock-group', { detail: data.stockGroup }));
    }
  }, [tourState.currentTour, tourState.stepIndex, tourState.isRunning, rawSteps]);

  // ESC key listener to dismiss running tour
  useHotkey('Escape', endTour, {
    enabled: tourState.isRunning,
    meta: { name: t('close', 'Close'), description: 'End guided tour' },
  });

  useEffect(() => {
    if (!(isOnboardingRoute && tourState.isRunning)) return;
    const id = window.setTimeout(() => {
      endTour();
    }, 0);
    return () => clearTimeout(id);
  }, [isOnboardingRoute, tourState.isRunning, endTour]);

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
      {!isOnboardingRoute && !isMobile && (
        <Joyride
          key={tourState.currentTour ?? 'joyride-idle'}
          steps={rawSteps}
          run={shouldRun}
          stepIndex={tourState.stepIndex}
          continuous
          showSkipButton
          scrollToFirstStep={false}
          disableScrolling={true}
          spotlightClicks
          disableOverlayClose={JOYRIDE_PROPS.disableOverlayClose}
          onEvent={handleJoyrideEvent}
          styles={tourStyles}
          tooltipComponent={(props) => (
            <CustomTooltip
              {...props}
              t={t}
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
  const { startTour, completedTours, dismissedTours, isRunning, isLoading } = useTour();
  const { hasFeature } = useExperienceLevel();
  const location = useLocation();
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  const isMobile = useIsMobile();

  useEffect(() => {
    // Don't auto-start while still loading preferences from backend
    if (isLoading) return;

    // Don't auto-start tours on mobile — no tour UI rendered there
    if (isMobile) return;

    // Only auto-start if:
    // 1. Tour not completed
    // 2. Tour not dismissed
    // 3. Not already running
    // 4. User has enabledGuidedTours feature (basic level only)
    const isCompleted = completedTours.includes(tourId);
    const isDismissed = dismissedTours.includes(tourId);

    if (
      !isOnboardingRoute
      && !isCompleted
      && !isDismissed
      && !isRunning
      && hasFeature('enableGuidedTours')
    ) {
      const timer = setTimeout(() => {
        startTour(tourId);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [tourId, startTour, completedTours, dismissedTours, isRunning, delay, hasFeature, isLoading, isOnboardingRoute, isMobile]);
};
