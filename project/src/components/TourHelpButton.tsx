import React, { useState, useMemo, useEffect } from 'react';
import { HelpCircle, BookOpen, ChevronRight, Check, RotateCcw, Loader2, CloudOff, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTour, TourId } from '@/contexts/TourContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

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

export const TourHelpButton: React.FC = () => {
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

  // Sync status indicator component
  const SyncStatusIndicator = () => {
    if (syncStatus === 'syncing') {
      return (
        <div className="flex items-center gap-1 text-xs text-blue-600" title={t('helpCenter.syncing', 'Syncing...')}>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">{t('helpCenter.syncing', 'Syncing...')}</span>
        </div>
      );
    }
    if (syncStatus === 'error') {
      return (
        <div
          className="flex items-center gap-1 text-xs text-amber-600 cursor-pointer hover:text-amber-700"
          onClick={handleRefresh}
          title={lastSyncError || t('helpCenter.syncError', 'Sync failed. Click to retry.')}
        >
          <CloudOff className="h-3 w-3" />
          <span className="hidden sm:inline">{t('helpCenter.offline', 'Offline')}</span>
        </div>
      );
    }
    if (syncStatus === 'synced') {
      return (
        <div className="flex items-center gap-1 text-xs text-emerald-600" title={t('helpCenter.synced', 'Synced')}>
          <Cloud className="h-3 w-3" />
          <span className="hidden sm:inline">{t('helpCenter.synced', 'Synced')}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {isOpen && (
        <div className="fixed inset-x-4 bottom-20 sm:absolute sm:inset-auto sm:bottom-16 sm:right-0 sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[70vh] flex flex-col">
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-emerald-800">{t('helpCenter.title')}</h3>
              <SyncStatusIndicator />
            </div>
            <p className="text-sm text-emerald-600 mt-1">
              {t('helpCenter.subtitle')}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : tours.map((tour) => {
              const completed = isTourCompleted(tour.id);
              const dismissed = isTourDismissed(tour.id);
              const showReset = completed || dismissed;
              
              return (
                <Button
                  key={tour.id}
                  onClick={() => handleStartTour(tour.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left"
                >
                  <div className={`p-2 rounded-lg ${
                    completed
                      ? 'bg-emerald-100 text-emerald-600'
                      : dismissed
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {completed ? <Check className="h-4 w-4" /> : tour.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        completed
                          ? 'text-emerald-700'
                          : dismissed
                            ? 'text-amber-700'
                            : 'text-gray-800'
                      }`}>
                        {tour.title}
                      </span>
                      {completed && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {t('helpCenter.completed')}
                        </span>
                      )}
                      {!completed && dismissed && (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          {t('helpCenter.dismissed', 'Dismissed')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{tour.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {showReset && (
                      <Button
                        onClick={(e) => handleResetTour(e, tour.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title={t('helpCenter.restartTour')}
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Button>
              );
            })}
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <Button
              onClick={handleResetAll}
              className="w-full text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              {t('helpCenter.resetAllTours')}
            </Button>
          </div>
        </div>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          p-4 rounded-full shadow-lg transition-all duration-300 
          ${isOpen 
            ? 'bg-gray-800 text-white rotate-45' 
            : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-110'
          }
        `}
        title={t('helpCenter.buttonTitle')}
      >
        <HelpCircle className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default TourHelpButton;
