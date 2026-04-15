import React, { useState, useMemo, useEffect } from 'react';
import { HelpCircle, BookOpen, ChevronRight, Check, RotateCcw, Loader2, CloudOff, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useTour, TourId } from '@/contexts/TourContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TourInfo {
  id: TourId;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
}

const TOUR_CONFIGS: TourInfo[] = [
  {
    id: 'welcome',
    titleKey: 'helpCenter.tours.welcome.title',
    descriptionKey: 'helpCenter.tours.welcome.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'full-app',
    titleKey: 'helpCenter.tours.fullApp.title',
    descriptionKey: 'helpCenter.tours.fullApp.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'dashboard',
    titleKey: 'helpCenter.tours.dashboard.title',
    descriptionKey: 'helpCenter.tours.dashboard.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'farm-management',
    titleKey: 'helpCenter.tours.farmManagement.title',
    descriptionKey: 'helpCenter.tours.farmManagement.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'parcels',
    titleKey: 'helpCenter.tours.parcels.title',
    descriptionKey: 'helpCenter.tours.parcels.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'tasks',
    titleKey: 'helpCenter.tours.tasks.title',
    descriptionKey: 'helpCenter.tours.tasks.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'workers',
    titleKey: 'helpCenter.tours.workers.title',
    descriptionKey: 'helpCenter.tours.workers.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'inventory',
    titleKey: 'helpCenter.tours.inventory.title',
    descriptionKey: 'helpCenter.tours.inventory.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'harvests',
    titleKey: 'helpCenter.tours.harvests.title',
    descriptionKey: 'helpCenter.tours.harvests.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'infrastructure',
    titleKey: 'helpCenter.tours.infrastructure.title',
    descriptionKey: 'helpCenter.tours.infrastructure.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'billing',
    titleKey: 'helpCenter.tours.billing.title',
    descriptionKey: 'helpCenter.tours.billing.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'accounting',
    titleKey: 'helpCenter.tours.accounting.title',
    descriptionKey: 'helpCenter.tours.accounting.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'satellite',
    titleKey: 'helpCenter.tours.satellite.title',
    descriptionKey: 'helpCenter.tours.satellite.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'reports',
    titleKey: 'helpCenter.tours.reports.title',
    descriptionKey: 'helpCenter.tours.reports.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'settings',
    titleKey: 'helpCenter.tours.settings.title',
    descriptionKey: 'helpCenter.tours.settings.description',
    icon: <BookOpen className="h-4 w-4" />,
  },
];

const SyncStatusIndicator = ({ syncStatus, lastSyncError, onRefresh, t }: { syncStatus: 'syncing' | 'synced' | 'error' | 'idle';
  lastSyncError: string | null;
  onRefresh: () => void;
  t: TFunction; }) => {
  if (syncStatus === 'syncing') {
    return (
      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400" title={t('helpCenter.syncing', 'Syncing...')}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="hidden sm:inline">{t('helpCenter.syncing', 'Syncing...')}</span>
      </div>
    );
  }
  if (syncStatus === 'error') {
    return (
      <div
        className="flex items-center gap-1 text-xs text-amber-600 cursor-pointer hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        onClick={onRefresh}
        title={lastSyncError || t('helpCenter.syncError', 'Sync failed. Click to retry.')}
      >
        <CloudOff className="h-3 w-3" />
        <span className="hidden sm:inline">{t('helpCenter.offline', 'Offline')}</span>
      </div>
    );
  }
  if (syncStatus === 'synced') {
    return (
      <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400" title={t('helpCenter.synced', 'Synced')}>
        <Cloud className="h-3 w-3" />
        <span className="hidden sm:inline">{t('helpCenter.synced', 'Synced')}</span>
      </div>
    );
  }
  return null;
};

export const TourHelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    startTour,
    isTourCompleted,
    isTourDismissed,
    resetTour,
    resetAllTours,
    isRunning,
    isLoading,
    syncStatus,
    lastSyncError,
    refetchPreferences
  } = useTour();

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tours = useMemo(() =>
    TOUR_CONFIGS.map(tour => ({
      ...tour,
      title: t(tour.titleKey),
      description: t(tour.descriptionKey),
    })),
    [t]
  );

  // Hide completely on mobile or if no user or if tour is running
  if (!user || isMobile || isRunning) {
    return null;
  }

  const handleStartTour = (tourId: TourId) => {
    setIsOpen(false);
    startTour(tourId);
  };

  const handleResetTour = async (e: React.MouseEvent, tourId: TourId) => {
    e.stopPropagation();
    await resetTour(tourId);
  };

  const handleResetAll = async () => {
    await resetAllTours();
  };

  const handleRefresh = async () => {
    await refetchPreferences();
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {isOpen && (
        <div className="fixed inset-x-4 bottom-20 sm:absolute sm:inset-auto sm:bottom-16 sm:right-0 sm:w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden max-h-[70vh] flex flex-col">
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">{t('helpCenter.title')}</h3>
              <SyncStatusIndicator
                syncStatus={syncStatus}
                lastSyncError={lastSyncError}
                onRefresh={handleRefresh}
                t={t}
              />
            </div>
            <p className="text-sm text-emerald-600 dark:text-emerald-300/90 mt-1">
              {t('helpCenter.subtitle')}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : tours.map((tour) => {
              const completed = isTourCompleted(tour.id);
              const dismissed = isTourDismissed(tour.id);
              const showReset = completed || dismissed;
              
              return (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => handleStartTour(tour.id)}
                  className={cn(
                    'flex w-full min-h-10 items-center gap-3 border-b border-gray-100 p-3 text-left text-sm font-medium',
                    'transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800/80',
                    'last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'ring-offset-background dark:ring-offset-slate-900',
                  )}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                    completed
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400'
                      : dismissed
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                  >
                    {completed ? <Check className="h-4 w-4" /> : tour.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                        completed
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : dismissed
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-gray-800 dark:text-slate-100'
                      }`}
                      >
                        {tour.title}
                      </span>
                      {completed && (
                        <span className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded">
                          {t('helpCenter.completed')}
                        </span>
                      )}
                      {!completed && dismissed && (
                        <span className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded">
                          {t('helpCenter.dismissed', 'Dismissed')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{tour.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {showReset && (
                      <button
                        type="button"
                        onClick={(e) => handleResetTour(e, tour.id)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background dark:ring-offset-slate-900"
                        title={t('helpCenter.restartTour')}
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500 [&_svg]:pointer-events-none" />
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 dark:text-slate-500" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-200 dark:bg-slate-950 dark:border-slate-700">
            <button
              type="button"
              onClick={handleResetAll}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background dark:ring-offset-slate-900"
            >
              <RotateCcw className="h-4 w-4 shrink-0" />
              {t('helpCenter.resetAllTours')}
            </button>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant={!(isOpen) ? 'emerald' : undefined}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-lg transition-all duration-300 ${ isOpen ? 'bg-gray-800 text-white dark:bg-slate-700 dark:text-white rotate-45' : 'hover:scale-110'}`}
        title={t('helpCenter.buttonTitle')}
      >
        <HelpCircle className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default TourHelpButton;
