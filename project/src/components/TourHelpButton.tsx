import React, { useState, useMemo } from 'react';
import { HelpCircle, BookOpen, ChevronRight, Check, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTour, TourId } from '@/contexts/TourContext';

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
  const { t } = useTranslation();
  const { startTour, isTourCompleted, resetTour, resetAllTours, isRunning } = useTour();

  const tours = useMemo(() => 
    TOUR_CONFIGS.map(tour => ({
      ...tour,
      title: t(tour.titleKey),
      description: t(tour.descriptionKey),
    })),
    [t]
  );

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

  if (isRunning) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {isOpen && (
        <div className="fixed inset-x-4 bottom-20 sm:absolute sm:inset-auto sm:bottom-16 sm:right-0 sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[70vh] flex flex-col">
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 shrink-0">
            <h3 className="font-semibold text-emerald-800">{t('helpCenter.title')}</h3>
            <p className="text-sm text-emerald-600 mt-1">
              {t('helpCenter.subtitle')}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {tours.map((tour) => {
              const completed = isTourCompleted(tour.id);
              
              return (
                <button
                  key={tour.id}
                  onClick={() => handleStartTour(tour.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left"
                >
                  <div className={`p-2 rounded-lg ${completed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                    {completed ? <Check className="h-4 w-4" /> : tour.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${completed ? 'text-emerald-700' : 'text-gray-800'}`}>
                        {tour.title}
                      </span>
                      {completed && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {t('helpCenter.completed')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{tour.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {completed && (
                      <button
                        onClick={(e) => handleResetTour(e, tour.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title={t('helpCenter.restartTour')}
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={handleResetAll}
              className="w-full text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              {t('helpCenter.resetAllTours')}
            </button>
          </div>
        </div>
      )}

      <button
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
      </button>
    </div>
  );
};

export default TourHelpButton;
